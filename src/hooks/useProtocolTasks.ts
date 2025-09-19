import { useState, useEffect, useCallback } from "react";
import { dataProvider } from "../services/DataProvider";
import {
  FullProtocol,
  ProtocolTask,
  Task,
  UpdateProtocolTaskData,
  NotificationType,
} from "../services/types";

/**
 * Hook for managing tasks within a specific protocol
 */
export const useProtocolTasks = (protocolId: string) => {
  const [protocol, setProtocol] = useState<FullProtocol | null>(null);
  const [tasks, setTasks] = useState<ProtocolTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load protocol with tasks
  useEffect(() => {
    if (!protocolId) return;

    const loadProtocol = async () => {
      try {
        setLoading(true);
        setError(null);
        const fullProtocol = await dataProvider.getProtocol(
          protocolId,
          true,
        ) as FullProtocol;
        setProtocol(fullProtocol);
        setTasks(fullProtocol.tasks || []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load protocol tasks",
        );
      } finally {
        setLoading(false);
      }
    };

    loadProtocol();
  }, [protocolId]);

  // Listen for protocol updates
  useEffect(() => {
    const unsubscribe = dataProvider.subscribe(
      (type: NotificationType, data: any) => {
        if (type === "protocol_updated" && data.id === protocolId) {
          setProtocol(data);
          setTasks(data.tasks || []);
        }
      },
    );

    return unsubscribe;
  }, [protocolId]);

  // Add task to protocol
  const addTask = useCallback(
    async (taskId: string, options?: {
      order_index?: number;
      importance_rating?: number;
      notes?: string;
      copy_defaults?: boolean;
    }) => {
      if (!protocol) return;

      try {
        await dataProvider.addTaskToProtocol(protocolId, taskId, options);

        // Reload protocol to get updated task list
        const updatedProtocol = await dataProvider.getProtocol(
          protocolId,
          true,
        ) as FullProtocol;
        setProtocol(updatedProtocol);
        setTasks(updatedProtocol.tasks || []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to add task",
        );
        throw err;
      }
    },
    [protocol, protocolId],
  );

  // Remove task from protocol
  const removeTask = useCallback(
    async (taskId: string) => {
      if (!protocol) return;

      try {
        await dataProvider.removeTaskFromProtocol(protocolId, taskId);

        // Update local state immediately
        setTasks(prev => prev.filter(task => task.task_id !== taskId));

        // Reload protocol to ensure consistency
        const updatedProtocol = await dataProvider.getProtocol(
          protocolId,
          true,
        ) as FullProtocol;
        setProtocol(updatedProtocol);
        setTasks(updatedProtocol.tasks || []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to remove task",
        );
        throw err;
      }
    },
    [protocol, protocolId],
  );

  // Update protocol task (overrides and settings)
  const updateProtocolTask = useCallback(
    async (protocolTaskId: string, updates: UpdateProtocolTaskData) => {
      if (!protocol) return;

      try {
        // Note: This would need a new API endpoint for updating protocol tasks
        // For now, we'll simulate the update locally and trigger a reload
        setTasks(prev =>
          prev.map(task =>
            task.protocol_task_id === protocolTaskId
              ? { ...task, ...updates }
              : task
          )
        );

        // In a real implementation, you'd call something like:
        // await dataProvider.updateProtocolTask(protocolTaskId, updates);

        // For now, reload to ensure consistency
        const updatedProtocol = await dataProvider.getProtocol(
          protocolId,
          true,
        ) as FullProtocol;
        setProtocol(updatedProtocol);
        setTasks(updatedProtocol.tasks || []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update protocol task",
        );
        throw err;
      }
    },
    [protocol, protocolId],
  );

  // Reorder tasks within protocol
  const reorderTasks = useCallback(
    async (taskUpdates: Array<{ taskId: string; newOrderIndex: number }>) => {
      if (!protocol) return;

      try {
        // Update local state immediately for better UX
        const updatedTasks = [...tasks];
        taskUpdates.forEach(({ taskId, newOrderIndex }) => {
          const taskIndex = updatedTasks.findIndex(t => t.task_id === taskId);
          if (taskIndex !== -1) {
            updatedTasks[taskIndex].order_index = newOrderIndex;
          }
        });

        // Sort by order_index
        updatedTasks.sort((a, b) => a.order_index - b.order_index);
        setTasks(updatedTasks);

        // Apply updates via API (would need batch update endpoint)
        for (const { taskId, newOrderIndex } of taskUpdates) {
          const protocolTask = tasks.find(t => t.task_id === taskId);
          if (protocolTask) {
            await updateProtocolTask(protocolTask.protocol_task_id, {
              order_index: newOrderIndex,
            });
          }
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to reorder tasks",
        );
        // Reload on error to restore correct order
        const updatedProtocol = await dataProvider.getProtocol(
          protocolId,
          true,
        ) as FullProtocol;
        setTasks(updatedProtocol.tasks || []);
        throw err;
      }
    },
    [protocol, protocolId, tasks, updateProtocolTask],
  );

  // Get tasks sorted by order
  const sortedTasks = [...tasks].sort((a, b) => a.order_index - b.order_index);

  // Get tasks by type
  const tasksByType = {
    tasks: sortedTasks.filter(task => task.type === "task"),
    breaks: sortedTasks.filter(task => task.type === "break"),
  };

  // Calculate total time
  const totalTime = sortedTasks.reduce((sum, task) => {
    return sum + (task.time || 0);
  }, 0);

  // Get override statistics
  const overrideStats = {
    totalTasks: tasks.length,
    tasksWithOverrides: tasks.filter(task =>
      task.has_title_override ||
      task.has_time_override ||
      task.has_description_override ||
      task.has_notes_override
    ).length,
    titleOverrides: tasks.filter(task => task.has_title_override).length,
    timeOverrides: tasks.filter(task => task.has_time_override).length,
    descriptionOverrides: tasks.filter(task => task.has_description_override).length,
    notesOverrides: tasks.filter(task => task.has_notes_override).length,
  };

  return {
    protocol,
    tasks: sortedTasks,
    tasksByType,
    totalTime,
    overrideStats,
    loading,
    error,
    addTask,
    removeTask,
    updateProtocolTask,
    reorderTasks,
  };
};

