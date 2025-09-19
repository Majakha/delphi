import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { dataProvider } from "../services/DataProvider";
import {
  Protocol,
  FullProtocol,
  Task,
  TaskWithRelations,
  Domain,
  Sensor,
  User,
  NotificationType,
  CreateProtocolData,
  UpdateProtocolData,
  CreateTaskData,
  UpdateTaskData,
  CreateDomainData,
  UpdateDomainData,
  CreateSensorData,
  UpdateSensorData,
  AddTaskToProtocolData,
  RegisterData,
  LoginData,
  ChangePasswordData,
  DataProviderStatus,
  Notification,
  TaskFilters,
  SensorFilters,
  DomainFilters,
  ProtocolFilters,
} from "../services/types";

/**
 * Hook for managing protocol data with automatic syncing
 */
export const useProtocol = (protocolId: string, loadFull: boolean = false) => {
  const [protocol, setProtocol] = useState<FullProtocol | Protocol | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<"synced" | "pending" | "error">(
    "synced",
  );
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load protocol on mount
  useEffect(() => {
    if (!protocolId) return;

    const loadProtocol = async () => {
      try {
        setLoading(true);
        setError(null);
        const protocolData = await dataProvider.getProtocol(
          protocolId,
          loadFull,
        );
        setProtocol(protocolData);
        setSyncStatus("synced");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load protocol",
        );
      } finally {
        setLoading(false);
      }
    };

    loadProtocol();
  }, [protocolId, loadFull]);

  // Listen for data provider notifications
  useEffect(() => {
    const unsubscribe = dataProvider.subscribe(
      (type: NotificationType, data: any) => {
        switch (type) {
          case "saving":
            if (data.type === "protocol" && data.id === protocolId) {
              setSyncStatus("pending");
            }
            break;
          case "synced":
            setSyncStatus("synced");
            setLastSaved(new Date());
            break;
          case "sync_failed":
            setSyncStatus("error");
            break;
          case "protocol_updated":
            if (data.id === protocolId) {
              setProtocol(data);
            }
            break;
          case "updated":
            if (data.type === "protocol" && data.id === protocolId) {
              setProtocol(data.data);
              setSyncStatus("synced");
            }
            break;
          case "task_reordered":
          case "tasks_reordered":
            if (data.protocolId === protocolId) {
              setSyncStatus("synced");
            }
            break;
        }
      },
    );

    return unsubscribe;
  }, [protocolId]);

  // Update protocol function
  const updateProtocol = useCallback(
    async (updates: UpdateProtocolData) => {
      if (!protocol) return;

      try {
        const updatedProtocol = await dataProvider.updateProtocol(
          protocol.id,
          updates,
        );
        setProtocol(updatedProtocol);
        return updatedProtocol;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update protocol",
        );
        throw err;
      }
    },
    [protocol],
  );

  // Delete protocol function
  const deleteProtocol = useCallback(async () => {
    if (!protocol) return;

    try {
      await dataProvider.deleteProtocol(protocol.id);
      setProtocol(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete protocol",
      );
      throw err;
    }
  }, [protocol]);

  // Add task to protocol
  const addTask = useCallback(
    async (taskId: string, taskData?: AddTaskToProtocolData) => {
      if (!protocol) return;

      try {
        const result = await dataProvider.addTaskToProtocol(
          protocol.id,
          taskId,
          taskData,
        );
        return result;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to add task to protocol",
        );
        throw err;
      }
    },
    [protocol],
  );

  // Remove task from protocol
  const removeTask = useCallback(
    async (taskId: string) => {
      if (!protocol) return;

      try {
        await dataProvider.removeTaskFromProtocol(protocol.id, taskId);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to remove task from protocol",
        );
        throw err;
      }
    },
    [protocol],
  );

  // Reorder tasks in protocol
  const reorderTasks = useCallback(
    async (taskOrders: { task_id: string; order_index: number }[]) => {
      if (!protocol) return;

      try {
        await dataProvider.reorderProtocolTasks(protocol.id, taskOrders);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to reorder protocol tasks",
        );
        throw err;
      }
    },
    [protocol],
  );

  // Update single task order
  const updateTaskOrder = useCallback(
    async (taskId: string, orderIndex: number) => {
      if (!protocol) return;

      try {
        await dataProvider.updateTaskOrder(protocol.id, taskId, orderIndex);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update task order",
        );
        throw err;
      }
    },
    [protocol],
  );

  // Force sync function
  const forceSync = useCallback(async () => {
    try {
      setSyncStatus("pending");
      await dataProvider.syncPendingChanges();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
      setSyncStatus("error");
    }
  }, []);

  return {
    protocol,
    loading,
    error,
    syncStatus,
    lastSaved,
    updateProtocol,
    deleteProtocol,
    addTask,
    removeTask,
    reorderTasks,
    updateTaskOrder,
    forceSync,
  };
};

