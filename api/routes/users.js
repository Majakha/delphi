const express = require("express");
const router = express.Router();
const {
  executeAuthQuery,
  executeAuthQueryOne,
  executeAuthInsert,
  executeAuthUpdate,
  requireAuth,
} = require("../authDB.js");
const {
  getAllUsers,
  getUserById,
  getUserByCredentials,
  createUser,
  updateUser,
  deleteUser,
} = require("../queries.js");
const { asyncHandler } = require("../middleware/errorHandler.js");
const {
  ValidationError,
  NotFoundError,
  DatabaseError,
} = require("../errors/CustomErrors.js");

// Get all users
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const query = getAllUsers();
    const users = await executeAuthQuery(query, [], req.token);
    res.list(users, "Users retrieved successfully");
  }),
);

// Get user by ID
router.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
      throw new ValidationError("User ID is required");
    }

    const query = getUserById(id);
    const user = await executeAuthQueryOne(query, [], req.token);

    if (!user) {
      throw new NotFoundError("User");
    }

    res.success(user, "User retrieved successfully");
  }),
);

// Create new user
router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;

    // Validation
    const errors = [];

    if (!password?.trim()) {
      errors.push({
        field: "password",
        message: "Password is required and cannot be empty",
      });
    } else if (password.length < 6) {
      errors.push({
        field: "password",
        message: "Password must be at least 6 characters long",
      });
    } else if (password.length > 200) {
      errors.push({
        field: "password",
        message: "Password must be less than 200 characters",
      });
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
      throw new ValidationError("User validation failed", { errors });
    }

    const query = createUser(username?.trim(), email?.trim(), password.trim());

    let userId;
    try {
      userId = await executeAuthInsert(query, [], req.token);
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
        throw new ValidationError("User information already exists");
      }
      throw new DatabaseError("Failed to create user");
    }

    // Return the created user (without password)
    const createdUser = await executeAuthQueryOne(
      getUserById(userId),
      [],
      req.token,
    );
    res.created(createdUser, "User created successfully");
  }),
);

// Update user
router.put(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { username, email } = req.body;

    if (!id) {
      throw new ValidationError("User ID is required");
    }

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
      throw new ValidationError("User validation failed", { errors });
    }

    // Check if user exists
    const existingUser = await executeAuthQueryOne(
      getUserById(id),
      [],
      req.token,
    );
    if (!existingUser) {
      throw new NotFoundError("User");
    }

    const query = updateUser(id, username?.trim(), email?.trim());

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
        throw new ValidationError("User information already exists");
      }
      throw error;
    }

    // Return updated user
    const updatedUser = await executeAuthQueryOne(
      getUserById(id),
      [],
      req.token,
    );
    res.success(updatedUser, "User updated successfully");
  }),
);

// Delete user
router.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
      throw new ValidationError("User ID is required");
    }

    // Check if user exists
    const existingUser = await executeAuthQueryOne(
      getUserById(id),
      [],
      req.token,
    );
    if (!existingUser) {
      throw new NotFoundError("User");
    }

    const query = deleteUser(id);

    try {
      const affectedRows = await executeAuthUpdate(query, [], req.token);

      if (affectedRows === 0) {
        throw new NotFoundError("User");
      }
    } catch (error) {
      if (error.code === "ER_ROW_IS_REFERENCED_2") {
        throw new ValidationError(
          "Cannot delete user that has associated data",
          {
            details:
              "This user has associated protocols, sections, subsections, or other data that prevents deletion",
          },
        );
      }
      throw error;
    }

    res.success(null, "User deleted successfully");
  }),
);

module.exports = router;
