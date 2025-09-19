const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {
  executeSystemQueryObj,
  executeAuthQueryObj,
  executeAuthQueryOneObj,
  executeAuthUpdateObj,
  requireAuth,
  generateUUID,
} = require("../authDB.js");
const DatabaseQueries = require("../queries.js");
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
const SALT_ROUNDS = 12;

// Get available auth endpoints
router.get("/", (req, res) => {
  res.success(
    {
      endpoints: {
        register: "POST /auth/register",
        login: "POST /auth/login",
        logout: "POST /auth/logout",
        "logout-all": "POST /auth/logout-all",
        verify: "GET /auth/verify",
        profile: "GET /auth/profile",
        "update-profile": "PUT /auth/profile",
        "change-password": "PUT /auth/password",
        "cleanup-tokens": "POST /auth/cleanup-tokens",
      },
      usage: {
        register: {
          method: "POST",
          body: { username: "string", email: "string", password: "string" },
          description: "Create a new user account",
        },
        login: {
          method: "POST",
          body: { username: "string", password: "string" },
          description: "Login with username/email and password",
        },
      },
    },
    "Authentication endpoints available",
  );
});

// Register new user
router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;

    // Validation
    const errors = [];

    if (!username?.trim()) {
      errors.push({
        field: "username",
        message: "Username is required",
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
    } else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      errors.push({
        field: "username",
        message:
          "Username can only contain letters, numbers, underscores, and hyphens",
      });
    }

    if (!email?.trim()) {
      errors.push({
        field: "email",
        message: "Email is required",
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

    if (!password?.trim()) {
      errors.push({
        field: "password",
        message: "Password is required",
      });
    } else if (password.length < 8) {
      errors.push({
        field: "password",
        message: "Password must be at least 8 characters long",
      });
    } else if (password.length > 100) {
      errors.push({
        field: "password",
        message: "Password must be less than 100 characters",
      });
    }

    if (errors.length > 0) {
      throw new ValidationError("Registration validation failed", { errors });
    }

    // Check if username already exists
    const existingUsername = await executeSystemQueryObj(
      DatabaseQueries.users.getByUsername(username.trim()),
    );
    if (existingUsername.length > 0) {
      throw new ValidationError("Username already exists", {
        field: "username",
        value: username,
      });
    }

    // Check if email already exists
    const existingEmail = await executeSystemQueryObj(
      DatabaseQueries.users.getByEmail(email.trim()),
    );
    if (existingEmail.length > 0) {
      throw new ValidationError("Email already exists", {
        field: "email",
        value: email,
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    try {
      await executeSystemQueryObj(
        DatabaseQueries.users.create(
          username.trim(),
          email.trim(),
          passwordHash,
        ),
      );
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
      }
      throw new DatabaseError("Failed to create user account");
    }

    res.success(
      {
        username: username.trim(),
        email: email.trim(),
      },
      "User account created successfully. You can now login.",
    );
  }),
);

// Login route
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    if (!username?.trim()) {
      throw new ValidationError("Username or email is required", {
        field: "username",
        message: "Username or email cannot be empty",
      });
    }

    if (!password?.trim()) {
      throw new ValidationError("Password is required", {
        field: "password",
        message: "Password cannot be empty",
      });
    }

    // Try to find user by username first, then by email
    let user = null;
    const userByUsername = await executeSystemQueryObj(
      DatabaseQueries.users.getByUsername(username.trim()),
    );

    if (userByUsername.length > 0) {
      user = userByUsername[0];
    } else {
      // Check if it's an email format and try email lookup
      if (username.includes("@")) {
        const userByEmail = await executeSystemQueryObj(
          DatabaseQueries.users.getByEmail(username.trim()),
        );
        if (userByEmail.length > 0) {
          user = userByEmail[0];
        }
      }
    }

    if (!user) {
      throw new InvalidCredentialsError();
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      throw new InvalidCredentialsError();
    }

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
    try {
      await executeSystemQueryObj(
        DatabaseQueries.tokens.create(
          user.id,
          jwtToken,
          expiresAt.toISOString().slice(0, 19).replace("T", " "),
        ),
      );
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
    try {
      await executeAuthUpdateObj(
        DatabaseQueries.tokens.delete(req.token),
        req.token,
      );
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

    try {
      const affectedRows = await executeAuthUpdateObj(
        DatabaseQueries.tokens.deleteByUserId(userContext.userId),
        req.token,
      );
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
    const tokenData = await executeSystemQueryObj(
      DatabaseQueries.tokens.getByValue(req.token),
    );

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

    const user = await executeAuthQueryOneObj(
      DatabaseQueries.users.getById(userContext.userId),
      req.token,
    );

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
      } else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        errors.push({
          field: "username",
          message:
            "Username can only contain letters, numbers, underscores, and hyphens",
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

    // Get current user data
    const currentUser = await executeAuthQueryOneObj(
      DatabaseQueries.users.getById(userContext.userId),
      req.token,
    );

    const finalUsername = username?.trim() || currentUser.username;
    const finalEmail = email?.trim() || currentUser.email;

    try {
      const affectedRows = await executeAuthUpdateObj(
        DatabaseQueries.users.update(
          userContext.userId,
          finalUsername,
          finalEmail,
        ),
        req.token,
      );

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
    const updatedUser = await executeAuthQueryOneObj(
      DatabaseQueries.users.getById(userContext.userId),
      req.token,
    );

    res.success(updatedUser, "Profile updated successfully");
  }),
);

// Change password
router.put(
  "/password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const { getUserContext } = require("../authDB.js");
    const userContext = getUserContext(req.token);

    // Validation
    const errors = [];

    if (!currentPassword?.trim()) {
      errors.push({
        field: "currentPassword",
        message: "Current password is required",
      });
    }

    if (!newPassword?.trim()) {
      errors.push({
        field: "newPassword",
        message: "New password is required",
      });
    } else if (newPassword.length < 8) {
      errors.push({
        field: "newPassword",
        message: "New password must be at least 8 characters long",
      });
    } else if (newPassword.length > 100) {
      errors.push({
        field: "newPassword",
        message: "New password must be less than 100 characters",
      });
    }

    if (errors.length > 0) {
      throw new ValidationError("Password change validation failed", {
        errors,
      });
    }

    // Get current user with password hash
    const user = await executeSystemQueryObj(
      DatabaseQueries.users.getById(userContext.userId),
    );

    if (user.length === 0) {
      throw new NotFoundError("User");
    }

    // Verify current password
    const passwordMatch = await bcrypt.compare(
      currentPassword,
      user[0].password_hash,
    );
    if (!passwordMatch) {
      throw new ValidationError("Current password is incorrect", {
        field: "currentPassword",
        message: "The current password you entered is incorrect",
      });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update password
    try {
      const affectedRows = await executeAuthUpdateObj(
        DatabaseQueries.users.updatePassword(
          userContext.userId,
          newPasswordHash,
        ),
        req.token,
      );

      if (affectedRows === 0) {
        throw new NotFoundError("User");
      }
    } catch (error) {
      throw new DatabaseError("Failed to update password");
    }

    // Optionally logout all other sessions
    await executeAuthUpdateObj(
      DatabaseQueries.tokens.deleteByUserId(userContext.userId),
      req.token,
    );

    res.success(
      null,
      "Password changed successfully. All sessions have been logged out.",
    );
  }),
);

// Clean up expired tokens (admin route)
router.post(
  "/cleanup-tokens",
  requireAuth,
  asyncHandler(async (req, res) => {
    try {
      const affectedRows = await executeAuthUpdateObj(
        DatabaseQueries.tokens.deleteExpired(),
        req.token,
      );

      res.success(
        { tokensRemoved: affectedRows },
        `Expired tokens cleaned up successfully (${affectedRows} tokens removed)`,
      );
    } catch (error) {
      throw new DatabaseError("Token cleanup failed");
    }
  }),
);

module.exports = router;
