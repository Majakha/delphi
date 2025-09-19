const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const {
  executeAuthQueryObj,
  executeAuthQueryOneObj,
  executeAuthInsertObj,
  executeAuthUpdateObj,
  executeAuthTransactionObjs,
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

// Helper function to build full protocol with tasks
async function buildFullProtocol(protocols, token) {
  if (!protocols.length) return [];

  const fullProtocols = [];

  for (const protocol of protocols) {
    try {
      const result = await executeAuthQueryObj(
        DatabaseQueries.protocols.getFull(protocol.id),
        token,
      );

      if (result.length === 0) {
        // Protocol exists but has no tasks
        fullProtocols.push({
          ...protocol,
          tasks: [],
        });
        continue;
      }

      // Structure the nested data
      const fullProtocol = {
        id: result[0].protocol_id,
        name: result[0].protocol_name,
        description: result[0].protocol_description,
        is_template: result[0].is_template,
        template_protocol_id: result[0].template_protocol_id,
        created_by: result[0].created_by,
        created_at: result[0].created_at,
        updated_at: result[0].updated_at,
        tasks: [],
      };

      // Group tasks and their relationships
      const tasksMap = new Map();

      result.forEach((row) => {
        if (row.protocol_task_id) {
          if (!tasksMap.has(row.protocol_task_id)) {
            // Build final task properties using overrides if available
            const finalTitle = row.override_title || row.title;
            const finalTime =
              row.override_time !== null ? row.override_time : row.time;
            const finalDescription =
              row.override_description || row.description;
            const finalAdditionalNotes =
              row.override_additional_notes || row.additional_notes;

            tasksMap.set(row.protocol_task_id, {
              protocol_task_id: row.protocol_task_id,
              task_id: row.task_id,
              order_index: row.order_index,
              importance_rating: row.importance_rating,
              notes: row.notes,
              // Final computed values (with overrides applied)
              title: finalTitle,
              time: finalTime,
              description: finalDescription,
              additional_notes: finalAdditionalNotes,
              type: row.type,
              rating: row.rating,
              // Override tracking
              has_title_override: row.override_title !== null,
              has_time_override: row.override_time !== null,
              has_description_override: row.override_description !== null,
              has_notes_override: row.override_additional_notes !== null,
              sensors: [],
              domains: [],
            });
          }

          const task = tasksMap.get(row.protocol_task_id);

          // Add sensors (avoid duplicates)
          if (row.sensor_ids) {
            const sensorIds = row.sensor_ids.split(",");
            const sensorNames = row.sensor_names.split(",");
            const sensorCategories = row.sensor_categories
              ? row.sensor_categories.split(",")
              : [];
            const sensorDescriptions = row.sensor_descriptions
              ? row.sensor_descriptions.split(",")
              : [];

            sensorIds.forEach((sensorId, index) => {
              if (sensorId && !task.sensors.find((s) => s.id === sensorId)) {
                task.sensors.push({
                  id: sensorId,
                  name: sensorNames[index] || sensorId,
                  category: sensorCategories[index] || "Unknown",
                  description: sensorDescriptions[index] || null,
                  is_custom: false,
                  created_by: null,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                });
              }
            });
          }

          // Add domains (avoid duplicates)
          if (row.domain_ids) {
            const domainIds = row.domain_ids.split(",");
            const domainNames = row.domain_names.split(",");
            const domainDescriptions = row.domain_descriptions
              ? row.domain_descriptions.split(",")
              : [];

            domainIds.forEach((domainId, index) => {
              if (domainId && !task.domains.find((d) => d.id === domainId)) {
                task.domains.push({
                  id: domainId,
                  name: domainNames[index] || domainId,
                  description: domainDescriptions[index] || null,
                  is_custom: false,
                  created_by: null,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                });
              }
            });
          }
        }
      });

      // Sort tasks by order and add to protocol
      fullProtocol.tasks = Array.from(tasksMap.values()).sort(
        (a, b) => a.order_index - b.order_index,
      );

      fullProtocols.push(fullProtocol);
    } catch (error) {
      throw error;
    }
  }

  return fullProtocols;
}

// Get all protocols (admin only) or templates
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { templates_only = "false", full = "false" } = req.query;

    let protocols;
    if (templates_only === "true") {
      protocols = await executeAuthQueryObj(
        DatabaseQueries.protocols.getTemplates(),
        req.token,
      );
    } else {
      protocols = await executeAuthQueryObj(
        DatabaseQueries.protocols.getAll(),
        req.token,
      );
    }

    if (full === "true") {
      const fullProtocols = await buildFullProtocol(protocols, req.token);
      res.list(fullProtocols, "Full protocols retrieved successfully");
    } else {
      res.list(protocols, "Protocols retrieved successfully");
    }
  }),
);

