import { apiService, ProtocolListItem } from "./api";
import { Protocol } from "../types";

export interface ProtocolUploadResult {
  success: boolean;
  message?: string;
  error?: string;
  protocolId?: string;
  size?: number;
}

export interface SavedProtocol {
  id: string;
  name: string;
  data: any;
  savedLocally: boolean;
  uploadedToServer: boolean;
  lastSaved: Date;
  lastUploaded?: Date;
}

class ProtocolService {
  private readonly LOCAL_STORAGE_KEY = "delphi-protocol";
  private readonly UPLOADS_CACHE_KEY = "delphi-uploads-cache";

  // Save protocol locally
  saveLocally(protocol: Protocol): void {
    try {
      const savedProtocol: SavedProtocol = {
        id: protocol.id,
        name: protocol.name || "Untitled Protocol",
        data: protocol,
        savedLocally: true,
        uploadedToServer: false,
        lastSaved: new Date(),
      };

      localStorage.setItem(
        this.LOCAL_STORAGE_KEY,
        JSON.stringify(savedProtocol),
      );
    } catch (error) {
      console.error("Failed to save protocol locally:", error);
    }
  }

  // Load protocol from local storage
  loadLocal(): SavedProtocol | null {
    try {
      const saved = localStorage.getItem(this.LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);

        // Handle old format where protocol was stored directly
        if (parsed && !parsed.data && parsed.id) {
          // Old format - convert to new format
          return {
            id: parsed.id,
            name: parsed.name || "Untitled Protocol",
            data: parsed,
            savedLocally: true,
            uploadedToServer: false,
            lastSaved: parsed.updatedAt
              ? new Date(parsed.updatedAt)
              : new Date(),
          };
        }

        // New format
        if (parsed && parsed.data) {
          return {
            ...parsed,
            lastSaved: parsed.lastSaved
              ? new Date(parsed.lastSaved)
              : new Date(),
            lastUploaded: parsed.lastUploaded
              ? new Date(parsed.lastUploaded)
              : undefined,
          };
        }
      }
    } catch (error) {
      console.error("Failed to load local protocol:", error);
      // Clear corrupted data
      localStorage.removeItem(this.LOCAL_STORAGE_KEY);
    }
    return null;
  }

  // Upload protocol to server
  async uploadToServer(
    password: string,
    protocol: Protocol,
  ): Promise<ProtocolUploadResult> {
    const result = await apiService.uploadProtocol(password, protocol);

    if (result.success && result.data) {
      // Update local storage to mark as uploaded
      const localProtocol = this.loadLocal();
      if (localProtocol) {
        const updatedProtocol: SavedProtocol = {
          ...localProtocol,
          uploadedToServer: true,
          lastUploaded: new Date(),
        };
        localStorage.setItem(
          this.LOCAL_STORAGE_KEY,
          JSON.stringify(updatedProtocol),
        );
      }

      return {
        success: true,
        message: result.data.message,
        protocolId: result.data.protocolId,
        size: result.data.size,
      };
    }

    return {
      success: false,
      error: result.error || "Upload failed",
    };
  }

  // Get user's uploaded protocols
  async getUserUploads(password: string): Promise<ProtocolListItem[]> {
    const result = await apiService.getUploads(password);

    if (result.success && result.data) {
      // Cache the results
      try {
        localStorage.setItem(
          this.UPLOADS_CACHE_KEY,
          JSON.stringify({
            data: result.data,
            timestamp: Date.now(),
          }),
        );
      } catch (error) {
        console.warn("Failed to cache uploads:", error);
      }

      return result.data;
    }

    // Try to return cached data if available
    try {
      const cached = localStorage.getItem(this.UPLOADS_CACHE_KEY);
      if (cached) {
        const parsedCache = JSON.parse(cached);
        // Return cached data if it's less than 5 minutes old
        if (Date.now() - parsedCache.timestamp < 5 * 60 * 1000) {
          return parsedCache.data;
        }
      }
    } catch (error) {
      console.warn("Failed to load cached uploads:", error);
    }

    return [];
  }

  // Parse protocol data from server response
  parseProtocolFromUpload(upload: ProtocolListItem): Protocol | null {
    try {
      return JSON.parse(upload.protocol_data);
    } catch (error) {
      console.error("Failed to parse protocol data:", error);
      return null;
    }
  }

  // Check if current protocol needs saving
  needsSaving(protocol: Protocol): boolean {
    const local = this.loadLocal();
    if (!local) return true;

    // Simple comparison - in production you might want more sophisticated change detection
    const currentJson = JSON.stringify(protocol);
    const savedJson = JSON.stringify(local.data);

    return currentJson !== savedJson;
  }

  // Check if protocol needs uploading
  needsUploading(): boolean {
    const local = this.loadLocal();
    if (!local) return false;

    return local.savedLocally && !local.uploadedToServer;
  }

  // Clear all local data
  clearLocal(): void {
    localStorage.removeItem(this.LOCAL_STORAGE_KEY);
    localStorage.removeItem(this.UPLOADS_CACHE_KEY);
  }

  // Get sync status
  getSyncStatus(): {
    hasLocalChanges: boolean;
    needsUpload: boolean;
    lastSaved?: Date;
    lastUploaded?: Date;
  } {
    const local = this.loadLocal();

    return {
      hasLocalChanges: !!local?.savedLocally,
      needsUpload: this.needsUploading(),
      lastSaved: local?.lastSaved,
      lastUploaded: local?.lastUploaded,
    };
  }
}

export const protocolService = new ProtocolService();

// Utility function to clear old data format and start fresh
export const clearOldProtocolData = () => {
  try {
    localStorage.removeItem("delphi-protocol");
    localStorage.removeItem("delphi-uploads-cache");
    localStorage.removeItem("delphi-auth");
    console.log("Cleared old protocol data");
  } catch (error) {
    console.error("Failed to clear old data:", error);
  }
};
