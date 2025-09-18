// Database query functions for the new schema
// Uses parameterized queries for security and maintainability

class DatabaseQueries {
  // ==================== USERS ====================

  static users = {
    getAll: () => ({
      query: `SELECT id, username, email, created_at, updated_at FROM access_passwords ORDER BY created_at DESC`,
      params: [],
    }),

    getById: (userId) => ({
      query: `SELECT id, username, email, created_at, updated_at FROM access_passwords WHERE id = ?`,
      params: [userId],
    }),

    getByUsername: (username) => ({
      query: `SELECT id, username, email, password_hash FROM access_passwords WHERE username = ?`,
      params: [username],
    }),

    getByEmail: (email) => ({
      query: `SELECT id, username, email, password_hash FROM access_passwords WHERE email = ?`,
      params: [email],
    }),

    create: (username, email, passwordHash) => ({
      query: `INSERT INTO access_passwords (username, email, password_hash) VALUES (?, ?, ?)`,
      params: [username, email, passwordHash],
    }),

    update: (userId, username, email) => ({
      query: `UPDATE access_passwords SET username = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      params: [username, email, userId],
    }),

    updatePassword: (userId, passwordHash) => ({
      query: `UPDATE access_passwords SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      params: [passwordHash, userId],
    }),

    delete: (userId) => ({
      query: `DELETE FROM access_passwords WHERE id = ?`,
      params: [userId],
    }),
  };

  // ==================== TOKENS ====================

  static tokens = {
    getByValue: (token) => ({
      query: `SELECT * FROM access_tokens WHERE token = ? AND expires_at > NOW()`,
      params: [token],
    }),

    getByUserId: (userId) => ({
      query: `SELECT * FROM access_tokens WHERE user_id = ? ORDER BY created_at DESC`,
      params: [userId],
    }),

    create: (userId, token, expiresAt) => ({
      query: `INSERT INTO access_tokens (user_id, token, expires_at) VALUES (?, ?, ?)`,
      params: [userId, token, expiresAt],
    }),

    delete: (token) => ({
      query: `DELETE FROM access_tokens WHERE token = ?`,
      params: [token],
    }),

    deleteExpired: () => ({
      query: `DELETE FROM access_tokens WHERE expires_at <= NOW()`,
      params: [],
    }),

    deleteByUserId: (userId) => ({
      query: `DELETE FROM access_tokens WHERE user_id = ?`,
      params: [userId],
    }),
  };

  // ==================== SENSORS ====================

