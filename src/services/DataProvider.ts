import {
  Protocol,
  Sensor,
  SharedSection,
  SharedSubsection,
  User,
  SyncQueueItem,
  StoredProtocol,
  DataProviderStatus,
  DataProviderEventCallback,
  NotificationType,
  CreateProtocolData,
  CreateSensorData,
  CreateSectionData,
  CreateSubsectionData,
  RequestOptions,
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
  private listeners = new Set<DataProviderEventCallback>();
  private isOnline: boolean = navigator.onLine;
  private syncTimeout: NodeJS.Timeout | null = null;
  private periodicSyncInterval: NodeJS.Timeout | null = null;

  constructor(baseUrl?: string) {
    // Determine the correct API base URL based on environment
    if (!baseUrl) {
      if (process.env.REACT_APP_API_BASE_URL) {
        // Use explicit environment variable if set
        baseUrl = process.env.REACT_APP_API_BASE_URL;
      } else {
        // Default to API container URL for Docker environment
        baseUrl = "http://localhost:3001";
      }
    }
    this.baseUrl = baseUrl;
    this.storageManager = new StorageManager();
    this.authManager = new AuthManager(this.storageManager);
    this.cacheManager = new CacheManager();

    this.initializeEventListeners();
    this.startPeriodicSync();
  }

  // ===== EVENT SYSTEM =====

  /**
   * Subscribe to data provider events
   */
  subscribe(callback: DataProviderEventCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of an event
   */
  private notify(type: NotificationType, data?: any): void {
    this.listeners.forEach((callback) => {
      try {
        callback(type, data);
      } catch (error) {
        console.error("Listener error:", error);
      }
    });
  }

  // ===== INITIALIZATION =====

  private initializeEventListeners(): void {
    window.addEventListener("online", () => {
      this.isOnline = true;
      this.syncPendingChanges();
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
    });

    window.addEventListener("beforeunload", () => {
      if (this.syncQueue.length > 0) {
        this.syncPendingChanges();
      }
    });
  }

  private startPeriodicSync(): void {
    this.periodicSyncInterval = setInterval(() => {
      if (this.isOnline && this.syncQueue.length > 0) {
        this.syncPendingChanges();
      }
    }, 60000); // 60 seconds
  }

  // ===== API REQUEST HANDLING =====

  /**
   * Generic API request handler with authentication
   */
  private async apiRequest<T = any>(
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
        this.notify("auth_error", { message: "Access forbidden" });
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

  async login(password: string): Promise<User> {
    try {
      this.notify("logging_in");
      const user = await this.authManager.login(this.baseUrl, password);
      this.notify("logged_in", { user });
      return user;
    } catch (error) {
      // Parse structured error response
      let errorMessage = "Login failed";
      if (error instanceof Error) {
        try {
          // Try to parse JSON error from API response
          const match = error.message.match(/API Error: \d+ (.+)/);
          if (match) {
            const errorData = JSON.parse(match[1]);
            errorMessage =
              errorData?.error?.message || errorData?.message || error.message;
          } else {
            errorMessage = error.message;
          }
        } catch {
          errorMessage = error.message;
        }
      }

      this.notify("auth_error", { error: errorMessage });
      throw new Error(errorMessage);
    }
  }

  async logout(): Promise<void> {
    try {
      await this.authManager.logout(this.baseUrl);
      this.cacheManager.clear();
      this.syncQueue = [];
      this.notify("logged_out");
    } catch (error) {
      // Even if logout API call fails, we still want to clear local state
      this.cacheManager.clear();
      this.syncQueue = [];
      this.notify("logged_out");

      console.warn("Logout API call failed, but local state cleared:", error);
    }
  }

  isAuthenticated(): boolean {
    const isAuth = this.authManager.isAuthenticated();
    // If auth manager thinks we're not authenticated but we haven't notified yet
    if (!isAuth && this.getCurrentUser()) {
      this.notify("session_expired");
    }
    return isAuth;
  }

  getCurrentUser(): User | null {
    return this.authManager.getCurrentUser();
  }

  // ===== PROTOCOL OPERATIONS =====

  async loadProtocol(id: string): Promise<StoredProtocol> {
    try {
      this.notify("loading", { type: "protocol", id });

      // Try local storage first
      const localProtocol = this.storageManager.get<StoredProtocol>(
        `protocol_${id}`,
      );

      if (localProtocol && this.isOnline) {
        // Use local data immediately but check server for updates
        this.apiRequest<Protocol>(`/protocols/${id}`)
          .then((serverProtocol) => {
            const serverTimestamp = new Date(serverProtocol.updatedAt);
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

      // No local data or offline, fetch from server
      if (this.isOnline) {
        const protocol = await this.apiRequest<Protocol>(`/protocols/${id}`);
        const storedProtocol: StoredProtocol = {
          ...protocol,
          lastModified: new Date().toISOString(),
          syncStatus: "synced",
        };
        this.storageManager.set(`protocol_${id}`, storedProtocol);
        this.notify("loaded", { type: "protocol", id });
        return storedProtocol;
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

  async saveProtocol(protocol: Protocol): Promise<StoredProtocol> {
    const timestamp = new Date().toISOString();

    // Always save to localStorage immediately
    const localProtocol: StoredProtocol = {
      ...protocol,
      lastModified: timestamp,
      syncStatus: "pending",
    };

    this.storageManager.set(`protocol_${protocol.id}`, localProtocol);

    // Add to sync queue if online
    if (this.isOnline) {
      this.addToSyncQueue("protocol", protocol.id, protocol, timestamp);
      this.debouncedSync();
    }

    this.notify("saved_locally", { type: "protocol", id: protocol.id });
    return localProtocol;
  }

  async createProtocol(protocolData: CreateProtocolData): Promise<Protocol> {
    try {
      this.notify("creating", { type: "protocol" });

      if (!this.isOnline) {
        throw new Error("Cannot create new protocol while offline");
      }

      const protocol = await this.apiRequest<Protocol>("/protocols", {
        method: "POST",
        body: protocolData,
      });

      // Save to localStorage
      const storedProtocol: StoredProtocol = {
        ...protocol,
        lastModified: new Date().toISOString(),
        syncStatus: "synced",
      };
      this.storageManager.set(`protocol_${protocol.id}`, storedProtocol);

      this.notify("created", { type: "protocol", id: protocol.id });
      return protocol;
    } catch (error) {
      this.notify("error", {
        type: "protocol_create",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  async deleteProtocol(id: string): Promise<void> {
    try {
      this.notify("deleting", { type: "protocol", id });

      if (this.isOnline) {
        await this.apiRequest(`/protocols/${id}`, { method: "DELETE" });
      }

      this.storageManager.remove(`protocol_${id}`);
      this.notify("deleted", { type: "protocol", id });
    } catch (error) {
      this.notify("error", {
        type: "protocol_delete",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  // ===== SHARED CONTENT OPERATIONS =====

  async getSensors(forceRefresh: boolean = false): Promise<Sensor[]> {
    const cacheKey = "sensors";
    const cached = this.cacheManager.get<Sensor[]>(cacheKey);

    if (!forceRefresh && cached) {
      return cached;
    }

    try {
      this.notify("loading", { type: "sensors" });

      const response = await this.apiRequest<{
        data: Sensor[];
        success: boolean;
        message: string;
      }>("/sensors");
      const sensors = response.data;
      this.cacheManager.set(cacheKey, sensors);

      this.notify("loaded", { type: "sensors", count: sensors.length });
      return sensors;
    } catch (error) {
      if (cached) {
        this.notify("using_cached", { type: "sensors" });
        return cached;
      }

      this.notify("error", {
        type: "sensors_load",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  async getSections(forceRefresh: boolean = false): Promise<SharedSection[]> {
    const cacheKey = "sections";
    const cached = this.cacheManager.get<SharedSection[]>(cacheKey);

    if (!forceRefresh && cached) {
      return cached;
    }

    try {
      this.notify("loading", { type: "sections" });

      const response = await this.apiRequest<{
        data: SharedSection[];
        success: boolean;
        message: string;
      }>("/sections");
      const sections = response.data;
      this.cacheManager.set(cacheKey, sections);

      this.notify("loaded", { type: "sections", count: sections.length });
      return sections;
    } catch (error) {
      if (cached) {
        this.notify("using_cached", { type: "sections" });
        return cached;
      }

      this.notify("error", {
        type: "sections_load",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  async getSubsections(
    forceRefresh: boolean = false,
  ): Promise<SharedSubsection[]> {
    const cacheKey = "subsections";
    const cached = this.cacheManager.get<SharedSubsection[]>(cacheKey);

    if (!forceRefresh && cached) {
      return cached;
    }

    try {
      this.notify("loading", { type: "subsections" });

      const response = await this.apiRequest<{
        data: SharedSubsection[];
        success: boolean;
        message: string;
      }>("/subsections");
      const subsections = response.data;
      this.cacheManager.set(cacheKey, subsections);

      this.notify("loaded", { type: "subsections", count: subsections.length });
      return subsections;
    } catch (error) {
      if (cached) {
        this.notify("using_cached", { type: "subsections" });
        return cached;
      }

      this.notify("error", {
        type: "subsections_load",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  async createSensor(sensorData: CreateSensorData): Promise<Sensor> {
    try {
      this.notify("creating", { type: "sensor" });

      const response = await this.apiRequest<{
        data: Sensor;
        success: boolean;
        message: string;
      }>("/sensors", {
        method: "POST",
        body: sensorData,
      });
      const sensor = response.data;

      // Update cache with new sensor
      const cached = this.cacheManager.get<Sensor[]>("sensors");
      if (cached) {
        cached.push(sensor);
        this.cacheManager.set("sensors", cached);
      }

      this.notify("created", { type: "sensor", id: sensor.id });
      return sensor;
    } catch (error) {
      this.notify("error", {
        type: "sensor_create",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  async createSection(sectionData: CreateSectionData): Promise<SharedSection> {
    try {
      this.notify("creating", { type: "section" });

      const response = await this.apiRequest<{
        data: SharedSection;
        success: boolean;
        message: string;
      }>("/sections", {
        method: "POST",
        body: sectionData,
      });
      const section = response.data;

      // Update cache with new section
      const cached = this.cacheManager.get<SharedSection[]>("sections");
      if (cached) {
        this.cacheManager.set("sections", [...cached, section]);
      }

      this.notify("created", { type: "section", id: section.id });
      return section;
    } catch (error) {
      this.notify("error", {
        type: "section_create",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  async createSubsection(
    subsectionData: CreateSubsectionData,
  ): Promise<SharedSubsection> {
    try {
      this.notify("creating", { type: "subsection" });

      const response = await this.apiRequest<{
        data: SharedSubsection;
        success: boolean;
        message: string;
      }>("/subsections", {
        method: "POST",
        body: subsectionData,
      });
      const subsection = response.data;

      // Update cache with new subsection
      const cached = this.cacheManager.get<SharedSubsection[]>("subsections");
      if (cached) {
        this.cacheManager.set("subsections", [...cached, subsection]);
      }

      this.notify("created", { type: "subsection", id: subsection.id });
      return subsection;
    } catch (error) {
      this.notify("error", {
        type: "subsection_create",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  // ===== SYNC MANAGEMENT =====

  private addToSyncQueue(
    type: SyncQueueItem["type"],
    id: string,
    data: any,
    timestamp: string,
  ): void {
    // Remove existing entry for this item
    this.syncQueue = this.syncQueue.filter(
      (item) => !(item.type === type && item.id === id),
    );

    // Add new entry
    this.syncQueue.push({
      type,
      id,
      data,
      timestamp,
      attempts: 0,
    });
  }

  private debouncedSync(): void {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }
    this.syncTimeout = setTimeout(() => {
      this.syncPendingChanges();
    }, 3000); // 3 second delay
  }

  async syncPendingChanges(): Promise<void> {
    if (!this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    this.notify("syncing", { count: this.syncQueue.length });

    const syncPromises = this.syncQueue.map(async (item) => {
      try {
        if (item.type === "protocol") {
          await this.apiRequest(`/protocols/${item.id}`, {
            method: "PUT",
            body: item.data,
          });

          // Update local storage to mark as synced
          const localProtocol = this.storageManager.get<StoredProtocol>(
            `protocol_${item.id}`,
          );
          if (localProtocol) {
            localProtocol.syncStatus = "synced";
            localProtocol.lastSyncedAt = new Date().toISOString();
            this.storageManager.set(`protocol_${item.id}`, localProtocol);
          }
        }
        return { success: true, id: item.id };
      } catch (error) {
        item.attempts = (item.attempts || 0) + 1;
        return {
          success: false,
          id: item.id,
          error: error instanceof Error ? error.message : "Unknown error",
          attempts: item.attempts,
        };
      }
    });

    const results = await Promise.allSettled(syncPromises);
    const successful = results
      .filter(
        (r): r is PromiseFulfilledResult<{ success: true; id: string }> =>
          r.status === "fulfilled" && r.value.success,
      )
      .map((r) => r.value);

    const failed = results
      .filter(
        (
          r,
        ): r is PromiseFulfilledResult<{
          success: false;
          id: string;
          error: string;
          attempts: number;
        }> => r.status === "fulfilled" && !r.value.success,
      )
      .map((r) => r.value);

    // Remove successfully synced items from queue
    this.syncQueue = this.syncQueue.filter(
      (item) => !successful.some((s) => s.id === item.id),
    );

    // Remove items that have failed too many times (max 3 attempts)
    this.syncQueue = this.syncQueue.filter((item) => (item.attempts || 0) < 3);

    if (successful.length > 0) {
      this.notify("synced", { count: successful.length });
    }

    if (failed.length > 0) {
      this.notify("sync_failed", { count: failed.length });
    }
  }

  // ===== UTILITY METHODS =====

  getCacheInfo(
    key: string,
  ): { timestamp: string; age: number; size: number } | null {
    return this.cacheManager.getInfo(key);
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
      authenticated: this.authManager.isAuthenticated(),
      pendingSync: this.syncQueue.length,
      cacheKeys: this.cacheManager.getKeys(),
      tokenExpiry: this.authManager.getTokenExpiry() || undefined,
    };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }
    if (this.periodicSyncInterval) {
      clearInterval(this.periodicSyncInterval);
    }
    this.listeners.clear();
  }
}

// Create and export singleton instance
export const dataProvider = new DataProvider();
export default dataProvider;
