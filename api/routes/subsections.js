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
  getAllSubsections,
  getSubsectionById,
  getSubsectionsByUser,
  getPublicSubsections,
  getSubsectionsByType,
  getEnabledSubsections,
  createSubsection,
  updateSubsection,
  deleteSubsection,
  searchSubsections,
  getSubsectionSensors,
  addSensorToSubsection,
  removeSensorFromSubsection,
  removeAllSensorsFromSubsection,
  getSubsectionWithSensors,
} = require("../queries.js");
const { v4: uuidv4 } = require("uuid");
const { asyncHandler } = require("../middleware/errorHandler.js");
const {
  ValidationError,
  NotFoundError,
  DatabaseError,
} = require("../errors/CustomErrors.js");

// Get all subsections
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const query = getAllSubsections();
    const subsections = await executeAuthQuery(query, [], req.token);
    res.list(subsections, "Subsections retrieved successfully");
  }),
);

// Get public subsections
router.get(
  "/public",
  requireAuth,
  asyncHandler(async (req, res) => {
    const query = getPublicSubsections();
    const subsections = await executeAuthQuery(query, [], req.token);
    res.list(subsections, "Public subsections retrieved successfully");
  }),
);

// Get enabled subsections
router.get(
  "/enabled",
  requireAuth,
  asyncHandler(async (req, res) => {
    const query = getEnabledSubsections();
    const subsections = await executeAuthQuery(query, [], req.token);
    res.list(subsections, "Enabled subsections retrieved successfully");
  }),
);

// Get subsections by type
router.get(
  "/type/:type",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { type } = req.params;

    if (!["subsection", "break"].includes(type)) {
      throw new ValidationError('Type must be either "subsection" or "break"', {
        field: "type",
        value: type,
        allowedValues: ["subsection", "break"],
      });
    }

    const query = getSubsectionsByType(type);
    const subsections = await executeAuthQuery(query, [], req.token);
    res.list(
      subsections,
      `Subsections of type '${type}' retrieved successfully`,
    );
  }),
);

// Get user's subsections
router.get(
  "/my",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { getUserContext } = require("../authDB.js");
    const userContext = getUserContext(req.token);

    const query = getSubsectionsByUser(userContext.userId);
    const subsections = await executeAuthQuery(query, [], req.token);
    res.list(subsections, "User subsections retrieved successfully");
  }),
);

// Search subsections
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

    const query = searchSubsections(term);
    const subsections = await executeAuthQuery(query, [], req.token);
    res.list(
      subsections,
      `Search results for '${term}' retrieved successfully`,
    );
  }),
);

// Get subsection by ID
router.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
      throw new ValidationError("Subsection ID is required");
    }

    const query = getSubsectionById(id);
    const subsection = await executeAuthQueryOne(query, [], req.token);

    if (!subsection) {
      throw new NotFoundError("Subsection");
    }

    res.success(subsection, "Subsection retrieved successfully");
  }),
);

// Get subsection with all sensors
router.get(
  "/:id/with-sensors",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
      throw new ValidationError("Subsection ID is required");
    }

    const query = getSubsectionWithSensors(id);
    const result = await executeAuthQuery(query, [], req.token);

    if (result.length === 0) {
      throw new NotFoundError("Subsection");
    }

    // Group sensors with subsection data
    const subsection = {
      id: result[0].id,
      title: result[0].title,
      time: result[0].time,
      rating: result[0].rating,
      description: result[0].description,
      additional_notes: result[0].additional_notes,
      enabled: result[0].enabled,
      type: result[0].type,
      created_by: result[0].created_by,
      is_public: result[0].is_public,
      created_at: result[0].created_at,
      updated_at: result[0].updated_at,
      sensors: result
        .filter((row) => row.sensor_id)
        .map((row) => ({
          id: row.sensor_id,
          name: row.sensor_name,
          category: row.sensor_category,
        })),
    };

    res.success(subsection, "Subsection with sensors retrieved successfully");
  }),
);

