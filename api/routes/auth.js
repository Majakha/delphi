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
const { asyncHandler } = require("../middleware/errorHandler.js");
const {
  ValidationError,
  AuthenticationError,
  NotFoundError,
  InvalidCredentialsError,
  InvalidTokenError,
  SessionExpiredError,
  DatabaseError,
} = require("../errors/CustomErrors.js");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const TOKEN_EXPIRY = process.env.TOKEN_EXPIRY || "24h";

// Get available auth endpoints
router.get("/", (req, res) => {
  res.success(
    {
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
    },
    "Authentication endpoints available",
  );
});

// Login route (no auth required)
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { password } = req.body;

    if (!password?.trim()) {
      throw new ValidationError("Password is required", {
        field: "password",
        message: "Password cannot be empty",
      });
    }

    if (password.length < 3) {
      throw new ValidationError("Invalid password format", {
        field: "password",
        message: "Password must be at least 3 characters long",
      });
    }

    // Use system query for login verification
    const query = getUserByCredentials(password);
    const users = await executeSystemQuery(query);

    if (users.length === 0) {
      throw new InvalidCredentialsError();
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

    try {
      await executeSystemQuery(createTokenQuery);
    } catch (error) {
      throw new DatabaseError("Failed to create authentication session");
    }

    res.success(
      {
        token: jwtToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
        expiresAt: expiresAt.toISOString(),
      },
      "Login successful",
    );
  }),
);

// Logout route
router.post(
  "/logout",
  requireAuth,
  asyncHandler(async (req, res) => {
    const query = deleteToken(req.token);

    try {
      await executeAuthUpdate(query, [], req.token);
    } catch (error) {
      throw new DatabaseError("Failed to logout");
    }

    res.success(null, "Logout successful");
  }),
);

// Logout from all devices
router.post(
  "/logout-all",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { getUserContext } = require("../authDB.js");
    const userContext = getUserContext(req.token);

    const query = deleteUserTokens(userContext.userId);

    try {
      const affectedRows = await executeAuthUpdate(query, [], req.token);
      res.success(
        { tokensRemoved: affectedRows },
        "Logged out from all devices successfully",
      );
    } catch (error) {
      throw new DatabaseError("Failed to logout from all devices");
    }
  }),
);

// Verify token route
router.get(
  "/verify",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { getUserContext } = require("../authDB.js");
    const userContext = getUserContext(req.token);

    // Check if token exists in database and is valid
    const query = getTokenByValue(req.token);
    const tokenData = await executeSystemQuery(query);

    if (tokenData.length === 0) {
      throw new InvalidTokenError();
    }

    const tokenRecord = tokenData[0];
    const tokenExpiry = new Date(tokenRecord.expires_at);
    const now = new Date();

    if (tokenExpiry <= now) {
      throw new SessionExpiredError();
    }

    res.success(
      {
        user: {
          id: userContext.userId,
          username: userContext.username,
          email: userContext.email,
        },
        expiresAt: tokenRecord.expires_at,
      },
      "Token is valid",
    );
  }),
);

// Get current user profile
router.get(
  "/profile",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { getUserContext } = require("../authDB.js");
    const userContext = getUserContext(req.token);
    const { getUserById } = require("../queries.js");
    const { executeAuthQueryOne } = require("../authDB.js");

    const query = getUserById(userContext.userId);
    const user = await executeAuthQueryOne(query, [], req.token);

    if (!user) {
      throw new NotFoundError("User profile");
    }

    res.success(user, "User profile retrieved successfully");
  }),
);

// Update current user profile
router.put(
  "/profile",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { username, email } = req.body;
    const { getUserContext } = require("../authDB.js");
    const userContext = getUserContext(req.token);
    const { updateUser, getUserById } = require("../queries.js");
    const { executeAuthUpdate, executeAuthQueryOne } = require("../authDB.js");

    // Validation
    const errors = [];

    if (!username?.trim() && !email?.trim()) {
      throw new ValidationError("At least username or email must be provided");
    }

    if (username !== undefined) {
      if (!username.trim()) {
        errors.push({
          field: "username",
          message: "Username cannot be empty if provided",
        });
      } else if (username.length < 2) {
        errors.push({
          field: "username",
          message: "Username must be at least 2 characters long",
        });
      } else if (username.length > 50) {
        errors.push({
          field: "username",
          message: "Username must be less than 50 characters",
        });
      }
    }

    if (email !== undefined) {
      if (!email.trim()) {
        errors.push({
          field: "email",
          message: "Email cannot be empty if provided",
        });
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push({
          field: "email",
          message: "Please provide a valid email address",
        });
      } else if (email.length > 100) {
        errors.push({
          field: "email",
          message: "Email must be less than 100 characters",
        });
      }
    }

    if (errors.length > 0) {
      throw new ValidationError("Profile validation failed", { errors });
    }

    const query = updateUser(
      userContext.userId,
      username?.trim(),
      email?.trim(),
    );

    try {
      const affectedRows = await executeAuthUpdate(query, [], req.token);

      if (affectedRows === 0) {
        throw new NotFoundError("User");
      }
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        if (error.sqlMessage?.includes("username")) {
          throw new ValidationError("Username already exists", {
            field: "username",
            value: username,
          });
        }
        if (error.sqlMessage?.includes("email")) {
          throw new ValidationError("Email already exists", {
            field: "email",
            value: email,
          });
        }
        throw new ValidationError("Profile information already exists");
      }
      throw error;
    }

    // Return updated user
    const updatedUser = await executeAuthQueryOne(
      getUserById(userContext.userId),
      [],
      req.token,
    );

    res.success(updatedUser, "Profile updated successfully");
  }),
);

// Clean up expired tokens (admin route)
router.post(
  "/cleanup-tokens",
  requireAuth,
  asyncHandler(async (req, res) => {
    const query = deleteExpiredTokens();

    try {
      const result = await executeSystemQuery(query);
      const tokensRemoved = result.affectedRows || 0;

      res.success(
        { tokensRemoved },
        `Expired tokens cleaned up successfully (${tokensRemoved} tokens removed)`,
      );
    } catch (error) {
      throw new DatabaseError("Token cleanup failed");
    }
  }),
);

module.exports = router;