// Get user's protocols
router.get(
  "/my",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { full = "false" } = req.query;
    const userContext = getUserContext(req.token);
    const protocols = await executeAuthQueryObj(
      DatabaseQueries.protocols.getByUser(userContext.userId),
      req.token,
    );

    if (full === "true") {
      const fullProtocols = await buildFullProtocol(protocols, req.token);
      res.list(fullProtocols, "Full user protocols retrieved successfully");
    } else {
      res.list(protocols, "User protocols retrieved successfully");
    }
  }),
);

// Search protocols
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

    const protocols = await executeAuthQueryObj(
      DatabaseQueries.protocols.search(term),
      req.token,
    );
    res.list(protocols, `Search results for '${term}' retrieved successfully`);
  }),
);

// Get protocol by ID
router.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
      throw new ValidationError("Protocol ID is required");
    }

    const protocol = await executeAuthQueryOneObj(
      DatabaseQueries.protocols.getById(id),
      req.token,
    );

    if (!protocol) {
      throw new NotFoundError("Protocol");
    }

    res.success(protocol, "Protocol retrieved successfully");
  }),
);

// Get full protocol with tasks and their details
router.get(
  "/:id/full",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
      throw new ValidationError("Protocol ID is required");
    }

    const result = await executeAuthQueryObj(
      DatabaseQueries.protocols.getFull(id),
      req.token,
    );

    if (result.length === 0) {
      throw new NotFoundError("Protocol");
    }

    // Structure the nested data
    const protocol = {
      id: result[0].protocol_id,
      name: result[0].protocol_name,
      description: result[0].protocol_description,
      tasks: [],
    };

    // Group tasks and their relationships
    const tasksMap = new Map();

    result.forEach((row) => {
      if (row.protocol_task_id) {
        if (!tasksMap.has(row.protocol_task_id)) {
          // Build final task properties using overrides if available
          const finalTitle = row.override_title || row.title;
          const finalTime =
            row.override_time !== null ? row.override_time : row.time;
          const finalDescription = row.override_description || row.description;
          const finalAdditionalNotes =
            row.override_additional_notes || row.additional_notes;

          tasksMap.set(row.protocol_task_id, {
            protocol_task_id: row.protocol_task_id,
            task_id: row.task_id,
            order_index: row.order_index,
            importance_rating: row.importance_rating,
            notes: row.notes,
            // Final computed values (with overrides applied)
            title: finalTitle,
            time: finalTime,
            description: finalDescription,
            additional_notes: finalAdditionalNotes,
            type: row.type,
            rating: row.rating,
            // Override tracking
            has_title_override: row.override_title !== null,
            has_time_override: row.override_time !== null,
            has_description_override: row.override_description !== null,
            has_notes_override: row.override_additional_notes !== null,
            sensors: [],
            domains: [],
          });
        }

        const task = tasksMap.get(row.protocol_task_id);

        // Add sensors (avoid duplicates)
        if (row.sensor_ids) {
          const sensorIds = row.sensor_ids.split(",");
          const sensorNames = row.sensor_names.split(",");

          sensorIds.forEach((sensorId, index) => {
            if (sensorId && !task.sensors.find((s) => s.id === sensorId)) {
              task.sensors.push({
                id: sensorId,
                name: sensorNames[index] || sensorId,
              });
            }
          });
        }

        // Add domains (avoid duplicates)
        if (row.domain_ids) {
          const domainIds = row.domain_ids.split(",");
          const domainNames = row.domain_names.split(",");

          domainIds.forEach((domainId, index) => {
            if (domainId && !task.domains.find((d) => d.id === domainId)) {
              task.domains.push({
                id: domainId,
                name: domainNames[index] || domainId,
              });
            }
          });
        }
      }
    });

    // Sort tasks by order and add to protocol
    protocol.tasks = Array.from(tasksMap.values()).sort(
      (a, b) => a.order_index - b.order_index,
    );

    res.success(protocol, "Full protocol retrieved successfully");
  }),
);