  static sensors = {
    getAll: () => ({
      query: `SELECT * FROM sensors ORDER BY category, name`,
      params: [],
    }),

    getById: (sensorId) => ({
      query: `SELECT * FROM sensors WHERE id = ?`,
      params: [sensorId],
    }),

    getByCategory: (category) => ({
      query: `SELECT * FROM sensors WHERE category = ? ORDER BY name`,
      params: [category],
    }),

    getPublic: () => ({
      query: `SELECT * FROM sensors WHERE is_custom = FALSE ORDER BY category, name`,
      params: [],
    }),

    getByUser: (userId) => ({
      query: `SELECT * FROM sensors WHERE created_by = ? ORDER BY name`,
      params: [userId],
    }),

    create: (id, name, category, description, isCustom, createdBy) => ({
      query: `INSERT INTO sensors (id, name, category, description, is_custom, created_by) VALUES (?, ?, ?, ?, ?, ?)`,
      params: [id, name, category, description, isCustom, createdBy],
    }),

    update: (sensorId, name, category, description) => ({
      query: `UPDATE sensors SET name = ?, category = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      params: [name, category, description, sensorId],
    }),

    delete: (sensorId) => ({
      query: `DELETE FROM sensors WHERE id = ?`,
      params: [sensorId],
    }),

    search: (searchTerm) => ({
      query: `SELECT * FROM sensors WHERE name LIKE ? OR category LIKE ? OR description LIKE ? ORDER BY name`,
      params: [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`],
    }),
  };

  // ==================== DOMAINS ====================

  static domains = {
    getAll: () => ({
      query: `SELECT * FROM domains ORDER BY name`,
      params: [],
    }),

    getById: (domainId) => ({
      query: `SELECT * FROM domains WHERE id = ?`,
      params: [domainId],
    }),

    getPublic: () => ({
      query: `SELECT * FROM domains WHERE is_custom = FALSE ORDER BY name`,
      params: [],
    }),

    getByUser: (userId) => ({
      query: `SELECT * FROM domains WHERE created_by = ? ORDER BY name`,
      params: [userId],
    }),

    create: (id, name, description, isCustom, createdBy) => ({
      query: `INSERT INTO domains (id, name, description, is_custom, created_by) VALUES (?, ?, ?, ?, ?)`,
      params: [id, name, description, isCustom, createdBy],
    }),

    update: (domainId, name, description) => ({
      query: `UPDATE domains SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      params: [name, description, domainId],
    }),

    delete: (domainId) => ({
      query: `DELETE FROM domains WHERE id = ?`,
      params: [domainId],
    }),
  };

  // ==================== TASKS ====================

  static tasks = {
    getAll: () => ({
      query: `SELECT * FROM tasks WHERE enabled = TRUE ORDER BY title`,
      params: [],
    }),

    getById: (taskId) => ({
      query: `SELECT * FROM tasks WHERE id = ?`,
      params: [taskId],
    }),

    getByType: (type) => ({
      query: `SELECT * FROM tasks WHERE type = ? AND enabled = TRUE ORDER BY title`,
      params: [type],
    }),

    getPublic: () => ({
      query: `SELECT * FROM tasks WHERE is_custom = FALSE AND enabled = TRUE ORDER BY title`,
      params: [],
    }),

    getByUser: (userId) => ({
      query: `SELECT * FROM tasks WHERE created_by = ? ORDER BY title`,
      params: [userId],
    }),

    create: (
      id,
      title,
      time,
      rating,
      description,
      additionalNotes,
      type,
      isCustom,
      createdBy,
    ) => ({
      query: `INSERT INTO tasks (id, title, time, rating, description, additional_notes, type, is_custom, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        id,
        title,
        time,
        rating,
        description,
        additionalNotes,
        type,
        isCustom,
        createdBy,
      ],
    }),

    update: (
      taskId,
      title,
      time,
      rating,
      description,
      additionalNotes,
      enabled,
    ) => ({
      query: `UPDATE tasks SET title = ?, time = ?, rating = ?, description = ?, additional_notes = ?, enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      params: [
        title,
        time,
        rating,
        description,
        additionalNotes,
        enabled,
        taskId,
      ],
    }),

    delete: (taskId) => ({
      query: `DELETE FROM tasks WHERE id = ?`,
      params: [taskId],
    }),

    // Get task with its default sensors and domains
    getWithRelations: (taskId) => ({
      query: `
        SELECT
          t.*,
          GROUP_CONCAT(DISTINCT s.id) as sensor_ids,
          GROUP_CONCAT(DISTINCT s.name) as sensor_names,
          GROUP_CONCAT(DISTINCT d.id) as domain_ids,
          GROUP_CONCAT(DISTINCT d.name) as domain_names
        FROM tasks t
        LEFT JOIN task_sensors ts ON t.id = ts.task_id
        LEFT JOIN sensors s ON ts.sensor_id = s.id
        LEFT JOIN task_domains td ON t.id = td.task_id
        LEFT JOIN domains d ON td.domain_id = d.id
        WHERE t.id = ?
        GROUP BY t.id
      `,
      params: [taskId],
    }),

    search: (searchTerm) => ({
      query: `SELECT * FROM tasks WHERE (title LIKE ? OR description LIKE ?) AND enabled = TRUE ORDER BY title`,
      params: [`%${searchTerm}%`, `%${searchTerm}%`],
    }),
  };

  // ==================== PROTOCOLS ====================

  static protocols = {
    getAll: () => ({
      query: `SELECT * FROM protocols ORDER BY created_at DESC`,
      params: [],
    }),

    getById: (protocolId) => ({
      query: `SELECT * FROM protocols WHERE id = ?`,
      params: [protocolId],
    }),

    getByUser: (userId) => ({
      query: `SELECT * FROM protocols WHERE created_by = ? ORDER BY created_at DESC`,
      params: [userId],
    }),

    getTemplates: () => ({
      query: `SELECT * FROM protocols WHERE is_template = TRUE ORDER BY name`,
      params: [],
    }),

    getByName: (name, userId) => ({
      query: `SELECT * FROM protocols WHERE name = ? AND created_by = ?`,
      params: [name, userId],
    }),

    create: (
      id,
      name,
      description,
      isTemplate,
      templateProtocolId,
      createdBy,
    ) => ({
      query: `INSERT INTO protocols (id, name, description, is_template, template_protocol_id, created_by) VALUES (?, ?, ?, ?, ?, ?)`,
      params: [
        id,
        name,
        description,
        isTemplate,
        templateProtocolId,
        createdBy,
      ],
    }),

    update: (protocolId, name, description) => ({
      query: `UPDATE protocols SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      params: [name, description, protocolId],
    }),

    delete: (protocolId) => ({
      query: `DELETE FROM protocols WHERE id = ?`,
      params: [protocolId],
    }),

    // Get protocol with all tasks and their details
    getFull: (protocolId) => ({
      query: `
        SELECT
          p.id as protocol_id, p.name as protocol_name, p.description as protocol_description,
          pt.id as protocol_task_id, pt.order_index, pt.importance_rating, pt.notes,
          pt.override_title, pt.override_time, pt.override_description, pt.override_additional_notes,
          t.id as task_id, t.title, t.time, t.rating, t.description, t.additional_notes, t.type,
          GROUP_CONCAT(DISTINCT s.id) as sensor_ids,
          GROUP_CONCAT(DISTINCT s.name) as sensor_names,
          GROUP_CONCAT(DISTINCT d.id) as domain_ids,
          GROUP_CONCAT(DISTINCT d.name) as domain_names
        FROM protocols p
        LEFT JOIN protocol_tasks pt ON p.id = pt.protocol_id
        LEFT JOIN tasks t ON pt.task_id = t.id
        LEFT JOIN protocol_task_sensors pts ON pt.id = pts.protocol_task_id
        LEFT JOIN sensors s ON pts.sensor_id = s.id
        LEFT JOIN protocol_task_domains ptd ON pt.id = ptd.protocol_task_id
        LEFT JOIN domains d ON ptd.domain_id = d.id
        WHERE p.id = ?
        GROUP BY p.id, pt.id, t.id
        ORDER BY pt.order_index
      `,
      params: [protocolId],
    }),

    search: (searchTerm) => ({
      query: `SELECT * FROM protocols WHERE name LIKE ? OR description LIKE ? ORDER BY name`,
      params: [`%${searchTerm}%`, `%${searchTerm}%`],
    }),
  };

  // ==================== PROTOCOL TASKS ====================

  static protocolTasks = {
    getByProtocol: (protocolId) => ({
      query: `
        SELECT pt.*, t.title, t.time, t.description, t.additional_notes, t.type, t.rating
        FROM protocol_tasks pt
        JOIN tasks t ON pt.task_id = t.id
        WHERE pt.protocol_id = ?
        ORDER BY pt.order_index
      `,
      params: [protocolId],
    }),

    getById: (protocolTaskId) => ({
      query: `
        SELECT pt.*, t.title, t.time, t.description, t.additional_notes, t.type, t.rating
        FROM protocol_tasks pt
        JOIN tasks t ON pt.task_id = t.id
        WHERE pt.id = ?
      `,
      params: [protocolTaskId],
    }),

    create: (id, protocolId, taskId, orderIndex, importanceRating, notes) => ({
      query: `INSERT INTO protocol_tasks (id, protocol_id, task_id, order_index, importance_rating, notes) VALUES (?, ?, ?, ?, ?, ?)`,
      params: [id, protocolId, taskId, orderIndex, importanceRating, notes],
    }),

    update: (
      protocolTaskId,
      orderIndex,
      importanceRating,
      notes,
      overrideTitle,
      overrideTime,
      overrideDescription,
      overrideAdditionalNotes,
    ) => ({
      query: `
        UPDATE protocol_tasks
        SET order_index = ?, importance_rating = ?, notes = ?,
            override_title = ?, override_time = ?, override_description = ?, override_additional_notes = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      params: [
        orderIndex,
        importanceRating,
        notes,
        overrideTitle,
        overrideTime,
        overrideDescription,
        overrideAdditionalNotes,
        protocolTaskId,
      ],
    }),

    updateOrder: (protocolTaskId, orderIndex) => ({
      query: `UPDATE protocol_tasks SET order_index = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      params: [orderIndex, protocolTaskId],
    }),

    delete: (protocolTaskId) => ({
      query: `DELETE FROM protocol_tasks WHERE id = ?`,
      params: [protocolTaskId],
    }),

    // Bulk update orders for resequencing
    updateOrders: (updates) => ({
      query: `UPDATE protocol_tasks SET order_index = CASE id ${updates.map(() => "WHEN ? THEN ?").join(" ")} END WHERE id IN (${updates.map(() => "?").join(",")})`,
      params: [
        ...updates.flatMap((u) => [u.id, u.orderIndex]),
        ...updates.map((u) => u.id),
      ],
    }),

    // Get max order for a protocol
    getMaxOrder: (protocolId) => ({
      query: `SELECT COALESCE(MAX(order_index), 0) as max_order FROM protocol_tasks WHERE protocol_id = ?`,
      params: [protocolId],
    }),
  };

  // ==================== TASK RELATIONSHIPS ====================

  static taskSensors = {
    getByTask: (taskId) => ({
      query: `
        SELECT s.* FROM sensors s
        JOIN task_sensors ts ON s.id = ts.sensor_id
        WHERE ts.task_id = ?
        ORDER BY s.name
      `,
      params: [taskId],
    }),

    add: (taskId, sensorId) => ({
      query: `INSERT IGNORE INTO task_sensors (task_id, sensor_id) VALUES (?, ?)`,
      params: [taskId, sensorId],
    }),

    remove: (taskId, sensorId) => ({
      query: `DELETE FROM task_sensors WHERE task_id = ? AND sensor_id = ?`,
      params: [taskId, sensorId],
    }),

    removeAll: (taskId) => ({
      query: `DELETE FROM task_sensors WHERE task_id = ?`,
      params: [taskId],
    }),
  };

  static taskDomains = {
    getByTask: (taskId) => ({
      query: `
        SELECT d.* FROM domains d
        JOIN task_domains td ON d.id = td.domain_id
        WHERE td.task_id = ?
        ORDER BY d.name
      `,
      params: [taskId],
    }),

    add: (taskId, domainId) => ({
      query: `INSERT IGNORE INTO task_domains (task_id, domain_id) VALUES (?, ?)`,
      params: [taskId, domainId],
    }),

    remove: (taskId, domainId) => ({
      query: `DELETE FROM task_domains WHERE task_id = ? AND domain_id = ?`,
      params: [taskId, domainId],
    }),

    removeAll: (taskId) => ({
      query: `DELETE FROM task_domains WHERE task_id = ?`,
      params: [taskId],
    }),
  };

  // ==================== PROTOCOL TASK RELATIONSHIPS ====================

  static protocolTaskSensors = {
    getByProtocolTask: (protocolTaskId) => ({
      query: `
        SELECT s.* FROM sensors s
        JOIN protocol_task_sensors pts ON s.id = pts.sensor_id
        WHERE pts.protocol_task_id = ?
        ORDER BY s.name
      `,
      params: [protocolTaskId],
    }),

    add: (protocolTaskId, sensorId) => ({
      query: `INSERT IGNORE INTO protocol_task_sensors (protocol_task_id, sensor_id) VALUES (?, ?)`,
      params: [protocolTaskId, sensorId],
    }),

    remove: (protocolTaskId, sensorId) => ({
      query: `DELETE FROM protocol_task_sensors WHERE protocol_task_id = ? AND sensor_id = ?`,
      params: [protocolTaskId, sensorId],
    }),

    removeAll: (protocolTaskId) => ({
      query: `DELETE FROM protocol_task_sensors WHERE protocol_task_id = ?`,
      params: [protocolTaskId],
    }),

    // Copy from default task sensors
    copyFromTask: (protocolTaskId, taskId) => ({
      query: `
        INSERT IGNORE INTO protocol_task_sensors (protocol_task_id, sensor_id)
        SELECT ?, sensor_id FROM task_sensors WHERE task_id = ?
      `,
      params: [protocolTaskId, taskId],
    }),
  };

  static protocolTaskDomains = {
    getByProtocolTask: (protocolTaskId) => ({
      query: `
        SELECT d.* FROM domains d
        JOIN protocol_task_domains ptd ON d.id = ptd.domain_id
        WHERE ptd.protocol_task_id = ?
        ORDER BY d.name
      `,
      params: [protocolTaskId],
    }),

    add: (protocolTaskId, domainId) => ({
      query: `INSERT IGNORE INTO protocol_task_domains (protocol_task_id, domain_id) VALUES (?, ?)`,
      params: [protocolTaskId, domainId],
    }),

    remove: (protocolTaskId, domainId) => ({
      query: `DELETE FROM protocol_task_domains WHERE protocol_task_id = ? AND domain_id = ?`,
      params: [protocolTaskId, domainId],
    }),

    removeAll: (protocolTaskId) => ({
      query: `DELETE FROM protocol_task_domains WHERE protocol_task_id = ?`,
      params: [protocolTaskId],
    }),

    // Copy from default task domains
    copyFromTask: (protocolTaskId, taskId) => ({
      query: `
        INSERT IGNORE INTO protocol_task_domains (protocol_task_id, domain_id)
        SELECT ?, domain_id FROM task_domains WHERE task_id = ?
      `,
      params: [protocolTaskId, taskId],
    }),
  };

  // ==================== COMPONENT USAGE ====================

  static componentUsage = {
    getByUser: (userId) => ({
      query: `SELECT * FROM component_usage WHERE user_id = ? ORDER BY last_used DESC`,
      params: [userId],
    }),

    getByType: (userId, componentType) => ({
      query: `SELECT * FROM component_usage WHERE user_id = ? AND component_type = ? ORDER BY use_count DESC, last_used DESC`,
      params: [userId, componentType],
    }),

    getMostUsed: (userId, limit = 10) => ({
      query: `SELECT * FROM component_usage WHERE user_id = ? ORDER BY use_count DESC, last_used DESC LIMIT ?`,
      params: [userId, limit],
    }),

    increment: (id, userId, componentType, componentId) => ({
      query: `
        INSERT INTO component_usage (id, user_id, component_type, component_id, use_count, last_used)
        VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
        ON DUPLICATE KEY UPDATE use_count = use_count + 1, last_used = CURRENT_TIMESTAMP
      `,
      params: [id, userId, componentType, componentId],
    }),

    reset: (userId, componentType, componentId) => ({
      query: `DELETE FROM component_usage WHERE user_id = ? AND component_type = ? AND component_id = ?`,
      params: [userId, componentType, componentId],
    }),

    resetAll: (userId) => ({
      query: `DELETE FROM component_usage WHERE user_id = ?`,
      params: [userId],
    }),
  };

  // ==================== MODIFICATION TRACKING ====================

  static modifications = {
    create: (
      id,
      userId,
      protocolTaskId,
      fieldName,
      originalValue,
      modifiedValue,
    ) => ({
      query: `INSERT INTO modification_tracking (id, user_id, protocol_task_id, field_name, original_value, modified_value) VALUES (?, ?, ?, ?, ?, ?)`,
      params: [
        id,
        userId,
        protocolTaskId,
        fieldName,
        originalValue,
        modifiedValue,
      ],
    }),

    getByUser: (userId) => ({
      query: `SELECT * FROM modification_tracking WHERE user_id = ? ORDER BY created_at DESC`,
      params: [userId],
    }),

    getByProtocolTask: (protocolTaskId) => ({
      query: `SELECT * FROM modification_tracking WHERE protocol_task_id = ? ORDER BY created_at DESC`,
      params: [protocolTaskId],
    }),

    delete: (modificationId) => ({
      query: `DELETE FROM modification_tracking WHERE id = ?`,
      params: [modificationId],
    }),
  };
}

module.exports = DatabaseQueries;
