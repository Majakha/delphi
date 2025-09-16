import { CacheEntry } from './types';

export class CacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number;
  private defaultTtl: number; // Time to live in milliseconds

  constructor(maxSize: number = 100, defaultTtl: number = 30 * 60 * 1000) { // 30 minutes default
    this.maxSize = maxSize;
    this.defaultTtl = defaultTtl;
  }

  /**
   * Store data in cache with optional TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    // Remove oldest entry if cache is at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictOldest();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: new Date().toISOString()
    };

    this.cache.set(key, entry);

    // Set TTL cleanup if specified
    if (ttl || this.defaultTtl) {
      const timeout = ttl || this.defaultTtl;
      setTimeout(() => {
        this.delete(key);
      }, timeout);
    }
  }

  /**
   * Get data from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if entry has expired based on default TTL
    if (this.isExpired(entry)) {
      this.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Check if a key exists in cache and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    if (this.isExpired(entry)) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a specific cache entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache information for a specific key
   */
  getInfo(key: string): { timestamp: string; age: number; size: number } | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const age = Date.now() - new Date(entry.timestamp).getTime();
    const size = this.estimateSize(entry.data);

    return {
      timestamp: entry.timestamp,
      age,
      size
    };
  }

  /**
   * Get all cache keys
   */
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    keys: string[];
    oldestEntry?: string;
    newestEntry?: string;
    totalEstimatedSize: number;
  } {
    const keys = this.getKeys();
    let oldestKey: string | undefined;
    let newestKey: string | undefined;
    let oldestTime = Date.now();
    let newestTime = 0;
    let totalSize = 0;

    for (const key of keys) {
      const entry = this.cache.get(key);
      if (entry) {
        const time = new Date(entry.timestamp).getTime();
        const size = this.estimateSize(entry.data);
        totalSize += size;

        if (time < oldestTime) {
          oldestTime = time;
          oldestKey = key;
        }

        if (time > newestTime) {
          newestTime = time;
          newestKey = key;
        }
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys,
      oldestEntry: oldestKey,
      newestEntry: newestKey,
      totalEstimatedSize: totalSize
    };
  }

  /**
   * Update cache entry without changing timestamp
   */
  update<T>(key: string, data: T): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    entry.data = data;
    return true;
  }

  /**
   * Get multiple cache entries at once
   */
  batchGet<T>(keys: string[]): Record<string, T | null> {
    const result: Record<string, T | null> = {};

    keys.forEach(key => {
      result[key] = this.get<T>(key);
    });

    return result;
  }

  /**
   * Set multiple cache entries at once
   */
  batchSet<T>(entries: Record<string, T>, ttl?: number): void {
    Object.entries(entries).forEach(([key, data]) => {
      this.set(key, data, ttl);
    });
  }

  /**
   * Remove expired entries
   */
  cleanup(): number {
    let removedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * Check if cache entry has expired
   */
  private isExpired(entry: CacheEntry): boolean {
    if (!this.defaultTtl) {
      return false; // No expiration if TTL is 0
    }

    const age = Date.now() - new Date(entry.timestamp).getTime();
    return age > this.defaultTtl;
  }

  /**
   * Remove the oldest cache entry to make room
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      const time = new Date(entry.timestamp).getTime();
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Estimate the memory size of cached data
   */
  private estimateSize(data: any): number {
    try {
      return JSON.stringify(data).length * 2; // Rough estimate (2 bytes per character)
    } catch (error) {
      return 0;
    }
  }

  /**
   * Set cache configuration
   */
  setConfig(maxSize?: number, defaultTtl?: number): void {
    if (maxSize !== undefined) {
      this.maxSize = maxSize;

      // Evict entries if we're over the new limit
      while (this.cache.size > this.maxSize) {
        this.evictOldest();
      }
    }

    if (defaultTtl !== undefined) {
      this.defaultTtl = defaultTtl;
    }
  }

  /**
   * Check if cache is at capacity
   */
  isFull(): boolean {
    return this.cache.size >= this.maxSize;
  }

  /**
   * Get cache usage percentage
   */
  getUsagePercentage(): number {
    return (this.cache.size / this.maxSize) * 100;
  }
}

export const cacheManager = new CacheManager();