// Get protocol tasks
router.get(
  "/:id/tasks",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
      throw new ValidationError("Protocol ID is required");
    }

    const tasks = await executeAuthQueryObj(
      DatabaseQueries.protocolTasks.getByProtocol(id),
      req.token,
    );
    res.list(tasks, "Protocol tasks retrieved successfully");
  }),
);

// Create new protocol
router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const {
      name,
      description,
      is_template = false,
      template_protocol_id,
    } = req.body;
    const userContext = getUserContext(req.token);

    // Validation
    const errors = [];

    if (!name?.trim()) {
      errors.push({
        field: "name",
        message: "Protocol name is required and cannot be empty",
      });
    }
    if (name && name.length < 2) {
      errors.push({
        field: "name",
        message: "Protocol name must be at least 2 characters long",
      });
    }
    if (name && name.length > 100) {
      errors.push({
        field: "name",
        message: "Protocol name must be less than 100 characters",
      });
    }
    if (description && description.length > 500) {
      errors.push({
        field: "description",
        message: "Description must be less than 500 characters",
      });
    }

    if (errors.length > 0) {
      throw new ValidationError("Protocol validation failed", { errors });
    }

    // Check if protocol with same name already exists for user
    const existing = await executeAuthQueryOneObj(
      DatabaseQueries.protocols.getByName(name.trim(), userContext.userId),
      req.token,
    );

    if (existing) {
      throw new ConflictError("Protocol with this name already exists", {
        field: "name",
        value: name,
        details: "Each user can only have one protocol with a given name",
      });
    }

    const protocolId = generateUUID();

    try {
      await executeAuthInsertObj(
        DatabaseQueries.protocols.create(
          protocolId,
          name.trim(),
          description?.trim() || null,
          is_template,
          template_protocol_id || null,
          userContext.userId,
        ),
        req.token,
      );

      // If creating from template, copy tasks
      if (template_protocol_id) {
        await copyProtocolTasks(template_protocol_id, protocolId, req.token);
      }
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        throw new ConflictError("Protocol with this name already exists", {
          field: "name",
          value: name,
        });
      }
      throw new DatabaseError("Failed to create protocol");
    }

    // Return the created protocol
    const createdProtocol = await executeAuthQueryOneObj(
      DatabaseQueries.protocols.getById(protocolId),
      req.token,
    );
    res.created(createdProtocol, "Protocol created successfully");
  }),
);

// Helper function to copy tasks from template protocol
async function copyProtocolTasks(templateProtocolId, newProtocolId, token) {
  // Get template protocol tasks
  const templateTasks = await executeAuthQueryObj(
    DatabaseQueries.protocolTasks.getByProtocol(templateProtocolId),
    token,
  );

  for (const templateTask of templateTasks) {
    const newProtocolTaskId = generateUUID();

    // Create protocol task
    await executeAuthInsertObj(
      DatabaseQueries.protocolTasks.create(
        newProtocolTaskId,
        newProtocolId,
        templateTask.task_id,
        templateTask.order_index,
        templateTask.importance_rating,
        templateTask.notes,
      ),
      token,
    );

    // Copy sensors
    await executeAuthInsertObj(
      DatabaseQueries.protocolTaskSensors.copyFromTask(
        newProtocolTaskId,
        templateTask.task_id,
      ),
      token,
    );

    // Copy domains
    await executeAuthInsertObj(
      DatabaseQueries.protocolTaskDomains.copyFromTask(
        newProtocolTaskId,
        templateTask.task_id,
      ),
      token,
    );
  }
}

