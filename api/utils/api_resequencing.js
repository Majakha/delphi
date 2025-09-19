// API-level order resequencing logic examples
// This demonstrates how to handle task ordering in the application layer

class ProtocolTaskOrderManager {
  constructor(database) {
    this.db = database;
  }

  /**
   * Insert task at specific position, shifting existing tasks
   */
  async insertTaskAtPosition(protocolId, taskId, position, options = {}) {
    const transaction = await this.db.beginTransaction();

    try {
      // Validate inputs
      await this.validateTaskInsertion(protocolId, taskId, position);

      // Shift existing tasks at and after position
      await this.db.query(`
        UPDATE protocol_tasks
        SET order_index = order_index + 1
        WHERE protocol_id = ? AND order_index >= ?
      `, [protocolId, position]);

      // Generate new protocol task ID
      const protocolTaskId = this.generateId();

      // Insert new task
      await this.db.query(`
        INSERT INTO protocol_tasks
        (id, protocol_id, task_id, order_index, importance_rating, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        protocolTaskId,
        protocolId,
        taskId,
        position,
        options.importanceRating || null,
        options.notes || null
      ]);

      // Copy default sensor associations if requested
      if (options.copyDefaultSensors !== false) {
        await this.copyDefaultSensors(protocolTaskId, taskId);
      }

      // Copy default domain associations if requested
      if (options.copyDefaultDomains !== false) {
        await this.copyDefaultDomains(protocolTaskId, taskId);
      }

      await transaction.commit();

      return {
        protocolTaskId,
        message: `Task inserted at position ${position}`
      };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Move task from current position to new position
   */
  async moveTaskPosition(protocolId, taskId, newPosition) {
    const transaction = await this.db.beginTransaction();

    try {
      // Get current task info
      const [task] = await this.db.query(`
        SELECT id, order_index
        FROM protocol_tasks
        WHERE protocol_id = ? AND task_id = ?
      `, [protocolId, taskId]);

      if (!task) {
        throw new Error('Task not found in protocol');
      }

      const currentPosition = task.order_index;

      if (currentPosition === newPosition) {
        return { message: 'Task is already at the specified position' };
      }

      // Validate new position
      const [{ taskCount }] = await this.db.query(`
        SELECT COUNT(*) as taskCount
        FROM protocol_tasks
        WHERE protocol_id = ?
      `, [protocolId]);

      if (newPosition < 1 || newPosition > taskCount) {
        throw new Error(`Invalid position. Must be between 1 and ${taskCount}`);
      }

      if (currentPosition < newPosition) {
        // Moving down: shift intermediate tasks up
        await this.db.query(`
          UPDATE protocol_tasks
          SET order_index = order_index - 1
          WHERE protocol_id = ?
            AND order_index > ?
            AND order_index <= ?
        `, [protocolId, currentPosition, newPosition]);
      } else {
        // Moving up: shift intermediate tasks down
        await this.db.query(`
          UPDATE protocol_tasks
          SET order_index = order_index + 1
          WHERE protocol_id = ?
            AND order_index >= ?
            AND order_index < ?
        `, [protocolId, newPosition, currentPosition]);
      }

      // Update the moved task
      await this.db.query(`
        UPDATE protocol_tasks
        SET order_index = ?, updated_at = CURRENT_TIMESTAMP
        WHERE protocol_id = ? AND task_id = ?
      `, [newPosition, protocolId, taskId]);

      await transaction.commit();

      return {
        message: `Task moved from position ${currentPosition} to ${newPosition}`
      };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Remove task and resequence remaining tasks
   */
  async removeTaskFromProtocol(protocolId, taskId) {
    const transaction = await this.db.beginTransaction();

    try {
      // Get task position
      const [task] = await this.db.query(`
        SELECT order_index
        FROM protocol_tasks
        WHERE protocol_id = ? AND task_id = ?
      `, [protocolId, taskId]);

      if (!task) {
        throw new Error('Task not found in protocol');
      }

      const taskPosition = task.order_index;

      // Delete the task (foreign key constraints will handle related records)
      await this.db.query(`
        DELETE FROM protocol_tasks
        WHERE protocol_id = ? AND task_id = ?
      `, [protocolId, taskId]);

      // Shift remaining tasks down
      await this.db.query(`
        UPDATE protocol_tasks
        SET order_index = order_index - 1
        WHERE protocol_id = ? AND order_index > ?
      `, [protocolId, taskPosition]);

      await transaction.commit();

      return {
        message: `Task removed from position ${taskPosition}`
      };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Bulk reorder tasks with new positions
   */
  async reorderTasks(protocolId, taskOrders) {
    // taskOrders: [{ taskId: 'task-001', newPosition: 3 }, ...]
    const transaction = await this.db.beginTransaction();

    try {
      // Validate all tasks exist
      const taskIds = taskOrders.map(t => t.taskId);
      const existingTasks = await this.db.query(`
        SELECT task_id
        FROM protocol_tasks
        WHERE protocol_id = ? AND task_id IN (${taskIds.map(() => '?').join(',')})
      `, [protocolId, ...taskIds]);

      if (existingTasks.length !== taskIds.length) {
        throw new Error('Some tasks not found in protocol');
      }

      // Validate positions are unique and sequential
      const positions = taskOrders.map(t => t.newPosition).sort((a, b) => a - b);
      const expectedPositions = Array.from({length: positions.length}, (_, i) => i + 1);

      if (!this.arraysEqual(positions, expectedPositions)) {
        throw new Error('Positions must be unique and sequential starting from 1');
      }

      // Update all positions
      for (const { taskId, newPosition } of taskOrders) {
        await this.db.query(`
          UPDATE protocol_tasks
          SET order_index = ?, updated_at = CURRENT_TIMESTAMP
          WHERE protocol_id = ? AND task_id = ?
        `, [newPosition, protocolId, taskId]);
      }

      await transaction.commit();

      return {
        message: `Reordered ${taskOrders.length} tasks`
      };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Clean up and resequence all tasks in a protocol
   */
  async resequenceProtocol(protocolId) {
    const transaction = await this.db.beginTransaction();

    try {
      // Get all tasks ordered by current position
      const tasks = await this.db.query(`
        SELECT id
        FROM protocol_tasks
        WHERE protocol_id = ?
        ORDER BY order_index
      `, [protocolId]);

      // Update each task with sequential position
      for (let i = 0; i < tasks.length; i++) {
        await this.db.query(`
          UPDATE protocol_tasks
          SET order_index = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [i + 1, tasks[i].id]);
      }

      await transaction.commit();

      return {
        message: `Resequenced ${tasks.length} tasks`
      };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Helper methods
  async validateTaskInsertion(protocolId, taskId, position) {
    // Check if task already exists in protocol
    const [existing] = await this.db.query(`
      SELECT 1 FROM protocol_tasks
      WHERE protocol_id = ? AND task_id = ?
    `, [protocolId, taskId]);

    if (existing) {
      throw new Error('Task already exists in protocol');
    }

    // Validate position is reasonable
    if (position < 1) {
      throw new Error('Position must be >= 1');
    }

    // Check if task exists globally
    const [task] = await this.db.query(`
      SELECT 1 FROM tasks WHERE id = ?
    `, [taskId]);

    if (!task) {
      throw new Error('Task does not exist');
    }
  }

  async copyDefaultSensors(protocolTaskId, taskId) {
    await this.db.query(`
      INSERT INTO protocol_task_sensors (protocol_task_id, sensor_id)
      SELECT ?, sensor_id
      FROM task_sensors
      WHERE task_id = ?
    `, [protocolTaskId, taskId]);
  }

  async copyDefaultDomains(protocolTaskId, taskId) {
    await this.db.query(`
      INSERT INTO protocol_task_domains (protocol_task_id, domain_id)
      SELECT ?, domain_id
      FROM task_domains
      WHERE task_id = ?
    `, [protocolTaskId, taskId]);
  }

  generateId() {
    // In production, use proper UUID generation
    return `pt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  arraysEqual(a, b) {
    return a.length === b.length && a.every((val, i) => val === b[i]);
  }
}

// Usage examples:
/*
const orderManager = new ProtocolTaskOrderManager(database);

// Insert task at position 2
await orderManager.insertTaskAtPosition('protocol-123', 'task-456', 2, {
  importanceRating: 4.5,
  notes: 'Added for extra monitoring'
});

// Move task from current position to position 1
await orderManager.moveTaskPosition('protocol-123', 'task-456', 1);

// Bulk reorder
await orderManager.reorderTasks('protocol-123', [
  { taskId: 'task-001', newPosition: 3 },
  { taskId: 'task-002', newPosition: 1 },
  { taskId: 'task-003', newPosition: 2 }
]);

// Remove task
await orderManager.removeTaskFromProtocol('protocol-123', 'task-456');
*/

module.exports = ProtocolTaskOrderManager;
