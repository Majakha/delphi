import {
  Protocol,
  FullProtocol,
  Task,
  Domain,
  Sensor,
  CreateTaskData,
  NotificationType,
} from "./types";
import { dataProvider } from "./DataProvider";

/**
 * Utility functions for common service operations
 */
export class ServiceUtils {
  /**
   * Create a complete protocol with tasks from a template
   */
  static async createProtocolFromTemplate(
    templateId: string,
    protocolData: {
      name: string;
      description?: string;
    },
  ): Promise<FullProtocol> {
    // Create the protocol from template
    const newProtocol = await dataProvider.createProtocol({
      ...protocolData,
      template_protocol_id: templateId,
      is_template: false,
    });

    // Get the full protocol with tasks
    const fullProtocol = (await dataProvider.getProtocol(
      newProtocol.id,
      true,
    )) as FullProtocol;

    return fullProtocol;
  }

  /**
   * Duplicate a protocol with all its tasks and relationships
   */
  static async duplicateProtocol(
    sourceProtocolId: string,
    newName: string,
    newDescription?: string,
  ): Promise<FullProtocol> {
    // Get the source protocol with all tasks
    const sourceProtocol = (await dataProvider.getProtocol(
      sourceProtocolId,
      true,
    )) as FullProtocol;

    // Create new protocol
    const newProtocol = await dataProvider.createProtocol({
      name: newName,
      description: newDescription || sourceProtocol.description || undefined,
      is_template: false,
    });

    // Add all tasks from source protocol
    for (const task of sourceProtocol.tasks) {
      await dataProvider.addTaskToProtocol(newProtocol.id, task.task_id, {
        order_index: task.order_index,
        importance_rating: task.importance_rating || undefined,
        notes: task.notes || undefined,
        copy_defaults: true,
      });
    }

    // Get the complete new protocol
    const fullNewProtocol = (await dataProvider.getProtocol(
      newProtocol.id,
      true,
    )) as FullProtocol;

    return fullNewProtocol;
  }

  /**
   * Batch create tasks and add them to a protocol
   */
  static async batchCreateAndAddTasks(
    protocolId: string,
    tasksData: Array<
      CreateTaskData & {
        order_index?: number;
        importance_rating?: number;
        notes?: string;
      }
    >,
  ): Promise<Task[]> {
    const createdTasks: Task[] = [];

    for (const taskData of tasksData) {
      const { order_index, importance_rating, notes, ...createData } = taskData;

      // Create the task
      const newTask = await dataProvider.createTask(createData);
      createdTasks.push(newTask);

      // Add to protocol
      await dataProvider.addTaskToProtocol(protocolId, newTask.id, {
        order_index,
        importance_rating,
        notes,
        copy_defaults: true,
      });
    }

    return createdTasks;
  }

  /**
   * Search across all entity types
   */
  static async globalSearch(query: string): Promise<{
    tasks: Task[];
    protocols: Protocol[];
    domains: Domain[];
    sensors: Sensor[];
  }> {
    const [tasks, protocols, domains, sensors] = await Promise.allSettled([
      dataProvider.searchTasks(query),
      dataProvider
        .getProtocols()
        .then((protocols) =>
          protocols.filter(
            (p) =>
              p.name.toLowerCase().includes(query.toLowerCase()) ||
              (p.description &&
                p.description.toLowerCase().includes(query.toLowerCase())),
          ),
        ),
      dataProvider
        .getDomains()
        .then((domains) =>
          domains.filter(
            (d) =>
              d.name.toLowerCase().includes(query.toLowerCase()) ||
              (d.description &&
                d.description.toLowerCase().includes(query.toLowerCase())),
          ),
        ),
      dataProvider
        .getSensors()
        .then((sensors) =>
          sensors.filter(
            (s) =>
              s.name.toLowerCase().includes(query.toLowerCase()) ||
              s.category.toLowerCase().includes(query.toLowerCase()) ||
              (s.description &&
                s.description.toLowerCase().includes(query.toLowerCase())),
          ),
        ),
    ]);

    return {
      tasks: tasks.status === "fulfilled" ? tasks.value : [],
      protocols: protocols.status === "fulfilled" ? protocols.value : [],
      domains: domains.status === "fulfilled" ? domains.value : [],
      sensors: sensors.status === "fulfilled" ? sensors.value : [],
    };
  }