// Get subsection sensors
router.get(
  "/:id/sensors",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
      throw new ValidationError("Subsection ID is required");
    }

    const query = getSubsectionSensors(id);
    const sensors = await executeAuthQuery(query, [], req.token);
    res.list(sensors, "Subsection sensors retrieved successfully");
  }),
);

// Create new subsection
router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const {
      title,
      time,
      rating,
      description,
      additionalNotes,
      type = "subsection",
      isPublic = false,
    } = req.body;

    // Validation
    const errors = [];

    if (!title?.trim()) {
      errors.push({
        field: "title",
        message: "Title is required and cannot be empty",
      });
    }
    if (!time) {
      errors.push({
        field: "time",
        message: "Time is required",
      });
    }
    if (title && title.length < 2) {
      errors.push({
        field: "title",
        message: "Title must be at least 2 characters long",
      });
    }
    if (title && title.length > 200) {
      errors.push({
        field: "title",
        message: "Title must be less than 200 characters",
      });
    }
    if (time && (isNaN(time) || time < 0)) {
      errors.push({
        field: "time",
        message: "Time must be a positive number",
      });
    }
    if (rating !== undefined && (isNaN(rating) || rating < 0 || rating > 5)) {
      errors.push({
        field: "rating",
        message: "Rating must be a number between 0 and 5",
      });
    }
    if (!["subsection", "break"].includes(type)) {
      errors.push({
        field: "type",
        message: 'Type must be either "subsection" or "break"',
        allowedValues: ["subsection", "break"],
      });
    }
    if (description && description.length > 1000) {
      errors.push({
        field: "description",
        message: "Description must be less than 1000 characters",
      });
    }
    if (additionalNotes && additionalNotes.length > 1000) {
      errors.push({
        field: "additionalNotes",
        message: "Additional notes must be less than 1000 characters",
      });
    }

    if (errors.length > 0) {
      throw new ValidationError("Subsection validation failed", { errors });
    }

    const { getUserContext } = require("../authDB.js");
    const userContext = getUserContext(req.token);

    const subsectionId = uuidv4();
    const query = createSubsection(
      subsectionId,
      title.trim(),
      time,
      rating,
      description?.trim(),
      additionalNotes?.trim(),
      type,
      userContext.userId,
      isPublic,
    );

    try {
      await executeAuthInsert(query, [], req.token);
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        throw new ValidationError(
          "A subsection with this title already exists",
          {
            field: "title",
            value: title,
          },
        );
      }
      throw new DatabaseError("Failed to create subsection");
    }

    // Return the created subsection
    const createdSubsection = await executeAuthQueryOne(
      getSubsectionById(subsectionId),
      [],
      req.token,
    );
    res.created(createdSubsection, "Subsection created successfully");
  }),
);

// Update subsection
router.put(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
      title,
      time,
      rating,
      description,
      additionalNotes,
      enabled = true,
    } = req.body;

    if (!id) {
      throw new ValidationError("Subsection ID is required");
    }

    // Validation
    const errors = [];

    if (!title?.trim()) {
      errors.push({
        field: "title",
        message: "Title is required and cannot be empty",
      });
    }
    if (!time) {
      errors.push({
        field: "time",
        message: "Time is required",
      });
    }
    if (title && title.length < 2) {
      errors.push({
        field: "title",
        message: "Title must be at least 2 characters long",
      });
    }
    if (title && title.length > 200) {
      errors.push({
        field: "title",
        message: "Title must be less than 200 characters",
      });
    }
    if (time && (isNaN(time) || time < 0)) {
      errors.push({
        field: "time",
        message: "Time must be a positive number",
      });
    }
    if (rating !== undefined && (isNaN(rating) || rating < 0 || rating > 5)) {
      errors.push({
        field: "rating",
        message: "Rating must be a number between 0 and 5",
      });
    }
    if (description && description.length > 1000) {
      errors.push({
        field: "description",
        message: "Description must be less than 1000 characters",
      });
    }
    if (additionalNotes && additionalNotes.length > 1000) {
      errors.push({
        field: "additionalNotes",
        message: "Additional notes must be less than 1000 characters",
      });
    }

    if (errors.length > 0) {
      throw new ValidationError("Subsection validation failed", { errors });
    }

    // Check if subsection exists
    const existingSubsection = await executeAuthQueryOne(
      getSubsectionById(id),
      [],
      req.token,
    );
    if (!existingSubsection) {
      throw new NotFoundError("Subsection");
    }

    const query = updateSubsection(
      id,
      title.trim(),
      time,
      rating,
      description?.trim(),
      additionalNotes?.trim(),
      enabled,
    );

    try {
      const affectedRows = await executeAuthUpdate(query, [], req.token);

      if (affectedRows === 0) {
        throw new NotFoundError("Subsection");
      }
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        throw new ValidationError(
          "A subsection with this title already exists",
          {
            field: "title",
            value: title,
          },
        );
      }
      throw error;
    }

    // Return updated subsection
    const updatedSubsection = await executeAuthQueryOne(
      getSubsectionById(id),
      [],
      req.token,
    );
    res.success(updatedSubsection, "Subsection updated successfully");
  }),
);

