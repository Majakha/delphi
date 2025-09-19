import {
  AuthTokens,
  AuthResponse,
  User,
  ApiError,
  RegisterData,
  LoginData,
  ChangePasswordData,
} from "./types";
import { StorageManager } from "./StorageManager";

export class AuthManager {
  private storageManager: StorageManager;
  private accessToken: string | null = null;
  private tokenExpiry: string | null = null;
  private user: User | null = null;

  constructor(storageManager: StorageManager) {
    this.storageManager = storageManager;
    this.loadTokensFromStorage();
  }

  /**
   * Load tokens from localStorage on initialization
   */
  private loadTokensFromStorage(): void {
    this.accessToken = this.storageManager.get<string>("access_token");
    this.tokenExpiry = this.storageManager.get<string>("token_expiry");
    const storedUser = this.storageManager.get<User>("user");

    // Only set user if we have a valid token that hasn't expired
    if (this.accessToken && storedUser && !this.isTokenExpired(0)) {
      this.user = storedUser;
    } else if (this.accessToken) {
      // Token exists but is expired, clear auth data
      this.clearAuthTokens();
    }
  }

  /**
   * Store authentication tokens and user data
   */
  private setAuthTokens(token: string, expiresAt: string, user: User): void {
    this.accessToken = token;
    this.tokenExpiry = expiresAt;
    this.user = user;

    // Store in localStorage
    this.storageManager.set("access_token", this.accessToken);
    this.storageManager.set("token_expiry", this.tokenExpiry);
    this.storageManager.set("user", user);
  }

  /**
   * Clear authentication tokens and user data
   */
  private clearAuthTokens(): void {
    this.accessToken = null;
    this.tokenExpiry = null;
    this.user = null;

    // Clear from localStorage
    this.storageManager.remove("access_token");
    this.storageManager.remove("token_expiry");
    this.storageManager.remove("user");
  }

  /**
   * Check if token is expired or will expire soon
   */
  private isTokenExpired(bufferMinutes: number = 5): boolean {
    if (!this.tokenExpiry) return true;

    const now = new Date().getTime();
    const expiry = new Date(this.tokenExpiry).getTime();
    const buffer = bufferMinutes * 60 * 1000;

    return now >= expiry - buffer;
  }