  /**
   * Get protocol statistics
   */
  static async getProtocolStats(protocolId: string): Promise<{
    totalTasks: number;
    totalTime: number;
    tasksByType: { tasks: number; breaks: number };
    overrideCount: number;
    sensorCount: number;
    domainCount: number;
    completionEstimate: string;
  }> {
    const protocol = (await dataProvider.getProtocol(
      protocolId,
      true,
    )) as FullProtocol;

    const totalTasks = protocol.tasks.length;
    const totalTime = protocol.tasks.reduce(
      (sum, task) => sum + (task.time || 0),
      0,
    );

    const tasksByType = protocol.tasks.reduce(
      (acc, task) => {
        if (task.type === "task") acc.tasks++;
        else acc.breaks++;
        return acc;
      },
      { tasks: 0, breaks: 0 },
    );

    const overrideCount = protocol.tasks.filter(
      (task) =>
        task.has_title_override ||
        task.has_time_override ||
        task.has_description_override ||
        task.has_notes_override,
    ).length;

    const allSensors = new Set<string>();
    const allDomains = new Set<string>();

    protocol.tasks.forEach((task) => {
      task.sensors.forEach((sensor) => allSensors.add(sensor.id));
      task.domains.forEach((domain) => allDomains.add(domain.id));
    });

    const hours = Math.floor(totalTime / 60);
    const minutes = totalTime % 60;
    const completionEstimate =
      hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    return {
      totalTasks,
      totalTime,
      tasksByType,
      overrideCount,
      sensorCount: allSensors.size,
      domainCount: allDomains.size,
      completionEstimate,
    };
  }

  /**
   * Validate protocol before execution
   */
  static async validateProtocol(protocolId: string): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const protocol = (await dataProvider.getProtocol(
        protocolId,
        true,
      )) as FullProtocol;

      // Check if protocol has tasks
      if (protocol.tasks.length === 0) {
        errors.push("Protocol has no tasks");
      }

      // Check for duplicate order indices
      const orderIndices = protocol.tasks.map((task) => task.order_index);
      const duplicateIndices = orderIndices.filter(
        (index, i) => orderIndices.indexOf(index) !== i,
      );
      if (duplicateIndices.length > 0) {
        warnings.push("Protocol has duplicate order indices");
      }

      // Check for tasks without time estimates
      const tasksWithoutTime = protocol.tasks.filter(
        (task) => !task.time || task.time === 0,
      );
      if (tasksWithoutTime.length > 0) {
        warnings.push(`${tasksWithoutTime.length} tasks have no time estimate`);
      }

      // Check for very long protocols (> 8 hours)
      const totalTime = protocol.tasks.reduce(
        (sum, task) => sum + (task.time || 0),
        0,
      );
      if (totalTime > 480) {
        // 8 hours in minutes
        warnings.push("Protocol is very long (>8 hours)");
      }

      // Check for tasks without descriptions
      const tasksWithoutDescription = protocol.tasks.filter(
        (task) => !task.description && !task.additional_notes,
      );
      if (tasksWithoutDescription.length > 0) {
        warnings.push(
          `${tasksWithoutDescription.length} tasks have no description`,
        );
      }
    } catch (error) {
      errors.push("Failed to load protocol for validation");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Export protocol data for backup or sharing
   */
  static async exportProtocol(protocolId: string): Promise<{
    protocol: FullProtocol;
    exportedAt: string;
    version: string;
  }> {
    const protocol = (await dataProvider.getProtocol(
      protocolId,
      true,
    )) as FullProtocol;

    return {
      protocol,
      exportedAt: new Date().toISOString(),
      version: "1.0", // Schema version for import compatibility
    };
  }

  /**
   * Get user's usage statistics
   */
  static async getUserStats(): Promise<{
    protocolCount: number;
    customTaskCount: number;
    customDomainCount: number;
    customSensorCount: number;
    mostUsedTasks: Array<{ task: Task; useCount: number }>;
    recentActivity: Array<{
      type: string;
      entityId: string;
      entityName: string;
      timestamp: string;
    }>;
  }> {
    const [protocols, tasks, domains, sensors] = await Promise.all([
      dataProvider.getProtocols({ user_only: true }),
      dataProvider.getTasks({ user_only: true }),
      dataProvider.getDomains({ user_only: true }),
      dataProvider.getSensors({ user_only: true }),
    ]);

    // Note: Most used tasks and recent activity would require additional API endpoints
    // that track usage and activity. For now, we'll return empty arrays.

    return {
      protocolCount: protocols.length,
      customTaskCount: tasks.length,
      customDomainCount: domains.length,
      customSensorCount: sensors.length,
      mostUsedTasks: [], // Would need usage tracking
      recentActivity: [], // Would need activity logging
    };
  }

  /**
   * Cleanup orphaned relationships and validate data integrity
   */
  static async performDataCleanup(): Promise<{
    cleaned: boolean;
    issues: string[];
    suggestions: string[];
  }> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    try {
      // Get all user's protocols
      const protocols = await dataProvider.getProtocols({ user_only: true });

      for (const protocol of protocols) {
        const fullProtocol = (await dataProvider.getProtocol(
          protocol.id,
          true,
        )) as FullProtocol;

        // Check for tasks that no longer exist
        for (const protocolTask of fullProtocol.tasks) {
          try {
            await dataProvider.getTask(protocolTask.task_id);
          } catch (error) {
            issues.push(
              `Protocol "${protocol.name}" references non-existent task`,
            );
          }
        }
      }

      // Check for unused custom entities
      const [customTasks, customDomains, customSensors] = await Promise.all([
        dataProvider.getTasks({ user_only: true }),
        dataProvider.getDomains({ user_only: true }),
        dataProvider.getSensors({ user_only: true }),
      ]);

      if (customTasks.length > 20) {
        suggestions.push(
          "You have many custom tasks. Consider archiving unused ones.",
        );
      }

      if (customDomains.length > 10) {
        suggestions.push(
          "You have many custom domains. Consider consolidating similar ones.",
        );
      }

      if (customSensors.length > 30) {
        suggestions.push(
          "You have many custom sensors. Consider organizing by category.",
        );
      }
    } catch (error) {
      issues.push("Failed to perform complete data cleanup check");
    }

    return {
      cleaned: issues.length === 0,
      issues,
      suggestions,
    };
  }
}

