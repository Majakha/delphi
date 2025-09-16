export class StorageManager {
  private readonly prefix: string = 'delphi_';

  /**
   * Get an item from localStorage with error handling
   */
  get<T>(key: string): T | null {
    try {
      const prefixedKey = this.prefix + key;
      const item = localStorage.getItem(prefixedKey);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Storage read error for key "${key}":`, error);
      return null;
    }
  }

  /**
   * Set an item in localStorage with error handling
   */
  set<T>(key: string, data: T): boolean {
    try {
      const prefixedKey = this.prefix + key;
      localStorage.setItem(prefixedKey, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error(`Storage write error for key "${key}":`, error);
      return false;
    }
  }

  /**
   * Remove an item from localStorage
   */
  remove(key: string): void {
    try {
      const prefixedKey = this.prefix + key;
      localStorage.removeItem(prefixedKey);
    } catch (error) {
      console.error(`Storage remove error for key "${key}":`, error);
    }
  }

  /**
   * Check if an item exists in localStorage
   */
  has(key: string): boolean {
    const prefixedKey = this.prefix + key;
    return localStorage.getItem(prefixedKey) !== null;
  }

  /**
   * Clear all items with the app prefix
   */
  clear(): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('Storage clear error:', error);
    }
  }

  /**
   * Get all keys with the app prefix
   */
  getKeys(): string[] {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          keys.push(key.replace(this.prefix, ''));
        }
      }
      return keys;
    } catch (error) {
      console.error('Storage getKeys error:', error);
      return [];
    }
  }

  /**
   * Get storage usage information
   */
  getStorageInfo(): { used: number; total: number; available: number } {
    try {
      let used = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          const value = localStorage.getItem(key);
          if (value) {
            used += key.length + value.length;
          }
        }
      }

      // Estimate total localStorage capacity (typically 5-10MB)
      const total = 5 * 1024 * 1024; // 5MB in characters
      const available = total - used;

      return { used, total, available };
    } catch (error) {
      console.error('Storage info error:', error);
      return { used: 0, total: 0, available: 0 };
    }
  }

  /**
   * Check if localStorage is available
   */
  isAvailable(): boolean {
    try {
      const testKey = this.prefix + 'test';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Batch operations for better performance
   */
  batchSet<T>(items: Record<string, T>): boolean {
    try {
      Object.entries(items).forEach(([key, value]) => {
        const prefixedKey = this.prefix + key;
        localStorage.setItem(prefixedKey, JSON.stringify(value));
      });
      return true;
    } catch (error) {
      console.error('Batch set error:', error);
      return false;
    }
  }

  /**
   * Get multiple items at once
   */
  batchGet<T>(keys: string[]): Record<string, T | null> {
    const result: Record<string, T | null> = {};

    keys.forEach(key => {
      result[key] = this.get<T>(key);
    });

    return result;
  }
}

export const storageManager = new StorageManager();
