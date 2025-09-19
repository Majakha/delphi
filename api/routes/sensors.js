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

// Get all sensors
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { category, user_only = "false" } = req.query;
    const userContext = getUserContext(req.token);

    let sensors;
    if (user_only === "true") {
      sensors = await executeAuthQueryObj(
        DatabaseQueries.sensors.getByUser(userContext.userId),
        req.token,
      );
    } else if (category) {
      sensors = await executeAuthQueryObj(
        DatabaseQueries.sensors.getByCategory(category),
        req.token,
      );
    } else {
      sensors = await executeAuthQueryObj(
        DatabaseQueries.sensors.getAll(),
        req.token,
      );
    }

    res.list(sensors, "Sensors retrieved successfully");
  }),
);

// Get public sensors only
router.get(
  "/public",
  requireAuth,
  asyncHandler(async (req, res) => {
    const sensors = await executeAuthQueryObj(
      DatabaseQueries.sensors.getPublic(),
      req.token,
    );
    res.list(sensors, "Public sensors retrieved successfully");
  }),
);

// Search sensors
router.get(
  "/search/:term",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { term } = req.params;

    if (!term.trim()) {
      throw new ValidationError("Search term is required");
    }

    if (term.length < 2) {
      throw new ValidationError(
        "Search term must be at least 2 characters long",
      );
    }

    const sensors = await executeAuthQueryObj(
      DatabaseQueries.sensors.search(term),
      req.token,
    );
    res.list(sensors, `Search results for '${term}' retrieved successfully`);
  }),
);

// Get sensor by ID
router.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
      throw new ValidationError("Sensor ID is required");
    }

    const sensor = await executeAuthQueryOneObj(
      DatabaseQueries.sensors.getById(id),
      req.token,
    );

    if (!sensor) {
      throw new NotFoundError("Sensor");
    }

    res.success(sensor, "Sensor retrieved successfully");
  }),
);

// Create new custom sensor
router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { name, category, description } = req.body;
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

    if (!category?.trim()) {
      errors.push({
        field: "category",
        message: "Category is required and cannot be empty",
      });
    }
    if (category && category.length > 255) {
      errors.push({
        field: "category",
        message: "Category must be less than 255 characters",
      });
    }

    if (description && description.length > 1000) {
      errors.push({
        field: "description",
        message: "Description must be less than 1000 characters",
      });
    }

    if (errors.length > 0) {
      throw new ValidationError("Sensor validation failed", { errors });
    }

    const sensorId = generateUUID();

    try {
      await executeAuthInsertObj(
        DatabaseQueries.sensors.create(
          sensorId,
          name.trim(),
          category.trim(),
          description?.trim() || null,
          true, // is_custom = true for user-created sensors
          userContext.userId,
        ),
        req.token,
      );
    } catch (error) {
      throw new DatabaseError("Failed to create sensor");
    }

    // Return the created sensor
    const createdSensor = await executeAuthQueryOneObj(
      DatabaseQueries.sensors.getById(sensorId),
      req.token,
    );
    res.created(createdSensor, "Sensor created successfully");
  }),
);

// Update sensor (only custom sensors by their creator)
router.put(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, category, description } = req.body;
    const userContext = getUserContext(req.token);

    if (!id) {
      throw new ValidationError("Sensor ID is required");
    }

    // Check if sensor exists and is editable
    const existingSensor = await executeAuthQueryOneObj(
      DatabaseQueries.sensors.getById(id),
      req.token,
    );
    if (!existingSensor) {
      throw new NotFoundError("Sensor");
    }

    // Only allow editing custom sensors by their creator
    if (!existingSensor.is_custom) {
      throw new AuthorizationError("Cannot modify global sensors");
    }
    if (existingSensor.created_by !== userContext.userId) {
      throw new AuthorizationError(
        "You can only modify your own custom sensors",
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

    if (category !== undefined) {
      if (!category?.trim()) {
        errors.push({
          field: "category",
          message: "Category cannot be empty",
        });
      }
      if (category && category.length > 255) {
        errors.push({
          field: "category",
          message: "Category must be less than 255 characters",
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
      throw new ValidationError("Sensor validation failed", { errors });
    }

    // Use existing values if not provided
    const finalName = name?.trim() || existingSensor.name;
    const finalCategory = category?.trim() || existingSensor.category;
    const finalDescription =
      description !== undefined
        ? description?.trim()
        : existingSensor.description;

    try {
      const affectedRows = await executeAuthUpdateObj(
        DatabaseQueries.sensors.update(
          id,
          finalName,
          finalCategory,
          finalDescription,
        ),
        req.token,
      );

      if (affectedRows === 0) {
        throw new NotFoundError("Sensor");
      }
    } catch (error) {
      throw new DatabaseError("Failed to update sensor");
    }

    // Return updated sensor
    const updatedSensor = await executeAuthQueryOneObj(
      DatabaseQueries.sensors.getById(id),
      req.token,
    );
    res.success(updatedSensor, "Sensor updated successfully");
  }),
);

// Delete sensor (only custom sensors by their creator)
router.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userContext = getUserContext(req.token);

    if (!id) {
      throw new ValidationError("Sensor ID is required");
    }

    // Check if sensor exists and is deletable
    const existingSensor = await executeAuthQueryOneObj(
      DatabaseQueries.sensors.getById(id),
      req.token,
    );
    if (!existingSensor) {
      throw new NotFoundError("Sensor");
    }

    // Only allow deleting custom sensors by their creator
    if (!existingSensor.is_custom) {
      throw new AuthorizationError("Cannot delete global sensors");
    }
    if (existingSensor.created_by !== userContext.userId) {
      throw new AuthorizationError(
        "You can only delete your own custom sensors",
      );
    }

    try {
      const affectedRows = await executeAuthUpdateObj(
        DatabaseQueries.sensors.delete(id),
        req.token,
      );

      if (affectedRows === 0) {
        throw new NotFoundError("Sensor");
      }
    } catch (error) {
      if (error.code === "ER_ROW_IS_REFERENCED_2") {
        throw new ValidationError(
          "Cannot delete sensor that is being used in tasks or protocols",
          {
            details:
              "Remove the sensor from all tasks and protocols before deleting",
          },
        );
      }
      throw new DatabaseError("Failed to delete sensor");
    }

    res.success(null, "Sensor deleted successfully");
  }),
);

module.exports = router;
