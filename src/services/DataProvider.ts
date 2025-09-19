import {
  Protocol,
  FullProtocol,
  StoredProtocol,
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
  RequestOptions,
  SyncQueueItem,
  DataProviderStatus,
  TaskFilters,
  SensorFilters,
  DomainFilters,
  ProtocolFilters,
  ApiResponse,
  ApiListResponse,
  DataProviderEventCallback,
} from "./types";
import { AuthManager } from "./AuthManager";
import { CacheManager } from "./CacheManager";
import { StorageManager } from "./StorageManager";

export class DataProvider {
  private baseUrl: string;
  private authManager: AuthManager;
  private cacheManager: CacheManager;
  private storageManager: StorageManager;
  private syncQueue: SyncQueueItem[] = [];
  private listeners: DataProviderEventCallback[] = [];
  private isOnline: boolean = navigator.onLine;
  private syncTimeout: NodeJS.Timeout | null = null;
  private periodicSyncInterval: NodeJS.Timeout | null = null;

  constructor(
    baseUrl: string,
    storageManager: StorageManager,
    cacheManager: CacheManager,
    authManager: AuthManager,
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, ""); // Remove trailing slashes
    this.storageManager = storageManager;
    this.cacheManager = cacheManager;
    this.authManager = authManager;

    // Load sync queue from storage
    this.syncQueue =
      this.storageManager.get<SyncQueueItem[]>("syncQueue") || [];

