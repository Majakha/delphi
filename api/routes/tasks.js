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
  ConflictError,
  DatabaseError,
  AuthorizationError,
} = require("../errors/CustomErrors.js");

// Get all public tasks
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { type, user_only = "false" } = req.query;
    const userContext = getUserContext(req.token);

    let tasks;
    if (user_only === "true") {
      if (type) {
        // Get user tasks of specific type
        const allUserTasks = await executeAuthQueryObj(
          DatabaseQueries.tasks.getByUser(userContext.userId),
          req.token,
        );
        tasks = allUserTasks.filter(task => task.type === type);
      } else {
        // Get all user tasks
        tasks = await executeAuthQueryObj(
          DatabaseQueries.tasks.getByUser(userContext.userId),
          req.token,
        );
      }
    } else {
      if (type) {
        tasks = await executeAuthQueryObj(
          DatabaseQueries.tasks.getByType(type),
          req.token,
        );
      } else {
        tasks = await executeAuthQueryObj(
          DatabaseQueries.tasks.getPublic(),
          req.token,
        );
      }
    }

    res.list(tasks, "Tasks retrieved successfully");
  }),
);

// Search tasks
router.get(
  "/search/:term",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { term } = req.params;

    if (!term.trim()) {
      throw new ValidationError("Search term is required");
    }

    if (term.length < 2) {
      throw new ValidationError("Search term must be at least 2 characters long");
    }

    const tasks = await executeAuthQueryObj(
      DatabaseQueries.tasks.search(term),
      req.token,
    );
    res.list(tasks, `Search results for '${term}' retrieved successfully`);
  }),
);

// Get task by ID with relationships
router.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { with_relations = "false" } = req.query;

    if (!id) {
      throw new ValidationError("Task ID is required");
    }

    let task;
    if (with_relations === "true") {
      task = await executeAuthQueryOneObj(
        DatabaseQueries.tasks.getWithRelations(id),
        req.token,
      );

      if (task) {
        // Parse the concatenated sensor and domain data
        task.sensors = [];
        task.domains = [];

        if (task.sensor_ids) {
          const sensorIds = task.sensor_ids.split(",");
          const sensorNames = task.sensor_names.split(",");
          task.sensors = sensorIds.map((id, index) => ({
            id,
            name: sensorNames[index] || id,
          }));
        }

        if (task.domain_ids) {
          const domainIds = task.domain_ids.split(",");
          const domainNames = task.domain_names.split(",");
          task.domains = domainIds.map((id, index) => ({
            id,
            name: domainNames[index] || id,
          }));
        }

        // Clean up the concatenated fields
        delete task.sensor_ids;
        delete task.sensor_names;
        delete task.domain_ids;
        delete task.domain_names;
      }
    } else {
      task = await executeAuthQueryOneObj(
        DatabaseQueries.tasks.getById(id),
        req.token,
      );
    }

    if (!task) {
      throw new NotFoundError("Task");
    }

    res.success(task, "Task retrieved successfully");
  }),
);

// Get task sensors
router.get(
  "/:id/sensors",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
      throw new ValidationError("Task ID is required");
    }

    // Verify task exists
    const task = await executeAuthQueryOneObj(
      DatabaseQueries.tasks.getById(id),
      req.token,
    );
    if (!task) {
      throw new NotFoundError("Task");
    }

    const sensors = await executeAuthQueryObj(
      DatabaseQueries.taskSensors.getByTask(id),
      req.token,
    );
    res.list(sensors, "Task sensors retrieved successfully");
  }),
);

// Get task domains
router.get(
  "/:id/domains",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
      throw new ValidationError("Task ID is required");
    }

    // Verify task exists
    const task = await executeAuthQueryOneObj(
      DatabaseQueries.tasks.getById(id),
      req.token,
    );
    if (!task) {
      throw new NotFoundError("Task");
    }

    const domains = await executeAuthQueryObj(
      DatabaseQueries.taskDomains.getByTask(id),
      req.token,
    );
    res.list(domains, "Task domains retrieved successfully");
  }),
);

