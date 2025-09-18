import { AuthTokens, AuthResponse, User, ApiError } from "./types";
import { StorageManager } from "./StorageManager";

export class AuthManager {
  private storageManager: StorageManager;
  private accessToken: string | null = null;
  private refreshTokenValue: string | null = null;
  private tokenExpiry: string | null = null;
  private user: User | null = null;
  private refreshPromise: Promise<void> | null = null;

  constructor(storageManager: StorageManager) {
    this.storageManager = storageManager;
    this.loadTokensFromStorage();
  }

  /**
   * Load tokens from localStorage on initialization
   */
  private loadTokensFromStorage(): void {
    this.accessToken = this.storageManager.get<string>("access_token");
    this.refreshTokenValue = this.storageManager.get<string>("refresh_token");
    this.tokenExpiry = this.storageManager.get<string>("token_expiry");

    // Only set user if we have a valid token that hasn't expired
    if (this.accessToken && !this.isTokenExpired(0)) {
      try {
        this.user = this.decodeUserFromToken(this.accessToken);
      } catch (error) {
        // Token is invalid, clear all auth data
        this.clearAuthTokens();
      }
    } else if (this.accessToken) {
      // Token exists but is expired, clear auth data
      this.clearAuthTokens();
    }
  }

  /**
   * Store authentication tokens
   */
  private setAuthTokens(authData: AuthTokens): void {
    this.accessToken = authData.access_token;
    this.refreshTokenValue = authData.refresh_token;
    this.tokenExpiry = authData.expires_at || this.getDefaultExpiry();

    // Store in localStorage
    this.storageManager.set("access_token", this.accessToken);
    this.storageManager.set("refresh_token", this.refreshTokenValue);
    this.storageManager.set("token_expiry", this.tokenExpiry);

    // Decode user from token
    this.user = this.decodeUserFromToken(this.accessToken);
  }

  /**
   * Clear authentication tokens and user data
   */
  private clearAuthTokens(): void {
    this.accessToken = null;
    this.refreshTokenValue = null;
    this.tokenExpiry = null;
    this.user = null;

    // Clear from localStorage
    this.storageManager.remove("access_token");
    this.storageManager.remove("refresh_token");
    this.storageManager.remove("token_expiry");
  }

  /**
   * Decode user information from JWT token
   */
  private decodeUserFromToken(token: string): User | null {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.user || payload || null;
    } catch (error) {
      console.error("Failed to decode user from token:", error);
      return null;
    }
  }

  /**
   * Get default token expiry (1 hour from now)
   */
  private getDefaultExpiry(): string {
    return new Date(Date.now() + 3600000).toISOString();
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
   * Make API request to refresh token
   */
  private async refreshTokenRequest(baseUrl: string): Promise<AuthTokens> {
    if (!this.refreshTokenValue) {
      throw new Error("No refresh token available");
    }

    const response = await fetch(`${baseUrl}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: this.refreshTokenValue }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(
        `Token refresh failed: ${errorData || response.statusText}`,
      );
    }

    return await response.json();
  }

  /**
   * Authenticate with password only
   */
  async login(baseUrl: string, password: string): Promise<User> {
    try {
      const response = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Login failed: ${errorData || response.statusText}`);
      }

      const authData: AuthResponse = await response.json();

      this.setAuthTokens({
        access_token: authData.data.token,
        refresh_token: "", // New API doesn't use refresh tokens yet
        expires_at: authData.data.expiresAt,
      });
      this.user = authData.data.user;
      return authData.data.user;
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
        await fetch(`${baseUrl}/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
        }).catch(() => {
          // Ignore logout errors - we're clearing local tokens anyway
        });
      }
    } finally {
      this.clearAuthTokens();
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(baseUrl: string): Promise<void> {
    // Prevent multiple simultaneous refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const authData = await this.refreshTokenRequest(baseUrl);
        this.setAuthTokens(authData);
      } catch (error) {
        this.clearAuthTokens();
        throw error;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Ensure we have a valid token, refresh if necessary
   */
  async ensureValidToken(baseUrl: string): Promise<void> {
    if (!this.accessToken) {
      return; // No token, will be handled by API request
    }

    if (this.isTokenExpired()) {
      try {
        await this.refreshToken(baseUrl);
      } catch (error) {
        // Token refresh failed, clear tokens
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
    if (this.refreshTokenValue) {
      try {
        await this.refreshToken(baseUrl);
        return;
      } catch (error) {
        // Refresh failed, fall through to logout
      }
    }

    // No refresh token or refresh failed
    this.clearAuthTokens();
    throw new Error("Session expired");
  }
}