/**
 * Hook for managing task relationships (sensors/domains) within protocols
 */
export const useProtocolTaskRelationships = (protocolId: string, taskId: string) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add sensor to protocol task
  const addSensor = useCallback(
    async (sensorId: string) => {
      try {
        setLoading(true);
        setError(null);

        // This would need a new API endpoint for protocol task relationships
        // For now, we use the general task-sensor relationship endpoint
        await dataProvider.apiRequest(`/tasks/${taskId}/sensors/${sensorId}`, {
          method: "POST",
        });

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to add sensor";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [taskId],
  );

  // Remove sensor from protocol task
  const removeSensor = useCallback(
    async (sensorId: string) => {
      try {
        setLoading(true);
        setError(null);

        await dataProvider.apiRequest(`/tasks/${taskId}/sensors/${sensorId}`, {
          method: "DELETE",
        });

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to remove sensor";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [taskId],
  );

  // Add domain to protocol task
  const addDomain = useCallback(
    async (domainId: string) => {
      try {
        setLoading(true);
        setError(null);

        await dataProvider.apiRequest(`/tasks/${taskId}/domains/${domainId}`, {
          method: "POST",
        });

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to add domain";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [taskId],
  );

  // Remove domain from protocol task
  const removeDomain = useCallback(
    async (domainId: string) => {
      try {
        setLoading(true);
        setError(null);

        await dataProvider.apiRequest(`/tasks/${taskId}/domains/${domainId}`, {
          method: "DELETE",
        });

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to remove domain";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [taskId],
  );

  return {
    loading,
    error,
    addSensor,
    removeSensor,
    addDomain,
    removeDomain,
  };
};

/**
 * Hook for protocol templates and cloning
 */
export const useProtocolTemplates = () => {
  const [templates, setTemplates] = useState<FullProtocol[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load available templates
  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const templateProtocols = await dataProvider.getProtocols({
        templates_only: true,
      });

      // Load full details for each template
      const fullTemplates = await Promise.all(
        templateProtocols.map(template =>
          dataProvider.getProtocol(template.id, true) as Promise<FullProtocol>
        )
      );

      setTemplates(fullTemplates);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load templates",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Create protocol from template
  const createFromTemplate = useCallback(
    async (templateId: string, protocolData: {
      name: string;
      description?: string;
    }) => {
      try {
        setLoading(true);
        setError(null);

        const newProtocol = await dataProvider.createProtocol({
          ...protocolData,
          template_protocol_id: templateId,
          is_template: false,
        });

        return newProtocol;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to create from template";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  return {
    templates,
    loading,
    error,
    loadTemplates,
    createFromTemplate,
  };
};