// Delete subsection
router.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
      throw new ValidationError("Subsection ID is required");
    }

    // Check if subsection exists
    const existingSubsection = await executeAuthQueryOne(
      getSubsectionById(id),
      [],
      req.token,
    );
    if (!existingSubsection) {
      throw new NotFoundError("Subsection");
    }

    const query = deleteSubsection(id);

    try {
      const affectedRows = await executeAuthUpdate(query, [], req.token);

      if (affectedRows === 0) {
        throw new NotFoundError("Subsection");
      }
    } catch (error) {
      if (error.code === "ER_ROW_IS_REFERENCED_2") {
        throw new ValidationError(
          "Cannot delete subsection that is being used in sections",
          {
            details: "Remove the subsection from all sections before deleting",
          },
        );
      }
      throw error;
    }

    res.success(null, "Subsection deleted successfully");
  }),
);

// Add sensor to subsection
router.post(
  "/:id/sensors/:sensorId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id: subsectionId, sensorId } = req.params;

    if (!subsectionId) {
      throw new ValidationError("Subsection ID is required");
    }
    if (!sensorId) {
      throw new ValidationError("Sensor ID is required");
    }

    // Check if subsection exists
    const existingSubsection = await executeAuthQueryOne(
      getSubsectionById(subsectionId),
      [],
      req.token,
    );
    if (!existingSubsection) {
      throw new NotFoundError("Subsection");
    }

    const query = addSensorToSubsection(subsectionId, sensorId);

    try {
      await executeAuthUpdate(query, [], req.token);
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        throw new ValidationError("Sensor is already added to this subsection");
      }
      if (error.code === "ER_NO_REFERENCED_ROW_2") {
        throw new NotFoundError("Sensor");
      }
      throw error;
    }

    res.success(null, "Sensor added to subsection successfully");
  }),
);

// Remove sensor from subsection
router.delete(
  "/:id/sensors/:sensorId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id: subsectionId, sensorId } = req.params;

    if (!subsectionId) {
      throw new ValidationError("Subsection ID is required");
    }
    if (!sensorId) {
      throw new ValidationError("Sensor ID is required");
    }

    const query = removeSensorFromSubsection(subsectionId, sensorId);
    const affectedRows = await executeAuthUpdate(query, [], req.token);

    if (affectedRows === 0) {
      throw new NotFoundError("Sensor not found in subsection");
    }

    res.success(null, "Sensor removed from subsection successfully");
  }),
);

// Remove all sensors from subsection
router.delete(
  "/:id/sensors",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id: subsectionId } = req.params;

    if (!subsectionId) {
      throw new ValidationError("Subsection ID is required");
    }

    const query = removeAllSensorsFromSubsection(subsectionId);
    const affectedRows = await executeAuthUpdate(query, [], req.token);

    res.success(
      { removedCount: affectedRows },
      "All sensors removed from subsection successfully",
    );
  }),
);

module.exports = router;
