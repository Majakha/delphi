import { Protocol } from "../types";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AuthUser {
  userId: number;
  password: string;
}

export interface UploadResponse {
  message: string;
  protocolId: string;
  protocolName: string;
  size: number;
  userId: number;
}

export interface ProtocolListItem {
  id: number;
  protocol_id: string;
  protocol_name: string;
  protocol_data: string;
  created_at: string;
  updated_at: string;
}

class ApiService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        ...options,
      });

      if (response.ok) {
        const contentType = response.headers.get("content-type");
        let data;

        if (contentType && contentType.includes("application/json")) {
          data = await response.json();
        } else {
          data = await response.text();
        }

        return { success: true, data };
      } else {
        const error = await response.text();
        return {
          success: false,
          error: error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Network error occurred",
      };
    }
  }

  async checkPassword(password: string): Promise<ApiResponse<AuthUser>> {
    return this.makeRequest<AuthUser>("/api/check-password", {
      method: "POST",
      body: JSON.stringify({ password }),
    });
  }

  async uploadProtocol(
    password: string,
    protocol: Protocol,
  ): Promise<ApiResponse<UploadResponse>> {
    return this.makeRequest<UploadResponse>("/api/upload", {
      method: "POST",
      body: JSON.stringify({ password, protocol }),
    });
  }

  async getUploads(password: string): Promise<ApiResponse<ProtocolListItem[]>> {
    return this.makeRequest<ProtocolListItem[]>("/api/uploads", {
      method: "POST",
      body: JSON.stringify({ password }),
    });
  }
}

export const apiService = new ApiService();