/**
 * Event aggregator for cross-service communication
 */
export class ServiceEventBus {
  private listeners: Map<NotificationType, Array<(data: any) => void>> =
    new Map();

  /**
   * Subscribe to service events
   */
  subscribe(
    eventType: NotificationType,
    callback: (data: any) => void,
  ): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }

    this.listeners.get(eventType)!.push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(eventType);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Emit event to all subscribers
   */
  emit(eventType: NotificationType, data?: any): void {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event callback for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * Clear all listeners
   */
  clear(): void {
    this.listeners.clear();
  }
}

// Export singleton instance
export const serviceEventBus = new ServiceEventBus();

/**
 * Service health check utilities
 */
export class ServiceHealth {
  /**
   * Check if all services are functioning properly
   */
  static async checkHealth(): Promise<{
    healthy: boolean;
    services: {
      dataProvider: boolean;
      authentication: boolean;
      storage: boolean;
      cache: boolean;
    };
    issues: string[];
  }> {
    const issues: string[] = [];
    const services = {
      dataProvider: true,
      authentication: true,
      storage: true,
      cache: true,
    };

    try {
      // Test DataProvider
      const status = dataProvider.getStatus();
      if (!status.online) {
        services.dataProvider = false;
        issues.push("DataProvider is offline");
      }

      // Test Authentication
      if (!dataProvider.isAuthenticated()) {
        services.authentication = false;
        issues.push("User is not authenticated");
      }

      // Test Storage
      const storageManager = dataProvider.getCacheInfo();
      if (!storageManager) {
        services.storage = false;
        issues.push("Storage manager is not available");
      }

      // Test Cache
      const cacheKeys = status.cacheKeys;
      if (cacheKeys.length === 0) {
        // This might be normal, so we'll just note it
        console.log("Cache is empty");
      }
    } catch (error) {
      services.dataProvider = false;
      issues.push("Failed to check service health");
    }

    const healthy = Object.values(services).every(Boolean);

    return {
      healthy,
      services,
      issues,
    };
  }

  /**
   * Attempt to recover from common service issues
   */
  static async attemptRecovery(): Promise<{
    recovered: boolean;
    actions: string[];
  }> {
    const actions: string[] = [];

    try {
      // Clear cache if it seems corrupted
      dataProvider.clearCache();
      actions.push("Cleared cache");

      // Force sync pending changes
      await dataProvider.syncPendingChanges();
      actions.push("Synced pending changes");

      // Verify authentication
      if (!dataProvider.isAuthenticated()) {
        actions.push("Authentication required - please log in again");
      }

      return {
        recovered: true,
        actions,
      };
    } catch (error) {
      actions.push("Recovery failed - manual intervention required");
      return {
        recovered: false,
        actions,
      };
    }
  }
}