// Update protocol
router.put(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;
    const userContext = getUserContext(req.token);

    if (!id) {
      throw new ValidationError("Protocol ID is required");
    }

    // Validation
    const errors = [];

    if (!name?.trim()) {
      errors.push({
        field: "name",
        message: "Protocol name is required and cannot be empty",
      });
    }
    if (name && name.length < 2) {
      errors.push({
        field: "name",
        message: "Protocol name must be at least 2 characters long",
      });
    }
    if (name && name.length > 100) {
      errors.push({
        field: "name",
        message: "Protocol name must be less than 100 characters",
      });
    }
    if (description && description.length > 500) {
      errors.push({
        field: "description",
        message: "Description must be less than 500 characters",
      });
    }

    if (errors.length > 0) {
      throw new ValidationError("Protocol validation failed", { errors });
    }

    // Check if protocol exists and user owns it
    const existingProtocol = await executeAuthQueryOneObj(
      DatabaseQueries.protocols.getById(id),
      req.token,
    );
    if (!existingProtocol) {
      throw new NotFoundError("Protocol");
    }
    if (existingProtocol.created_by !== userContext.userId) {
      throw new AuthorizationError("You can only update your own protocols");
    }

    // Check if another protocol with same name exists for the user
    const duplicate = await executeAuthQueryOneObj(
      DatabaseQueries.protocols.getByName(name.trim(), userContext.userId),
      req.token,
    );

    if (duplicate && duplicate.id !== id) {
      throw new ConflictError(
        "Another protocol with this name already exists",
        {
          field: "name",
          value: name,
          details: "Each user can only have one protocol with a given name",
        },
      );
    }

    try {
      const affectedRows = await executeAuthUpdateObj(
        DatabaseQueries.protocols.update(
          id,
          name.trim(),
          description?.trim() || null,
        ),
        req.token,
      );

      if (affectedRows === 0) {
        throw new NotFoundError("Protocol");
      }
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        throw new ConflictError("Protocol with this name already exists", {
          field: "name",
          value: name,
        });
      }
      throw error;
    }

    // Return updated protocol
    const updatedProtocol = await executeAuthQueryOneObj(
      DatabaseQueries.protocols.getById(id),
      req.token,
    );
    res.success(updatedProtocol, "Protocol updated successfully");
  }),
);

// Delete protocol
router.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userContext = getUserContext(req.token);

    if (!id) {
      throw new ValidationError("Protocol ID is required");
    }

    // Check if protocol exists and user owns it
    const existingProtocol = await executeAuthQueryOneObj(
      DatabaseQueries.protocols.getById(id),
      req.token,
    );
    if (!existingProtocol) {
      throw new NotFoundError("Protocol");
    }
    if (existingProtocol.created_by !== userContext.userId) {
      throw new AuthorizationError("You can only delete your own protocols");
    }

    try {
      const affectedRows = await executeAuthUpdateObj(
        DatabaseQueries.protocols.delete(id),
        req.token,
      );

      if (affectedRows === 0) {
        throw new NotFoundError("Protocol");
      }
    } catch (error) {
      throw new DatabaseError("Failed to delete protocol");
    }

    res.success(null, "Protocol deleted successfully");
  }),
);