  /**
   * Make API request with proper error handling
   */
  private async makeAuthRequest<T>(
    baseUrl: string,
    endpoint: string,
    method: string = "POST",
    body?: any,
  ): Promise<T> {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(this.accessToken && {
          Authorization: `Bearer ${this.accessToken}`,
        }),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseData = await response.json();

    if (!response.ok) {
      // Handle structured error responses from new API
      const errorMessage =
        responseData?.error?.message ||
        responseData?.message ||
        `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(errorMessage);
    }

    return responseData;
  }

  /**
   * Register a new user account
   */
  async register(baseUrl: string, registerData: RegisterData): Promise<User> {
    try {
      const response = await this.makeAuthRequest<{
        data: { username: string; email: string };
      }>(baseUrl, "/auth/register", "POST", registerData);

      return {
        id: "", // Will be set on login
        username: response.data.username,
        email: response.data.email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    } catch (error) {
      throw error instanceof Error ? error : new Error("Registration failed");
    }
  }

  /**
   * Authenticate with username/email and password
   */
  async login(baseUrl: string, loginData: LoginData): Promise<User> {
    try {
      const response = await this.makeAuthRequest<AuthResponse>(
        baseUrl,
        "/auth/login",
        "POST",
        loginData,
      );

      this.setAuthTokens(
        response.data.token,
        response.data.expiresAt,
        response.data.user,
      );

      return response.data.user;
    } catch (error) {
      throw error instanceof Error ? error : new Error("Login failed");
    }
  }

  /**
   * Logout user and clear tokens
   */
  async logout(baseUrl: string): Promise<void> {
    try {
      // Call logout endpoint if we have a token
      if (this.accessToken) {
        await this.makeAuthRequest(baseUrl, "/auth/logout", "POST").catch(
          () => {
            // Ignore logout errors - we're clearing local tokens anyway
          },
        );
      }
    } finally {
      this.clearAuthTokens();
    }
  }

  /**
   * Verify current token with server
   */
  async verifyToken(baseUrl: string): Promise<User> {
    if (!this.accessToken) {
      throw new Error("No token available");
    }

    try {
      const response = await this.makeAuthRequest<{ data: { user: User } }>(
        baseUrl,
        "/auth/verify",
        "GET",
      );

      // Update user data from server
      this.user = response.data.user;
      this.storageManager.set("user", this.user);

      return response.data.user;
    } catch (error) {
      // Token verification failed, clear auth data
      this.clearAuthTokens();
      throw error instanceof Error
        ? error
        : new Error("Token verification failed");
    }
  }

  /**
   * Get current user profile from server
   */
  async getProfile(baseUrl: string): Promise<User> {
    if (!this.accessToken) {
      throw new Error("Not authenticated");
    }

    try {
      const response = await this.makeAuthRequest<{ data: User }>(
        baseUrl,
        "/auth/profile",
        "GET",
      );

      // Update stored user data
      this.user = response.data;
      this.storageManager.set("user", this.user);

      return response.data;
    } catch (error) {
      throw error instanceof Error ? error : new Error("Failed to get profile");
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(
    baseUrl: string,
    updates: { username?: string; email?: string },
  ): Promise<User> {
    if (!this.accessToken) {
      throw new Error("Not authenticated");
    }

    try {
      const response = await this.makeAuthRequest<{ data: User }>(
        baseUrl,
        "/auth/profile",
        "PUT",
        updates,
      );

      // Update stored user data
      this.user = response.data;
      this.storageManager.set("user", this.user);

      return response.data;
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error("Failed to update profile");
    }
  }

  /**
   * Change user password
   */
  async changePassword(
    baseUrl: string,
    passwordData: ChangePasswordData,
  ): Promise<void> {
    if (!this.accessToken) {
      throw new Error("Not authenticated");
    }

    try {
      await this.makeAuthRequest(
        baseUrl,
        "/auth/password",
        "PUT",
        passwordData,
      );

      // Password change successful, tokens may have been invalidated
      // Clear local tokens to force re-login
      this.clearAuthTokens();
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error("Failed to change password");
    }
  }

  /**
   * Ensure we have a valid token
   */
  async ensureValidToken(baseUrl: string): Promise<void> {
    if (!this.accessToken) {
      return; // No token, will be handled by API request
    }

    if (this.isTokenExpired()) {
      try {
        await this.verifyToken(baseUrl);
      } catch (error) {
        // Token verification failed, clear tokens
        this.clearAuthTokens();
        throw error;
      }
    }
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.user;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.accessToken && !!this.user && !this.isTokenExpired(0);
  }

  /**
   * Get token expiry information
   */
  getTokenExpiry(): string | null {
    return this.tokenExpiry;
  }

  /**
   * Check if token will expire soon
   */
  willExpireSoon(minutes: number = 5): boolean {
    return this.isTokenExpired(minutes);
  }

  /**
   * Get authentication headers for API requests
   */
  getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }

    return headers;
  }

  /**
   * Handle unauthorized response (401)
   */
  async handleUnauthorized(baseUrl: string): Promise<void> {
    // Try to verify token first
    if (this.accessToken) {
      try {
        await this.verifyToken(baseUrl);
        return;
      } catch (error) {
        // Verification failed, fall through to logout
      }
    }

    // Clear tokens and throw error
    this.clearAuthTokens();
    throw new Error("Session expired");
  }

  /**
   * Clean up expired tokens on server
   */
  async cleanupTokens(baseUrl: string): Promise<{ tokensRemoved: number }> {
    if (!this.accessToken) {
      throw new Error("Not authenticated");
    }

    try {
      const response = await this.makeAuthRequest<{
        data: { tokensRemoved: number };
      }>(baseUrl, "/auth/cleanup-tokens", "POST");

      return response.data;
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error("Failed to cleanup tokens");
    }
  }
}