// Create new task (custom task by user)
router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const {
      title,
      time,
      rating,
      description,
      additional_notes,
      type = "task",
    } = req.body;
    const userContext = getUserContext(req.token);

    // Validation
    const errors = [];

    if (!title?.trim()) {
      errors.push({
        field: "title",
        message: "Task title is required and cannot be empty",
      });
    }
    if (title && title.length < 2) {
      errors.push({
        field: "title",
        message: "Task title must be at least 2 characters long",
      });
    }
    if (title && title.length > 255) {
      errors.push({
        field: "title",
        message: "Task title must be less than 255 characters",
      });
    }

    if (time !== undefined && (isNaN(time) || time < 0)) {
      errors.push({
        field: "time",
        message: "Time must be a non-negative number",
      });
    }

    if (rating !== undefined && (isNaN(rating) || rating < 0 || rating > 10)) {
      errors.push({
        field: "rating",
        message: "Rating must be between 0 and 10",
      });
    }

    if (description && description.length > 1000) {
      errors.push({
        field: "description",
        message: "Description must be less than 1000 characters",
      });
    }

    if (additional_notes && additional_notes.length > 1000) {
      errors.push({
        field: "additional_notes",
        message: "Additional notes must be less than 1000 characters",
      });
    }

    if (!["task", "break"].includes(type)) {
      errors.push({
        field: "type",
        message: "Type must be either 'task' or 'break'",
      });
    }

    if (errors.length > 0) {
      throw new ValidationError("Task validation failed", { errors });
    }

    const taskId = generateUUID();

    try {
      await executeAuthInsertObj(
        DatabaseQueries.tasks.create(
          taskId,
          title.trim(),
          time || null,
          rating || null,
          description?.trim() || null,
          additional_notes?.trim() || null,
          type,
          true, // is_custom = true for user-created tasks
          userContext.userId,
        ),
        req.token,
      );
    } catch (error) {
      throw new DatabaseError("Failed to create task");
    }

    // Return the created task
    const createdTask = await executeAuthQueryOneObj(
      DatabaseQueries.tasks.getById(taskId),
      req.token,
    );
    res.created(createdTask, "Task created successfully");
  }),
);

// Update task (only custom tasks can be updated by their creator)
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
      additional_notes,
      enabled = true,
    } = req.body;
    const userContext = getUserContext(req.token);

    if (!id) {
      throw new ValidationError("Task ID is required");
    }

    // Check if task exists and is editable
    const existingTask = await executeAuthQueryOneObj(
      DatabaseQueries.tasks.getById(id),
      req.token,
    );
    if (!existingTask) {
      throw new NotFoundError("Task");
    }

    // Only allow editing custom tasks by their creator
    if (!existingTask.is_custom) {
      throw new AuthorizationError("Cannot modify global tasks");
    }
    if (existingTask.created_by !== userContext.userId) {
      throw new AuthorizationError("You can only modify your own custom tasks");
    }

    // Validation
    const errors = [];

    if (title !== undefined) {
      if (!title?.trim()) {
        errors.push({
          field: "title",
          message: "Task title cannot be empty",
        });
      }
      if (title && title.length < 2) {
        errors.push({
          field: "title",
          message: "Task title must be at least 2 characters long",
        });
      }
      if (title && title.length > 255) {
        errors.push({
          field: "title",
          message: "Task title must be less than 255 characters",
        });
      }
    }

    if (time !== undefined && (isNaN(time) || time < 0)) {
      errors.push({
        field: "time",
        message: "Time must be a non-negative number",
      });
    }

    if (rating !== undefined && (isNaN(rating) || rating < 0 || rating > 10)) {
      errors.push({
        field: "rating",
        message: "Rating must be between 0 and 10",
      });
    }

    if (description !== undefined && description.length > 1000) {
      errors.push({
        field: "description",
        message: "Description must be less than 1000 characters",
      });
    }

    if (additional_notes !== undefined && additional_notes.length > 1000) {
      errors.push({
        field: "additional_notes",
        message: "Additional notes must be less than 1000 characters",
      });
    }

    if (errors.length > 0) {
      throw new ValidationError("Task validation failed", { errors });
    }

    // Use existing values if not provided
    const finalTitle = title?.trim() || existingTask.title;
    const finalTime = time !== undefined ? time : existingTask.time;
    const finalRating = rating !== undefined ? rating : existingTask.rating;
    const finalDescription = description !== undefined ? description?.trim() : existingTask.description;
    const finalAdditionalNotes = additional_notes !== undefined ? additional_notes?.trim() : existingTask.additional_notes;

    try {
      const affectedRows = await executeAuthUpdateObj(
        DatabaseQueries.tasks.update(
          id,
          finalTitle,
          finalTime,
          finalRating,
          finalDescription,
          finalAdditionalNotes,
          enabled,
        ),
        req.token,
      );

      if (affectedRows === 0) {
        throw new NotFoundError("Task");
      }
    } catch (error) {
      throw new DatabaseError("Failed to update task");
    }

    // Return updated task
    const updatedTask = await executeAuthQueryOneObj(
      DatabaseQueries.tasks.getById(id),
      req.token,
    );
    res.success(updatedTask, "Task updated successfully");
  }),
);

// Delete task (only custom tasks can be deleted by their creator)
router.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userContext = getUserContext(req.token);

    if (!id) {
      throw new ValidationError("Task ID is required");
    }

    // Check if task exists and is deletable
    const existingTask = await executeAuthQueryOneObj(
      DatabaseQueries.tasks.getById(id),
      req.token,
    );
    if (!existingTask) {
      throw new NotFoundError("Task");
    }

    // Only allow deleting custom tasks by their creator
    if (!existingTask.is_custom) {
      throw new AuthorizationError("Cannot delete global tasks");
    }
    if (existingTask.created_by !== userContext.userId) {
      throw new AuthorizationError("You can only delete your own custom tasks");
    }

    try {
      const affectedRows = await executeAuthUpdateObj(
        DatabaseQueries.tasks.delete(id),
        req.token,
      );

      if (affectedRows === 0) {
        throw new NotFoundError("Task");
      }
    } catch (error) {
      if (error.code === "ER_ROW_IS_REFERENCED_2") {
        throw new ValidationError(
          "Cannot delete task that is used in protocols",
          {
            details: "Remove the task from all protocols before deleting it",
          },
        );
      }
      throw new DatabaseError("Failed to delete task");
    }

    res.success(null, "Task deleted successfully");
  }),
);