// Add task to protocol
router.post(
  "/:id/tasks/:taskId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id: protocolId, taskId } = req.params;
    const {
      order_index,
      importance_rating,
      notes,
      copy_defaults = true,
    } = req.body;
    const userContext = getUserContext(req.token);

    if (!protocolId || !taskId) {
      throw new ValidationError("Protocol ID and Task ID are required");
    }

    // Validation
    const errors = [];

    if (order_index !== undefined && (isNaN(order_index) || order_index < 0)) {
      errors.push({
        field: "order_index",
        message: "Order index must be a non-negative number",
      });
    }

    if (
      importance_rating !== undefined &&
      (isNaN(importance_rating) ||
        importance_rating < 0 ||
        importance_rating > 10)
    ) {
      errors.push({
        field: "importance_rating",
        message: "Importance rating must be between 0 and 10",
      });
    }

    if (errors.length > 0) {
      throw new ValidationError("Task assignment validation failed", {
        errors,
      });
    }

    // Check if protocol exists and user owns it
    const protocol = await executeAuthQueryOneObj(
      DatabaseQueries.protocols.getById(protocolId),
      req.token,
    );
    if (!protocol) {
      throw new NotFoundError("Protocol");
    }
    if (protocol.created_by !== userContext.userId) {
      throw new AuthorizationError("You can only modify your own protocols");
    }

    // Check if task exists
    const task = await executeAuthQueryOneObj(
      DatabaseQueries.tasks.getById(taskId),
      req.token,
    );
    if (!task) {
      throw new NotFoundError("Task");
    }

    // Get next order index if not provided
    let finalOrderIndex = order_index;
    if (finalOrderIndex === undefined || finalOrderIndex === null) {
      const maxOrderResult = await executeAuthQueryOneObj(
        DatabaseQueries.protocolTasks.getMaxOrder(protocolId),
        req.token,
      );
      finalOrderIndex = (maxOrderResult?.max_order || -1) + 1;
    }

    const protocolTaskId = generateUUID();

    try {
      // Create protocol task
      await executeAuthInsertObj(
        DatabaseQueries.protocolTasks.create(
          protocolTaskId,
          protocolId,
          taskId,
          finalOrderIndex,
          importance_rating || null,
          notes || null,
        ),
        req.token,
      );

      // Copy default relationships if requested
      if (copy_defaults) {
        await executeAuthInsertObj(
          DatabaseQueries.protocolTaskSensors.copyFromTask(
            protocolTaskId,
            taskId,
          ),
          req.token,
        );

        await executeAuthInsertObj(
          DatabaseQueries.protocolTaskDomains.copyFromTask(
            protocolTaskId,
            taskId,
          ),
          req.token,
        );
      }
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        throw new ConflictError("Task is already added to this protocol");
      }
      throw new DatabaseError("Failed to add task to protocol");
    }

    res.success(
      { protocol_task_id: protocolTaskId },
      "Task added to protocol successfully",
    );
  }),
);

// Remove task from protocol
router.delete(
  "/:id/tasks/:taskId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id: protocolId, taskId } = req.params;
    const userContext = getUserContext(req.token);

    if (!protocolId || !taskId) {
      throw new ValidationError("Protocol ID and Task ID are required");
    }

    // Check if protocol exists and user owns it
    const protocol = await executeAuthQueryOneObj(
      DatabaseQueries.protocols.getById(protocolId),
      req.token,
    );
    if (!protocol) {
      throw new NotFoundError("Protocol");
    }
    if (protocol.created_by !== userContext.userId) {
      throw new AuthorizationError("You can only modify your own protocols");
    }

    // Find the protocol task to delete
    const protocolTasks = await executeAuthQueryObj(
      DatabaseQueries.protocolTasks.getByProtocol(protocolId),
      req.token,
    );

    const protocolTask = protocolTasks.find((pt) => pt.task_id === taskId);
    if (!protocolTask) {
      throw new NotFoundError("Task not found in protocol");
    }

    const affectedRows = await executeAuthUpdateObj(
      DatabaseQueries.protocolTasks.delete(protocolTask.id),
      req.token,
    );

    if (affectedRows === 0) {
      throw new NotFoundError("Task not found in protocol");
    }

    res.success(null, "Task removed from protocol successfully");
  }),
);