    this.initializeEventListeners();
    this.startPeriodicSync();
  }

  /**
   * Subscribe to data provider events
   */
  subscribe(callback: DataProviderEventCallback): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(
        (listener) => listener !== callback,
      );
    };
  }

  /**
   * Notify all listeners of events
   */
  private notify(type: NotificationType, data?: any): void {
    this.listeners.forEach((listener) => {
      try {
        listener(type, data);
      } catch (error) {
        console.error("Listener error:", error);
      }
    });
  }

  /**
   * Initialize event listeners for online/offline status
   */
  private initializeEventListeners(): void {
    const updateOnlineStatus = () => {
      const wasOnline = this.isOnline;
      this.isOnline = navigator.onLine;

      if (!wasOnline && this.isOnline) {
        this.notify("syncing");
        this.syncPendingChanges();
      }
    };

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
  }

  /**
   * Start periodic sync for pending changes
   */
  private startPeriodicSync(): void {
    this.periodicSyncInterval = setInterval(() => {
      if (this.isOnline && this.syncQueue.length > 0) {
        this.syncPendingChanges();
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Make authenticated API request
   */
  async apiRequest<T = any>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<T> {
    // Ensure we have a valid token
    await this.authManager.ensureValidToken(this.baseUrl);

    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      ...this.authManager.getAuthHeaders(),
      ...options.headers,
    };

    const requestOptions: RequestInit = {
      ...options,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    };

    try {
      const response = await fetch(url, requestOptions);

      // Handle authentication errors
      if (response.status === 401) {
        try {
          await this.authManager.handleUnauthorized(this.baseUrl);
          // Retry the request once after token refresh
          const retryResponse = await fetch(url, requestOptions);
          if (!retryResponse.ok) {
            throw new Error("Authentication failed after token refresh");
          }
          return await retryResponse.json();
        } catch (error) {
          this.notify("session_expired");
          throw new Error("Session expired - please log in again");
        }
      }

      if (response.status === 403) {
        this.notify("authorization_error", { message: "Access forbidden" });
        throw new Error("Access forbidden");
      }

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: await response.text() };
        }

        // Handle structured error responses from new API format
        const errorMessage =
          errorData?.error?.message ||
          errorData?.message ||
          `API Error: ${response.status} ${response.statusText}`;

        // Notify specific error types
        if (response.status === 400) {
          this.notify("validation_error", errorData);
        }

        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      this.notify("api_error", {
        endpoint,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  // ===== AUTHENTICATION =====

  async register(registerData: RegisterData): Promise<User> {
    try {
      this.notify("registering");
      const user = await this.authManager.register(this.baseUrl, registerData);
      this.notify("registered", { user });
      return user;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Registration failed";
      this.notify("auth_error", { error: errorMessage });
      throw new Error(errorMessage);
    }
  }

  async login(loginData: LoginData): Promise<User> {
    try {
      this.notify("logging_in");
      const user = await this.authManager.login(this.baseUrl, loginData);
      this.notify("logged_in", { user });
      return user;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Login failed";
      this.notify("auth_error", { error: errorMessage });
      throw new Error(errorMessage);
    }
  }

  async logout(): Promise<void> {
    try {
      this.notify("logging_out");
      await this.authManager.logout(this.baseUrl);
      this.cacheManager.clear();
      this.syncQueue = [];
      this.storageManager.remove("syncQueue");
      this.notify("logged_out");
    } catch (error) {
      // Even if logout API call fails, we still want to clear local state
      this.cacheManager.clear();
      this.syncQueue = [];
      this.storageManager.remove("syncQueue");
      this.notify("logged_out");

      console.warn("Logout API call failed, but local state cleared:", error);
    }
  }

  async changePassword(passwordData: ChangePasswordData): Promise<void> {
    try {
      await this.authManager.changePassword(this.baseUrl, passwordData);
      this.notify("logged_out"); // User needs to log in again
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Password change failed";
      this.notify("auth_error", { error: errorMessage });
      throw new Error(errorMessage);
    }
  }

  isAuthenticated(): boolean {
    const isAuth = this.authManager.isAuthenticated();
    if (!isAuth && this.getCurrentUser()) {
      this.notify("session_expired");
    }
    return isAuth;
  }

  getCurrentUser(): User | null {
    return this.authManager.getCurrentUser();
  }

  // ===== PROTOCOL OPERATIONS =====

  async getProtocols(
    filters: ProtocolFilters = {},
  ): Promise<Protocol[] | FullProtocol[]> {
    try {
      this.notify("loading", { type: "protocols" });

      const params = new URLSearchParams();
      if (filters.templates_only) params.set("templates_only", "true");
      if (filters.full) params.set("full", "true");

      const endpoint = filters.user_only
        ? `/protocols/my${params.toString() ? `?${params.toString()}` : ""}`
        : `/protocols${params.toString() ? `?${params.toString()}` : ""}`;

      const response = filters.full
        ? await this.apiRequest<ApiListResponse<FullProtocol>>(endpoint)
        : await this.apiRequest<ApiListResponse<Protocol>>(endpoint);
      this.notify("loaded", { type: "protocols" });
      return response.data;
    } catch (error) {
      this.notify("error", {
        type: "protocols_load",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  async getProtocol(
    id: string,
    full: boolean = false,
  ): Promise<FullProtocol | Protocol> {
    try {
      this.notify("loading", { type: "protocol", id });

      // Try local storage first for full protocols
      if (full) {
        const localProtocol = this.storageManager.get<StoredProtocol>(
          `protocol_${id}`,
        );
        if (localProtocol && this.isOnline) {
          // Use local data immediately but check server for updates in background
          this.apiRequest<ApiResponse<FullProtocol>>(`/protocols/${id}/full`)
            .then((response) => {
              const serverProtocol = response.data;
              const serverTimestamp = new Date(serverProtocol.updated_at);
              const localTimestamp = new Date(localProtocol.lastModified);

              if (serverTimestamp > localTimestamp) {
                const updatedProtocol: StoredProtocol = {
                  ...serverProtocol,
                  lastModified: new Date().toISOString(),
                  syncStatus: "synced",
                };
                this.storageManager.set(`protocol_${id}`, updatedProtocol);
                this.notify("protocol_updated", updatedProtocol);
              }
            })
            .catch(() => {
              this.notify("sync_warning", {
                message: "Could not check for updates",
              });
            });

          return localProtocol;
        }
      }

      // Fetch from server
      if (this.isOnline) {
        const endpoint = full ? `/protocols/${id}/full` : `/protocols/${id}`;
        const response =
          await this.apiRequest<ApiResponse<FullProtocol | Protocol>>(endpoint);

        if (full) {
          const storedProtocol: StoredProtocol = {
            ...(response.data as FullProtocol),
            lastModified: new Date().toISOString(),
            syncStatus: "synced",
          };
          this.storageManager.set(`protocol_${id}`, storedProtocol);
        }

        this.notify("loaded", { type: "protocol", id });
        return response.data;
      }

      throw new Error("Protocol not available offline");
    } catch (error) {
      this.notify("error", {
        type: "protocol_load",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  async createProtocol(data: CreateProtocolData): Promise<Protocol> {
    try {
      this.notify("creating", { type: "protocol" });

      const response = await this.apiRequest<ApiResponse<Protocol>>(
        "/protocols",
        {
          method: "POST",
          body: data,
        },
      );

      this.notify("created", { type: "protocol", data: response.data });
      return response.data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create protocol";
      this.notify("error", { type: "protocol_create", error: errorMessage });
      throw new Error(errorMessage);
    }
  }

  async updateProtocol(
    id: string,
    data: UpdateProtocolData,
  ): Promise<Protocol> {
    try {
      this.notify("updating", { type: "protocol", id });

      const response = await this.apiRequest<ApiResponse<Protocol>>(
        `/protocols/${id}`,
        {
          method: "PUT",
          body: data,
        },
      );

      // Update local storage if exists, preserving task data
      const localProtocol = this.storageManager.get<StoredProtocol>(
        `protocol_${id}`,
      );
      if (localProtocol) {
        const updatedProtocol: StoredProtocol = {
          ...localProtocol,
          ...response.data,
          // Preserve existing tasks to avoid data loss
          tasks: localProtocol.tasks,
          lastModified: new Date().toISOString(),
          syncStatus: "synced",
        };
        this.storageManager.set(`protocol_${id}`, updatedProtocol);
        this.notify("protocol_updated", updatedProtocol);
      }

      this.notify("updated", { type: "protocol", data: response.data });
      return response.data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update protocol";
      this.notify("error", { type: "protocol_update", error: errorMessage });
      throw new Error(errorMessage);
    }
  }

  async deleteProtocol(id: string): Promise<void> {
    try {
      this.notify("deleting", { type: "protocol", id });

      await this.apiRequest(`/protocols/${id}`, {
        method: "DELETE",
      });

      // Remove from local storage
      this.storageManager.remove(`protocol_${id}`);

      this.notify("deleted", { type: "protocol", id });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete protocol";
      this.notify("error", { type: "protocol_delete", error: errorMessage });
      throw new Error(errorMessage);
    }
  }

  async addTaskToProtocol(
    protocolId: string,
    taskId: string,
    data: AddTaskToProtocolData = {},
  ): Promise<{ protocol_task_id: string }> {
    try {
      this.notify("updating", { type: "protocol", id: protocolId });

      const response = await this.apiRequest<
        ApiResponse<{ protocol_task_id: string }>
      >(`/protocols/${protocolId}/tasks/${taskId}`, {
        method: "POST",
        body: data,
      });

      // Invalidate local protocol cache and reload
      this.storageManager.remove(`protocol_${protocolId}`);

      // Reload protocol data to ensure consistency
      try {
        const updatedProtocol = await this.apiRequest<
          ApiResponse<FullProtocol>
        >(`/protocols/${protocolId}/full`);
        const storedProtocol: StoredProtocol = {
          ...updatedProtocol.data,
          lastModified: new Date().toISOString(),
          syncStatus: "synced",
        };
        this.storageManager.set(`protocol_${protocolId}`, storedProtocol);
        this.notify("protocol_updated", storedProtocol);
      } catch (reloadError) {
        console.warn(
          "Failed to reload protocol after adding task:",
          reloadError,
        );
      }

      this.notify("task_added", { protocolId, taskId, data: response.data });
      return response.data;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to add task to protocol";
      this.notify("error", { type: "protocol_task_add", error: errorMessage });
      throw new Error(errorMessage);
    }
  }

  async removeTaskFromProtocol(
    protocolId: string,
    taskId: string,
  ): Promise<void> {
    try {
      this.notify("updating", { type: "protocol", id: protocolId });

      await this.apiRequest(`/protocols/${protocolId}/tasks/${taskId}`, {
        method: "DELETE",
      });

      // Invalidate local protocol cache and reload
      this.storageManager.remove(`protocol_${protocolId}`);

      // Reload protocol data to ensure consistency
      try {
        const updatedProtocol = await this.apiRequest<
          ApiResponse<FullProtocol>
        >(`/protocols/${protocolId}/full`);
        const storedProtocol: StoredProtocol = {
          ...updatedProtocol.data,
          lastModified: new Date().toISOString(),
          syncStatus: "synced",
        };
        this.storageManager.set(`protocol_${protocolId}`, storedProtocol);
        this.notify("protocol_updated", storedProtocol);
      } catch (reloadError) {
        console.warn(
          "Failed to reload protocol after removing task:",
          reloadError,
        );
      }

      this.notify("task_removed", { protocolId, taskId });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to remove task from protocol";
      this.notify("error", {
        type: "protocol_task_remove",
        error: errorMessage,
      });
      throw new Error(errorMessage);
    }
  }

  async updateTaskOrder(
    protocolId: string,
    taskId: string,
    orderIndex: number,
  ): Promise<void> {
    try {
      this.notify("updating", { type: "protocol", id: protocolId });

      await this.apiRequest(`/protocols/${protocolId}/tasks/${taskId}/order`, {
        method: "PUT",
        body: { order_index: orderIndex },
      });

      // Update local protocol cache if it exists
      const localProtocol = this.storageManager.get<StoredProtocol>(
        `protocol_${protocolId}`,
      );
      if (localProtocol) {
        // Update the task order in local cache
        const updatedTasks = localProtocol.tasks
          .map((task) =>
            task.task_id === taskId
              ? { ...task, order_index: orderIndex }
              : task,
          )
          .sort((a, b) => a.order_index - b.order_index);

        const updatedProtocol: StoredProtocol = {
          ...localProtocol,
          tasks: updatedTasks,
          lastModified: new Date().toISOString(),
          syncStatus: "synced",
        };
        this.storageManager.set(`protocol_${protocolId}`, updatedProtocol);
        this.notify("protocol_updated", updatedProtocol);
      }

      this.notify("task_reordered", { protocolId, taskId, orderIndex });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update task order";
      this.notify("error", {
        type: "protocol_task_reorder",
        error: errorMessage,
      });
      throw new Error(errorMessage);
    }
  }

  async reorderProtocolTasks(
    protocolId: string,
    taskOrders: { task_id: string; order_index: number }[],
  ): Promise<void> {
    try {
      this.notify("updating", { type: "protocol", id: protocolId });

      await this.apiRequest(`/protocols/${protocolId}/tasks/reorder`, {
        method: "PUT",
        body: { task_orders: taskOrders },
      });

      // Update local protocol cache if it exists
      const localProtocol = this.storageManager.get<StoredProtocol>(
        `protocol_${protocolId}`,
      );
      if (localProtocol) {
        // Update task orders in local cache
        const updatedTasks = localProtocol.tasks
          .map((task) => {
            const newOrder = taskOrders.find(
              (order) => order.task_id === task.task_id,
            );
            return newOrder
              ? { ...task, order_index: newOrder.order_index }
              : task;
          })
          .sort((a, b) => a.order_index - b.order_index);

        const updatedProtocol: StoredProtocol = {
          ...localProtocol,
          tasks: updatedTasks,
          lastModified: new Date().toISOString(),
          syncStatus: "synced",
        };
        this.storageManager.set(`protocol_${protocolId}`, updatedProtocol);
        this.notify("protocol_updated", updatedProtocol);
      }

      this.notify("tasks_reordered", { protocolId, taskOrders });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to reorder protocol tasks";
      this.notify("error", {
        type: "protocol_tasks_reorder",
        error: errorMessage,
      });
      throw new Error(errorMessage);
    }
  }

  // ===== TASK OPERATIONS =====

  async getTasks(
    filters: TaskFilters = {},
  ): Promise<Task[] | TaskWithRelations[]> {
    try {
      this.notify("loading", { type: "tasks" });

      const params = new URLSearchParams();
      if (filters.type) params.set("type", filters.type);
      if (filters.user_only) params.set("user_only", "true");
      if (filters.with_relations) params.set("with_relations", "true");

      const endpoint = `/tasks${params.toString() ? `?${params.toString()}` : ""}`;
      const response =
        await this.apiRequest<ApiListResponse<Task | TaskWithRelations>>(
          endpoint,
        );

      this.notify("loaded", { type: "tasks" });
      return response.data;
    } catch (error) {
      this.notify("error", {
        type: "tasks_load",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  async getTask(
    id: string,
    withRelations: boolean = false,
  ): Promise<Task | TaskWithRelations> {
    try {
      this.notify("loading", { type: "task", id });

      const params = withRelations ? "?with_relations=true" : "";
      const response = await this.apiRequest<
        ApiResponse<Task | TaskWithRelations>
      >(`/tasks/${id}${params}`);

      this.notify("loaded", { type: "task", id });
      return response.data;
    } catch (error) {
      this.notify("error", {
        type: "task_load",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  async searchTasks(query: string): Promise<Task[]> {
    try {
      this.notify("loading", { type: "tasks" });

      const response = await this.apiRequest<ApiListResponse<Task>>(
        `/tasks/search/${encodeURIComponent(query)}`,
      );

      this.notify("loaded", { type: "tasks" });
      return response.data;
    } catch (error) {
      this.notify("error", {
        type: "tasks_search",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  async createTask(data: CreateTaskData): Promise<Task> {
    try {
      this.notify("creating", { type: "task" });

      const response = await this.apiRequest<ApiResponse<Task>>("/tasks", {
        method: "POST",
        body: data,
      });

      this.notify("created", { type: "task", data: response.data });
      return response.data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create task";
      this.notify("error", { type: "task_create", error: errorMessage });
      throw new Error(errorMessage);
    }
  }

  async updateTask(id: string, data: UpdateTaskData): Promise<Task> {
    try {
      this.notify("updating", { type: "task", id });

      const response = await this.apiRequest<ApiResponse<Task>>(
        `/tasks/${id}`,
        {
          method: "PUT",
          body: data,
        },
      );

      this.notify("updated", { type: "task", data: response.data });
      return response.data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update task";
      this.notify("error", { type: "task_update", error: errorMessage });
      throw new Error(errorMessage);
    }
  }

  async deleteTask(id: string): Promise<void> {
    try {
      this.notify("deleting", { type: "task", id });

      await this.apiRequest(`/tasks/${id}`, {
        method: "DELETE",
      });

      this.notify("deleted", { type: "task", id });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete task";
      this.notify("error", { type: "task_delete", error: errorMessage });
      throw new Error(errorMessage);
    }
  }

  async getTaskSensors(taskId: string): Promise<Sensor[]> {
    try {
      const response = await this.apiRequest<ApiListResponse<Sensor>>(
        `/tasks/${taskId}/sensors`,
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to get task sensors",
      );
    }
  }

  async getTaskDomains(taskId: string): Promise<Domain[]> {
    try {
      const response = await this.apiRequest<ApiListResponse<Domain>>(
        `/tasks/${taskId}/domains`,
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to get task domains",
      );
    }
  }

  // ===== SENSOR OPERATIONS =====

  async getSensors(filters: SensorFilters = {}): Promise<Sensor[]> {
    try {
      this.notify("loading", { type: "sensors" });

      const params = new URLSearchParams();
      if (filters.category) params.set("category", filters.category);
      if (filters.user_only) params.set("user_only", "true");

      const endpoint = filters.user_only
        ? "/sensors"
        : `/sensors${params.toString() ? `?${params.toString()}` : ""}`;

      const response = await this.apiRequest<ApiListResponse<Sensor>>(endpoint);

      this.notify("loaded", { type: "sensors" });
      return response.data;
    } catch (error) {
      this.notify("error", {
        type: "sensors_load",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  async getPublicSensors(): Promise<Sensor[]> {
    try {
      const response =
        await this.apiRequest<ApiListResponse<Sensor>>("/sensors/public");
      return response.data;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to get public sensors",
      );
    }
  }

  async searchSensors(query: string): Promise<Sensor[]> {
    try {
      const response = await this.apiRequest<ApiListResponse<Sensor>>(
        `/sensors/search/${encodeURIComponent(query)}`,
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to search sensors",
      );
    }
  }

  async createSensor(data: CreateSensorData): Promise<Sensor> {
    try {
      this.notify("creating", { type: "sensor" });

      const response = await this.apiRequest<ApiResponse<Sensor>>("/sensors", {
        method: "POST",
        body: data,
      });

      this.notify("created", { type: "sensor", data: response.data });
      return response.data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create sensor";
      this.notify("error", { type: "sensor_create", error: errorMessage });
      throw new Error(errorMessage);
    }
  }

  async updateSensor(id: string, data: UpdateSensorData): Promise<Sensor> {
    try {
      this.notify("updating", { type: "sensor", id });

      const response = await this.apiRequest<ApiResponse<Sensor>>(
        `/sensors/${id}`,
        {
          method: "PUT",
          body: data,
        },
      );

      this.notify("updated", { type: "sensor", data: response.data });
      return response.data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update sensor";
      this.notify("error", { type: "sensor_update", error: errorMessage });
      throw new Error(errorMessage);
    }
  }

  async deleteSensor(id: string): Promise<void> {
    try {
      this.notify("deleting", { type: "sensor", id });

      await this.apiRequest(`/sensors/${id}`, {
        method: "DELETE",
      });

      this.notify("deleted", { type: "sensor", id });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete sensor";
      this.notify("error", { type: "sensor_delete", error: errorMessage });
      throw new Error(errorMessage);
    }
  }

  // ===== DOMAIN OPERATIONS =====

  async getDomains(filters: DomainFilters = {}): Promise<Domain[]> {
    try {
      this.notify("loading", { type: "domains" });

      const params = new URLSearchParams();
      if (filters.user_only) params.set("user_only", "true");

      const endpoint = `/domains${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await this.apiRequest<ApiListResponse<Domain>>(endpoint);

      this.notify("loaded", { type: "domains" });
      return response.data;
    } catch (error) {
      this.notify("error", {
        type: "domains_load",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  async getPublicDomains(): Promise<Domain[]> {
    try {
      const response =
        await this.apiRequest<ApiListResponse<Domain>>("/domains/public");
      return response.data;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to get public domains",
      );
    }
  }

  async createDomain(data: CreateDomainData): Promise<Domain> {
    try {
      this.notify("creating", { type: "domain" });

      const response = await this.apiRequest<ApiResponse<Domain>>("/domains", {
        method: "POST",
        body: data,
      });

      this.notify("created", { type: "domain", data: response.data });
      return response.data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create domain";
      this.notify("error", { type: "domain_create", error: errorMessage });
      throw new Error(errorMessage);
    }
  }

  async updateDomain(id: string, data: UpdateDomainData): Promise<Domain> {
    try {
      this.notify("updating", { type: "domain", id });

      const response = await this.apiRequest<ApiResponse<Domain>>(
        `/domains/${id}`,
        {
          method: "PUT",
          body: data,
        },
      );

      this.notify("updated", { type: "domain", data: response.data });
      return response.data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update domain";
      this.notify("error", { type: "domain_update", error: errorMessage });
      throw new Error(errorMessage);
    }
  }

  async deleteDomain(id: string): Promise<void> {
    try {
      this.notify("deleting", { type: "domain", id });

      await this.apiRequest(`/domains/${id}`, {
        method: "DELETE",
      });

      this.notify("deleted", { type: "domain", id });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete domain";
      this.notify("error", { type: "domain_delete", error: errorMessage });
      throw new Error(errorMessage);
    }
  }

  // ===== SYNC OPERATIONS =====

  private addToSyncQueue(item: SyncQueueItem): void {
    // Remove existing item with same type and id
    this.syncQueue = this.syncQueue.filter(
      (existing) => !(existing.type === item.type && existing.id === item.id),
    );

    // Add new item
    this.syncQueue.push(item);

    // Save to storage
    this.storageManager.set("syncQueue", this.syncQueue);

    // Debounced sync
    this.debouncedSync();
  }

  private debouncedSync(): void {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }

    this.syncTimeout = setTimeout(() => {
      if (this.isOnline) {
        this.syncPendingChanges();
      }
    }, 1000);
  }

  async syncPendingChanges(): Promise<void> {
    if (!this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    this.notify("syncing");

    const failedItems: SyncQueueItem[] = [];

    for (const item of this.syncQueue) {
      try {
        // Implement sync logic based on item type and action
        // This is a simplified version - in practice you'd need more detailed sync logic
        await this.performSyncAction(item);
      } catch (error) {
        console.error("Sync failed for item:", item, error);
        item.attempts = (item.attempts || 0) + 1;

        // Retry up to 3 times
        if (item.attempts < 3) {
          failedItems.push(item);
        }
      }
    }

    this.syncQueue = failedItems;
    this.storageManager.set("syncQueue", this.syncQueue);

    if (failedItems.length > 0) {
      this.notify("sync_failed", { failedCount: failedItems.length });
    } else {
      this.notify("synced");
    }
  }

  private async performSyncAction(item: SyncQueueItem): Promise<void> {
    // This would contain the actual sync logic for each item type
    // For now, this is a placeholder
    console.log("Syncing item:", item);
  }

  // ===== CACHE & STATUS =====

  getCacheInfo(): any {
    return this.cacheManager.getStats();
  }

  clearCache(key?: string): void {
    if (key) {
      this.cacheManager.delete(key);
    } else {
      this.cacheManager.clear();
    }
    this.notify("cache_cleared", { key });
  }

  getStatus(): DataProviderStatus {
    return {
      online: this.isOnline,
      authenticated: this.isAuthenticated(),
      pendingSync: this.syncQueue.length,
      cacheKeys: this.cacheManager.getKeys(),
      tokenExpiry: this.authManager.getTokenExpiry() || undefined,
    };
  }

  destroy(): void {
    if (this.periodicSyncInterval) {
      clearInterval(this.periodicSyncInterval);
    }
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }
    this.listeners = [];
    this.syncQueue = [];
  }
}

// Create singleton instance
const storageManager = new StorageManager();
const cacheManager = new CacheManager();
const authManager = new AuthManager(storageManager);
export const dataProvider = new DataProvider(
  process.env.REACT_APP_API_URL || "http://localhost:3001",
  storageManager,
  cacheManager,
  authManager,
);