// Add sensor to task (only for custom tasks)
router.post(
  "/:id/sensors/:sensorId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id: taskId, sensorId } = req.params;
    const userContext = getUserContext(req.token);

    if (!taskId || !sensorId) {
      throw new ValidationError("Task ID and Sensor ID are required");
    }

    // Check if task exists and is editable
    const task = await executeAuthQueryOneObj(
      DatabaseQueries.tasks.getById(taskId),
      req.token,
    );
    if (!task) {
      throw new NotFoundError("Task");
    }
    if (!task.is_custom || task.created_by !== userContext.userId) {
      throw new AuthorizationError("You can only modify your own custom tasks");
    }

    // Check if sensor exists
    const sensor = await executeAuthQueryOneObj(
      DatabaseQueries.sensors.getById(sensorId),
      req.token,
    );
    if (!sensor) {
      throw new NotFoundError("Sensor");
    }

    try {
      await executeAuthInsertObj(
        DatabaseQueries.taskSensors.add(taskId, sensorId),
        req.token,
      );
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        throw new ConflictError("Sensor is already added to this task");
      }
      throw new DatabaseError("Failed to add sensor to task");
    }

    res.success(null, "Sensor added to task successfully");
  }),
);

// Remove sensor from task (only for custom tasks)
router.delete(
  "/:id/sensors/:sensorId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id: taskId, sensorId } = req.params;
    const userContext = getUserContext(req.token);

    if (!taskId || !sensorId) {
      throw new ValidationError("Task ID and Sensor ID are required");
    }

    // Check if task exists and is editable
    const task = await executeAuthQueryOneObj(
      DatabaseQueries.tasks.getById(taskId),
      req.token,
    );
    if (!task) {
      throw new NotFoundError("Task");
    }
    if (!task.is_custom || task.created_by !== userContext.userId) {
      throw new AuthorizationError("You can only modify your own custom tasks");
    }

    const affectedRows = await executeAuthUpdateObj(
      DatabaseQueries.taskSensors.remove(taskId, sensorId),
      req.token,
    );

    if (affectedRows === 0) {
      throw new NotFoundError("Sensor not found in task");
    }

    res.success(null, "Sensor removed from task successfully");
  }),
);

// Add domain to task (only for custom tasks)
router.post(
  "/:id/domains/:domainId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id: taskId, domainId } = req.params;
    const userContext = getUserContext(req.token);

    if (!taskId || !domainId) {
      throw new ValidationError("Task ID and Domain ID are required");
    }

    // Check if task exists and is editable
    const task = await executeAuthQueryOneObj(
      DatabaseQueries.tasks.getById(taskId),
      req.token,
    );
    if (!task) {
      throw new NotFoundError("Task");
    }
    if (!task.is_custom || task.created_by !== userContext.userId) {
      throw new AuthorizationError("You can only modify your own custom tasks");
    }

    // Check if domain exists
    const domain = await executeAuthQueryOneObj(
      DatabaseQueries.domains.getById(domainId),
      req.token,
    );
    if (!domain) {
      throw new NotFoundError("Domain");
    }

    try {
      await executeAuthInsertObj(
        DatabaseQueries.taskDomains.add(taskId, domainId),
        req.token,
      );
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        throw new ConflictError("Domain is already added to this task");
      }
      throw new DatabaseError("Failed to add domain to task");
    }

    res.success(null, "Domain added to task successfully");
  }),
);

// Remove domain from task (only for custom tasks)
router.delete(
  "/:id/domains/:domainId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id: taskId, domainId } = req.params;
    const userContext = getUserContext(req.token);

    if (!taskId || !domainId) {
      throw new ValidationError("Task ID and Domain ID are required");
    }

    // Check if task exists and is editable
    const task = await executeAuthQueryOneObj(
      DatabaseQueries.tasks.getById(taskId),
      req.token,
    );
    if (!task) {
      throw new NotFoundError("Task");
    }
    if (!task.is_custom || task.created_by !== userContext.userId) {
      throw new AuthorizationError("You can only modify your own custom tasks");
    }

    const affectedRows = await executeAuthUpdateObj(
      DatabaseQueries.taskDomains.remove(taskId, domainId),
      req.token,
    );

    if (affectedRows === 0) {
      throw new NotFoundError("Domain not found in task");
    }

    res.success(null, "Domain removed from task successfully");
  }),
);

module.exports = router;