// Update task order in protocol
router.put(
  "/:id/tasks/:taskId/order",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id: protocolId, taskId } = req.params;
    const { order_index } = req.body;
    const userContext = getUserContext(req.token);

    if (!protocolId || !taskId) {
      throw new ValidationError("Protocol ID and Task ID are required");
    }

    // Validation
    const errors = [];

    if (order_index === undefined || isNaN(order_index) || order_index < 0) {
      errors.push({
        field: "order_index",
        message: "Order index must be a non-negative number",
      });
    }

    if (errors.length > 0) {
      throw new ValidationError("Task order update validation failed", {
        errors,
      });
    }

    // Check if protocol exists and user owns it
    const protocol = await executeAuthQueryOneObj(
      DatabaseQueries.protocols.getById(protocolId),
      req.token,
    );
    if (!protocol) {
      throw new NotFoundError("Protocol");
    }
    if (protocol.created_by !== userContext.userId) {
      throw new AuthorizationError("You can only modify your own protocols");
    }

    // Find the protocol task
    const protocolTasks = await executeAuthQueryObj(
      DatabaseQueries.protocolTasks.getByProtocol(protocolId),
      req.token,
    );

    const protocolTask = protocolTasks.find((pt) => pt.task_id === taskId);
    if (!protocolTask) {
      throw new NotFoundError("Task not found in protocol");
    }

    try {
      // Update the task order
      await executeAuthUpdateObj(
        DatabaseQueries.protocolTasks.updateOrder(protocolTask.id, order_index),
        req.token,
      );

      res.success(null, "Task order updated successfully");
    } catch (error) {
      throw new DatabaseError("Failed to update task order");
    }
  }),
);

// Bulk update task orders in protocol
router.put(
  "/:id/tasks/reorder",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id: protocolId } = req.params;
    const { task_orders } = req.body; // Array of {task_id, order_index}
    const userContext = getUserContext(req.token);

    if (!protocolId) {
      throw new ValidationError("Protocol ID is required");
    }

    if (!Array.isArray(task_orders) || task_orders.length === 0) {
      throw new ValidationError("task_orders must be a non-empty array");
    }

    // Validation
    const errors = [];

    task_orders.forEach((item, index) => {
      if (!item.task_id) {
        errors.push({
          field: `task_orders[${index}].task_id`,
          message: "Task ID is required",
        });
      }
      if (
        item.order_index === undefined ||
        isNaN(item.order_index) ||
        item.order_index < 0
      ) {
        errors.push({
          field: `task_orders[${index}].order_index`,
          message: "Order index must be a non-negative number",
        });
      }
    });

    if (errors.length > 0) {
      throw new ValidationError("Task reorder validation failed", { errors });
    }

    // Check if protocol exists and user owns it
    const protocol = await executeAuthQueryOneObj(
      DatabaseQueries.protocols.getById(protocolId),
      req.token,
    );
    if (!protocol) {
      throw new NotFoundError("Protocol");
    }
    if (protocol.created_by !== userContext.userId) {
      throw new AuthorizationError("You can only modify your own protocols");
    }

    // Get all protocol tasks
    const protocolTasks = await executeAuthQueryObj(
      DatabaseQueries.protocolTasks.getByProtocol(protocolId),
      req.token,
    );

    // Build updates array with protocol_task_id and order_index
    const updates = [];
    for (const taskOrder of task_orders) {
      const protocolTask = protocolTasks.find(
        (pt) => pt.task_id === taskOrder.task_id,
      );
      if (protocolTask) {
        updates.push({
          id: protocolTask.id,
          orderIndex: taskOrder.order_index,
        });
      }
    }

    if (updates.length === 0) {
      throw new ValidationError("No valid tasks found to reorder");
    }

    try {
      // Perform bulk update
      if (updates.length === 1) {
        // Single update
        await executeAuthUpdateObj(
          DatabaseQueries.protocolTasks.updateOrder(
            updates[0].id,
            updates[0].orderIndex,
          ),
          req.token,
        );
      } else {
        // Bulk update
        await executeAuthUpdateObj(
          DatabaseQueries.protocolTasks.updateOrders(updates),
          req.token,
        );
      }

      res.success(null, "Task orders updated successfully");
    } catch (error) {
      throw new DatabaseError("Failed to update task orders");
    }
  }),
);

module.exports = router;
