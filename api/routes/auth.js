const express = require("express");
const router = express.Router();
const {
  executeSystemQuery,
  executeAuthUpdate,
  requireAuth,
} = require("../authDB.js");
const {
  getUserByCredentials,
  createToken,
  deleteToken,
  deleteUserTokens,
  getTokenByValue,
  deleteExpiredTokens,
} = require("../queries.js");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const TOKEN_EXPIRY = process.env.TOKEN_EXPIRY || "24h";

// Get available auth endpoints
router.get("/", (req, res) => {
  res.json({
    message: "Authentication endpoints",
    endpoints: {
      login: "POST /auth/login",
      logout: "POST /auth/logout",
      "logout-all": "POST /auth/logout-all",
      verify: "GET /auth/verify",
      profile: "GET /auth/profile",
      "update-profile": "PUT /auth/profile",
      "cleanup-tokens": "POST /auth/cleanup-tokens",
    },
    usage: {
      login: {
        method: "POST",
        body: { password: "your-password" },
        description: "Exchange password for access token",
      },
    },
  });
});

// Login route (no auth required)
router.post("/login", async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    // Use system query for login verification
    const query = getUserByCredentials(password);
    const users = await executeSystemQuery(query);

    if (users.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = users[0];

    // Create JWT token
    const tokenPayload = {
      userId: user.id,
      username: user.username,
      email: user.email,
    };

    const jwtToken = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: TOKEN_EXPIRY,
    });

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now

    // Store token in database
    const createTokenQuery = createToken(
      user.id,
      jwtToken,
      expiresAt.toISOString().slice(0, 19).replace("T", " "),
    );
    await executeSystemQuery(createTokenQuery);

    res.json({
      message: "Login successful",
      token: jwtToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// Logout route
router.post("/logout", requireAuth, async (req, res) => {
  try {
    const query = deleteToken(req.token);
    await executeAuthUpdate(query, [], req.token);

    res.json({ message: "Logout successful" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Logout failed" });
  }
});

// Logout from all devices
router.post("/logout-all", requireAuth, async (req, res) => {
  try {
    const { getUserContext } = require("../authDB.js");
    const userContext = getUserContext(req.token);

    const query = deleteUserTokens(userContext.userId);
    const affectedRows = await executeAuthUpdate(query, [], req.token);

    res.json({
      message: "Logged out from all devices successfully",
      tokensRemoved: affectedRows,
    });
  } catch (error) {
    console.error("Logout all error:", error);
    res.status(500).json({ error: "Logout from all devices failed" });
  }
});

// Verify token route
router.get("/verify", requireAuth, async (req, res) => {
  try {
    const { getUserContext } = require("../authDB.js");
    const userContext = getUserContext(req.token);

    // Check if token exists in database and is valid
    const query = getTokenByValue(req.token);
    const tokenData = await executeSystemQuery(query);

    if (tokenData.length === 0) {
      return res.status(401).json({ error: "Token not found or expired" });
    }

    res.json({
      message: "Token is valid",
      user: {
        id: userContext.userId,
        username: userContext.username,
        email: userContext.email,
      },
      expiresAt: tokenData[0].expires_at,
    });
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(401).json({ error: "Invalid token" });
  }
});

// Get current user profile
router.get("/profile", requireAuth, async (req, res) => {
  try {
    const { getUserContext } = require("../authDB.js");
    const userContext = getUserContext(req.token);
    const { getUserById } = require("../queries.js");
    const { executeAuthQueryOne } = require("../authDB.js");

    const query = getUserById(userContext.userId);
    const user = await executeAuthQueryOne(query, [], req.token);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

// Update current user profile
router.put("/profile", requireAuth, async (req, res) => {
  try {
    const { username, email } = req.body;
    const { getUserContext } = require("../authDB.js");
    const userContext = getUserContext(req.token);
    const { updateUser, getUserById } = require("../queries.js");
    const { executeAuthUpdate, executeAuthQueryOne } = require("../authDB.js");

    if (!username && !email) {
      return res.status(400).json({ error: "Username or email is required" });
    }

    const query = updateUser(userContext.userId, username, email);
    const affectedRows = await executeAuthUpdate(query, [], req.token);

    if (affectedRows === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // Return updated user
    const updatedUser = await executeAuthQueryOne(
      getUserById(userContext.userId),
      [],
      req.token,
    );
    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({ error: "Failed to update user profile" });
  }
});

// Clean up expired tokens (admin route)
router.post("/cleanup-tokens", requireAuth, async (req, res) => {
  try {
    const query = deleteExpiredTokens();
    const result = await executeSystemQuery(query);

    res.json({
      message: "Expired tokens cleaned up successfully",
      tokensRemoved: result.affectedRows || 0,
    });
  } catch (error) {
    console.error("Token cleanup error:", error);
    res.status(500).json({ error: "Token cleanup failed" });
  }
});

module.exports = router;
