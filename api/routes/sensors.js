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
  getAllSensors,
  getSensorById,
  getSensorsByCategory,
  getCustomSensorsByUser,
  getPublicSensors,
  createSensor,
  updateSensor,
  deleteSensor,
  searchSensors,
} = require("../queries.js");
const { v4: uuidv4 } = require("uuid");
const { asyncHandler } = require("../middleware/errorHandler.js");
const {
  ValidationError,
  NotFoundError,
  DatabaseError,
} = require("../errors/CustomErrors.js");

// Get all sensors
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const query = getAllSensors();
    const sensors = await executeAuthQuery(query, [], req.token);
    res.list(sensors, "Sensors retrieved successfully");
  }),
);

// Get public sensors
router.get(
  "/public",
  asyncHandler(async (req, res) => {
    const query = getPublicSensors();
    const sensors = await executeAuthQuery(query, [], req.token);
    res.list(sensors, "Public sensors retrieved successfully");
  }),
);

// Get sensors by category
router.get(
  "/category/:category",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { category } = req.params;

    if (!category.trim()) {
      throw new ValidationError("Category parameter is required");
    }

    const query = getSensorsByCategory(category);
    const sensors = await executeAuthQuery(query, [], req.token);
    res.list(
      sensors,
      `Sensors in category '${category}' retrieved successfully`,
    );
  }),
);

// Get user's custom sensors
router.get(
  "/custom",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { getUserContext } = require("../authDB.js");
    const userContext = getUserContext(req.token);

    const query = getCustomSensorsByUser(userContext.userId);
    const sensors = await executeAuthQuery(query, [], req.token);
    res.list(sensors, "Custom sensors retrieved successfully");
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

    const query = searchSensors(term);
    const sensors = await executeAuthQuery(query, [], req.token);
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

    const query = getSensorById(id);
    const sensor = await executeAuthQueryOne(query, [], req.token);

    if (!sensor) {
      throw new NotFoundError("Sensor");
    }

    res.success(sensor, "Sensor retrieved successfully");
  }),
);

// Create new sensor
router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { name, category, isCustom = true } = req.body;

    // Validation
    const errors = [];
    if (!name?.trim()) {
      errors.push({
        field: "name",
        message: "Name is required and cannot be empty",
      });
    }
    if (!category?.trim()) {
      errors.push({
        field: "category",
        message: "Category is required and cannot be empty",
      });
    }
    if (name && name.length < 2) {
      errors.push({
        field: "name",
        message: "Name must be at least 2 characters long",
      });
    }
    if (name && name.length > 100) {
      errors.push({
        field: "name",
        message: "Name must be less than 100 characters",
      });
    }

    if (errors.length > 0) {
      throw new ValidationError("Sensor validation failed", { errors });
    }

    const { getUserContext } = require("../authDB.js");
    const userContext = getUserContext(req.token);

    const sensorId = uuidv4();
    const query = createSensor(
      sensorId,
      name.trim(),
      category.trim(),
      isCustom,
      userContext.userId,
    );

    try {
      await executeAuthInsert(query, [], req.token);
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        throw new ValidationError("A sensor with this name already exists", {
          field: "name",
          value: name,
        });
      }
      throw new DatabaseError("Failed to create sensor");
    }

    // Return the created sensor
    const createdSensor = await executeAuthQueryOne(
      getSensorById(sensorId),
      [],
      req.token,
    );
    res.created(createdSensor, "Sensor created successfully");
  }),
);

// Update sensor
router.put(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, category } = req.body;

    if (!id) {
      throw new ValidationError("Sensor ID is required");
    }

    // Validation
    const errors = [];
    if (!name?.trim()) {
      errors.push({
        field: "name",
        message: "Name is required and cannot be empty",
      });
    }
    if (!category?.trim()) {
      errors.push({
        field: "category",
        message: "Category is required and cannot be empty",
      });
    }
    if (name && name.length < 2) {
      errors.push({
        field: "name",
        message: "Name must be at least 2 characters long",
      });
    }
    if (name && name.length > 100) {
      errors.push({
        field: "name",
        message: "Name must be less than 100 characters",
      });
    }

    if (errors.length > 0) {
      throw new ValidationError("Sensor validation failed", { errors });
    }

    // Check if sensor exists
    const existingSensor = await executeAuthQueryOne(
      getSensorById(id),
      [],
      req.token,
    );
    if (!existingSensor) {
      throw new NotFoundError("Sensor");
    }

    const query = updateSensor(id, name.trim(), category.trim());

    try {
      const affectedRows = await executeAuthUpdate(query, [], req.token);

      if (affectedRows === 0) {
        throw new NotFoundError("Sensor");
      }
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        throw new ValidationError("A sensor with this name already exists", {
          field: "name",
          value: name,
        });
      }
      throw error;
    }

    // Return updated sensor
    const updatedSensor = await executeAuthQueryOne(
      getSensorById(id),
      [],
      req.token,
    );
    res.success(updatedSensor, "Sensor updated successfully");
  }),
);

// Delete sensor
router.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
      throw new ValidationError("Sensor ID is required");
    }

    // Check if sensor exists
    const existingSensor = await executeAuthQueryOne(
      getSensorById(id),
      [],
      req.token,
    );
    if (!existingSensor) {
      throw new NotFoundError("Sensor");
    }

    const query = deleteSensor(id);

    try {
      const affectedRows = await executeAuthUpdate(query, [], req.token);

      if (affectedRows === 0) {
        throw new NotFoundError("Sensor");
      }
    } catch (error) {
      if (error.code === "ER_ROW_IS_REFERENCED_2") {
        throw new ValidationError(
          "Cannot delete sensor that is being used in subsections",
          {
            details: "Remove the sensor from all subsections before deleting",
          },
        );
      }
      throw error;
    }

    res.success(null, "Sensor deleted successfully");
  }),
);

module.exports = router;
