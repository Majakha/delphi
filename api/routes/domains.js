const express = require("express");
const router = express.Router();
const {
  executeAuthQueryObj,
  executeAuthQueryOneObj,
  executeAuthInsertObj,
  executeAuthUpdateObj,
  requireAuth,
  getUserContext,
  generateUUID,
} = require("../authDB.js");
const DatabaseQueries = require("../queries.js");
const { asyncHandler } = require("../middleware/errorHandler.js");
const {
  ValidationError,
  NotFoundError,
  DatabaseError,
  AuthorizationError,
} = require("../errors/CustomErrors.js");

// Get all domains
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { user_only = "false" } = req.query;
    const userContext = getUserContext(req.token);

    let domains;
    if (user_only === "true") {
      domains = await executeAuthQueryObj(
        DatabaseQueries.domains.getByUser(userContext.userId),
        req.token,
      );
    } else {
      domains = await executeAuthQueryObj(
        DatabaseQueries.domains.getAll(),
        req.token,
      );
    }

    res.list(domains, "Domains retrieved successfully");
  }),
);

// Get public domains only
router.get(
  "/public",
  requireAuth,
  asyncHandler(async (req, res) => {
    const domains = await executeAuthQueryObj(
      DatabaseQueries.domains.getPublic(),
      req.token,
    );
    res.list(domains, "Public domains retrieved successfully");
  }),
);

// Get domain by ID
router.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
      throw new ValidationError("Domain ID is required");
    }

    const domain = await executeAuthQueryOneObj(
      DatabaseQueries.domains.getById(id),
      req.token,
    );

    if (!domain) {
      throw new NotFoundError("Domain");
    }

    res.success(domain, "Domain retrieved successfully");
  }),
);

// Create new custom domain
router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { name, description } = req.body;
    const userContext = getUserContext(req.token);

    // Validation
    const errors = [];

    if (!name?.trim()) {
      errors.push({
        field: "name",
        message: "Name is required and cannot be empty",
      });
    }
    if (name && name.length < 2) {
      errors.push({
        field: "name",
        message: "Name must be at least 2 characters long",
      });
    }
    if (name && name.length > 255) {
      errors.push({
        field: "name",
        message: "Name must be less than 255 characters",
      });
    }

    if (description && description.length > 1000) {
      errors.push({
        field: "description",
        message: "Description must be less than 1000 characters",
      });
    }

    if (errors.length > 0) {
      throw new ValidationError("Domain validation failed", { errors });
    }

    const domainId = generateUUID();

    try {
      await executeAuthInsertObj(
        DatabaseQueries.domains.create(
          domainId,
          name.trim(),
          description?.trim() || null,
          true, // is_custom = true for user-created domains
          userContext.userId,
        ),
        req.token,
      );
    } catch (error) {
      throw new DatabaseError("Failed to create domain");
    }

    // Return the created domain
    const createdDomain = await executeAuthQueryOneObj(
      DatabaseQueries.domains.getById(domainId),
      req.token,
    );
    res.created(createdDomain, "Domain created successfully");
  }),
);

// Update domain (only custom domains by their creator)
router.put(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;
    const userContext = getUserContext(req.token);

    if (!id) {
      throw new ValidationError("Domain ID is required");
    }

    // Check if domain exists and is editable
    const existingDomain = await executeAuthQueryOneObj(
      DatabaseQueries.domains.getById(id),
      req.token,
    );
    if (!existingDomain) {
      throw new NotFoundError("Domain");
    }

    // Only allow editing custom domains by their creator
    if (!existingDomain.is_custom) {
      throw new AuthorizationError("Cannot modify global domains");
    }
    if (existingDomain.created_by !== userContext.userId) {
      throw new AuthorizationError(
        "You can only modify your own custom domains",
      );
    }

    // Validation
    const errors = [];

    if (name !== undefined) {
      if (!name?.trim()) {
        errors.push({
          field: "name",
          message: "Name cannot be empty",
        });
      }
      if (name && name.length < 2) {
        errors.push({
          field: "name",
          message: "Name must be at least 2 characters long",
        });
      }
      if (name && name.length > 255) {
        errors.push({
          field: "name",
          message: "Name must be less than 255 characters",
        });
      }
    }

    if (description !== undefined && description.length > 1000) {
      errors.push({
        field: "description",
        message: "Description must be less than 1000 characters",
      });
    }

    if (errors.length > 0) {
      throw new ValidationError("Domain validation failed", { errors });
    }

    // Use existing values if not provided
    const finalName = name?.trim() || existingDomain.name;
    const finalDescription =
      description !== undefined
        ? description?.trim()
        : existingDomain.description;

    try {
      const affectedRows = await executeAuthUpdateObj(
        DatabaseQueries.domains.update(id, finalName, finalDescription),
        req.token,
      );

      if (affectedRows === 0) {
        throw new NotFoundError("Domain");
      }
    } catch (error) {
      throw new DatabaseError("Failed to update domain");
    }

    // Return updated domain
    const updatedDomain = await executeAuthQueryOneObj(
      DatabaseQueries.domains.getById(id),
      req.token,
    );
    res.success(updatedDomain, "Domain updated successfully");
  }),
);

// Delete domain (only custom domains by their creator)
router.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userContext = getUserContext(req.token);

    if (!id) {
      throw new ValidationError("Domain ID is required");
    }

    // Check if domain exists and is deletable
    const existingDomain = await executeAuthQueryOneObj(
      DatabaseQueries.domains.getById(id),
      req.token,
    );
    if (!existingDomain) {
      throw new NotFoundError("Domain");
    }

    // Only allow deleting custom domains by their creator
    if (!existingDomain.is_custom) {
      throw new AuthorizationError("Cannot delete global domains");
    }
    if (existingDomain.created_by !== userContext.userId) {
      throw new AuthorizationError(
        "You can only delete your own custom domains",
      );
    }

    try {
      const affectedRows = await executeAuthUpdateObj(
        DatabaseQueries.domains.delete(id),
        req.token,
      );

      if (affectedRows === 0) {
        throw new NotFoundError("Domain");
      }
    } catch (error) {
      if (error.code === "ER_ROW_IS_REFERENCED_2") {
        throw new ValidationError(
          "Cannot delete domain that is being used in tasks or protocols",
          {
            details:
              "Remove the domain from all tasks and protocols before deleting",
          },
        );
      }
      throw new DatabaseError("Failed to delete domain");
    }

    res.success(null, "Domain deleted successfully");
  }),
);

module.exports = router;