/**
 * Hook for managing protocols list
 */
export const useProtocols = (filters: ProtocolFilters = {}) => {
  const [protocols, setProtocols] = useState<Protocol[] | FullProtocol[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create stable filter key to prevent infinite re-renders
  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);

  // Load protocols function
  const loadProtocols = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const protocolsData = await dataProvider.getProtocols(filters);
      setProtocols(protocolsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load protocols");
    } finally {
      setLoading(false);
    }
  }, [filterKey]);

  // Create new protocol
  const createProtocol = useCallback(
    async (protocolData: CreateProtocolData): Promise<Protocol> => {
      try {
        const newProtocol = await dataProvider.createProtocol(protocolData);
        setProtocols((prev) => [...prev, newProtocol]);
        return newProtocol;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create protocol",
        );
        throw err;
      }
    },
    [],
  );

  // Load protocols on mount and when filter changes
  useEffect(() => {
    loadProtocols();
  }, [filterKey]);

  return {
    protocols,
    loading,
    error,
    loadProtocols,
    createProtocol,
  };
};

/**
 * Hook for managing tasks data
 */
export const useTasks = (filters: TaskFilters = {}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load tasks function
  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const tasksData = await dataProvider.getTasks(filters);
      setTasks(tasksData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Search tasks function
  const searchTasks = useCallback(async (searchTerm: string) => {
    try {
      setLoading(true);
      setError(null);
      const tasksData = await dataProvider.searchTasks(searchTerm);
      setTasks(tasksData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  // Create new task
  const createTask = useCallback(
    async (taskData: CreateTaskData): Promise<Task> => {
      try {
        const newTask = await dataProvider.createTask(taskData);
        setTasks((prev) => [...prev, newTask]);
        return newTask;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create task");
        throw err;
      }
    },
    [],
  );

  // Update task
  const updateTask = useCallback(
    async (taskId: string, updates: UpdateTaskData): Promise<Task> => {
      try {
        const updatedTask = await dataProvider.updateTask(taskId, updates);
        setTasks((prev) =>
          prev.map((task) => (task.id === taskId ? updatedTask : task)),
        );
        return updatedTask;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update task");
        throw err;
      }
    },
    [],
  );

  // Delete task
  const deleteTask = useCallback(async (taskId: string) => {
    try {
      await dataProvider.deleteTask(taskId);
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete task");
      throw err;
    }
  }, []);

  // Load tasks on mount
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  return {
    tasks,
    loading,
    error,
    loadTasks,
    searchTasks,
    createTask,
    updateTask,
    deleteTask,
  };
};

/**
 * Hook for managing a single task with relationships
 */
export const useTask = (taskId: string, withRelations: boolean = false) => {
  const [task, setTask] = useState<TaskWithRelations | Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load task on mount
  useEffect(() => {
    if (!taskId) return;

    const loadTask = async () => {
      try {
        setLoading(true);
        setError(null);
        const taskData = await dataProvider.getTask(taskId, withRelations);
        setTask(taskData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load task");
      } finally {
        setLoading(false);
      }
    };

    loadTask();
  }, [taskId, withRelations]);

  return {
    task,
    loading,
    error,
  };
};

/**
 * Hook for managing domains data
 */
export const useDomains = (filters: DomainFilters = {}) => {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load domains function
  const loadDomains = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const domainsData = await dataProvider.getDomains(filters);
      setDomains(domainsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load domains");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Create new domain
  const createDomain = useCallback(
    async (domainData: CreateDomainData): Promise<Domain> => {
      try {
        const newDomain = await dataProvider.createDomain(domainData);
        setDomains((prev) => [...prev, newDomain]);
        return newDomain;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create domain",
        );
        throw err;
      }
    },
    [],
  );

  // Update domain
  const updateDomain = useCallback(
    async (domainId: string, updates: UpdateDomainData): Promise<Domain> => {
      try {
        const updatedDomain = await dataProvider.updateDomain(
          domainId,
          updates,
        );
        setDomains((prev) =>
          prev.map((domain) =>
            domain.id === domainId ? updatedDomain : domain,
          ),
        );
        return updatedDomain;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update domain",
        );
        throw err;
      }
    },
    [],
  );

  // Delete domain
  const deleteDomain = useCallback(async (domainId: string) => {
    try {
      await dataProvider.deleteDomain(domainId);
      setDomains((prev) => prev.filter((domain) => domain.id !== domainId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete domain");
      throw err;
    }
  }, []);

  // Load domains on mount
  useEffect(() => {
    loadDomains();
  }, [loadDomains]);

  return {
    domains,
    loading,
    error,
    loadDomains,
    createDomain,
    updateDomain,
    deleteDomain,
  };
};

/**
 * Hook for managing sensors data
 */
export const useSensors = (filters: SensorFilters = {}) => {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load sensors function
  const loadSensors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const sensorsData = await dataProvider.getSensors(filters);
      setSensors(sensorsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sensors");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Search sensors function
  const searchSensors = useCallback(async (searchTerm: string) => {
    try {
      setLoading(true);
      setError(null);
      const sensorsData = await dataProvider.searchSensors(searchTerm);
      setSensors(sensorsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search sensors");
    } finally {
      setLoading(false);
    }
  }, []);

  // Create new sensor
  const createSensor = useCallback(
    async (sensorData: CreateSensorData): Promise<Sensor> => {
      try {
        const newSensor = await dataProvider.createSensor(sensorData);
        setSensors((prev) => [...prev, newSensor]);
        return newSensor;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create sensor",
        );
        throw err;
      }
    },
    [],
  );

  // Update sensor
  const updateSensor = useCallback(
    async (sensorId: string, updates: UpdateSensorData): Promise<Sensor> => {
      try {
        const updatedSensor = await dataProvider.updateSensor(
          sensorId,
          updates,
        );
        setSensors((prev) =>
          prev.map((sensor) =>
            sensor.id === sensorId ? updatedSensor : sensor,
          ),
        );
        return updatedSensor;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update sensor",
        );
        throw err;
      }
    },
    [],
  );

  // Delete sensor
  const deleteSensor = useCallback(async (sensorId: string) => {
    try {
      await dataProvider.deleteSensor(sensorId);
      setSensors((prev) => prev.filter((sensor) => sensor.id !== sensorId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete sensor");
      throw err;
    }
  }, []);

  // Load sensors on mount
  useEffect(() => {
    loadSensors();
  }, [loadSensors]);

  return {
    sensors,
    loading,
    error,
    loadSensors,
    searchSensors,
    createSensor,
    updateSensor,
    deleteSensor,
  };
};

/**
 * Hook for global data provider status and notifications
 */
export const useDataProviderStatus = () => {
  const [status, setStatus] = useState<DataProviderStatus>({
    online: navigator.onLine,
    authenticated: false,
    pendingSync: 0,
    cacheKeys: [],
  });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notificationIdRef = useRef(0);

  useEffect(() => {
    // Update status periodically
    const updateStatus = () => {
      setStatus(dataProvider.getStatus());
    };

    updateStatus();
    const interval = setInterval(updateStatus, 5000);

    // Listen for notifications
    const unsubscribe = dataProvider.subscribe(
      (type: NotificationType, data: any) => {
        const notification: Notification = {
          id: ++notificationIdRef.current,
          type,
          data,
          timestamp: new Date(),
          read: false,
        };

        setNotifications((prev) => [notification, ...prev.slice(0, 9)]); // Keep last 10

        // Auto-remove non-error notifications after 5 seconds
        if (!type.includes("error")) {
          setTimeout(() => {
            setNotifications((prev) =>
              prev.map((n) =>
                n.id === notification.id ? { ...n, read: true } : n,
              ),
            );
          }, 5000);
        }
      },
    );

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const markAsRead = useCallback((notificationId: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
    );
  }, []);

  return {
    status,
    notifications: notifications.filter((n) => !n.read),
    clearNotifications,
    markAsRead,
  };
};

/**
 * Hook for managing cache operations
 */
export const useCache = () => {
  const clearCache = useCallback((key?: string) => {
    dataProvider.clearCache(key);
  }, []);

  const getCacheInfo = useCallback(() => {
    return dataProvider.getCacheInfo();
  }, []);

  return {
    clearCache,
    getCacheInfo,
  };
};

/**
 * Hook for authentication management
 */
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize authentication state
  useEffect(() => {
    const initAuth = () => {
      const currentUser = dataProvider.getCurrentUser();
      const authStatus = dataProvider.isAuthenticated();

      setUser(currentUser);
      setIsAuthenticated(authStatus);

      // If we have a user but not authenticated (expired token), clear user
      if (currentUser && !authStatus) {
        setUser(null);
        setIsAuthenticated(false);
      }
    };

    initAuth();

    // Check authentication status periodically
    const interval = setInterval(() => {
      const currentAuthStatus = dataProvider.isAuthenticated();
      if (currentAuthStatus !== isAuthenticated) {
        setIsAuthenticated(currentAuthStatus);
        if (!currentAuthStatus) {
          setUser(null);
        }
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Listen for auth notifications
  useEffect(() => {
    const unsubscribe = dataProvider.subscribe(
      (type: NotificationType, data: any) => {
        switch (type) {
          case "logged_in":
            setUser(data.user);
            setIsAuthenticated(true);
            setError(null);
            break;
          case "registered":
            // Registration successful, but user still needs to log in
            setError(null);
            break;
          case "logged_out":
            setUser(null);
            setIsAuthenticated(false);
            setError(null);
            break;
          case "session_expired":
            setUser(null);
            setIsAuthenticated(false);
            setError("Your session has expired. Please log in again.");
            break;
          case "auth_error":
            setError(data.error);
            // If it's a critical auth error, clear auth state
            if (
              data.error?.includes("expired") ||
              data.error?.includes("invalid") ||
              data.error?.includes("unauthorized")
            ) {
              setUser(null);
              setIsAuthenticated(false);
            }
            break;
          case "token_refreshed":
            const updatedUser = dataProvider.getCurrentUser();
            setUser(updatedUser);
            setIsAuthenticated(true);
            setError(null);
            break;
        }
      },
    );

    return unsubscribe;
  }, []);

  // Register function
  const register = useCallback(
    async (registerData: RegisterData): Promise<User> => {
      try {
        setLoading(true);
        setError(null);
        const userData = await dataProvider.register(registerData);
        return userData;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Registration failed";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Login function
  const login = useCallback(async (loginData: LoginData): Promise<User> => {
    try {
      setLoading(true);
      setError(null);
      const userData = await dataProvider.login(loginData);
      return userData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Login failed";
      setError(errorMessage);
      setUser(null);
      setIsAuthenticated(false);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await dataProvider.logout();
      // State will be updated by the notification listener
    } catch (err) {
      // Even if logout fails on server, clear local state
      setUser(null);
      setIsAuthenticated(false);
      const errorMessage = err instanceof Error ? err.message : "Logout failed";
      console.warn("Logout error:", errorMessage);
      // Don't set error state for logout failures since we cleared local state anyway
    } finally {
      setLoading(false);
    }
  }, []);

  // Change password function
  const changePassword = useCallback(
    async (passwordData: ChangePasswordData): Promise<void> => {
      try {
        setLoading(true);
        setError(null);
        await dataProvider.changePassword(passwordData);
        // User will be logged out and need to log in again
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Password change failed";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    user,
    isAuthenticated,
    loading,
    error,
    register,
    login,
    logout,
    changePassword,
    clearError,
  };
};
