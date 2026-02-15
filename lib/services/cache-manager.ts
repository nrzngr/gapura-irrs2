
import { Report } from '@/types';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  tag?: string;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  tag?: string; // Optional tag for invalidation
}

export interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
  hitRatio: number;
}

export class CacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes default
  private maxEntries = 100; // Prevent memory leaks
  private hits = 0;
  private misses = 0;

  constructor() {
    // Optional: cleanup interval
    // Check if running in browser or server environment that supports setInterval
    if (typeof setInterval !== 'undefined') {
        // Use a wrapper to keep context if needed, though arrow function handles it
        const interval = setInterval(() => this.cleanup(), 60 * 60 * 1000); // Cleanup every hour
        // Unref if in Node.js to prevent process from hanging
        if (typeof interval === 'object' && interval !== null && 'unref' in interval) {
             (interval as any).unref();
        }
    }
  }

  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    if (this.cache.size >= this.maxEntries) {
      // Simple LRU-like eviction: remove first inserted (Map preserves insertion order)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      tag: options.tag
    });
    
    // Debug log only in development or if needed
    if (process.env.NODE_ENV === 'development') {
      console.log(`[CacheManager] Set key: ${key}, TTL: ${options.ttl || this.defaultTTL}ms`);
    }
  }

  get<T>(key: string, ttl: number = this.defaultTTL): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
        this.misses++;
        return null;
    }

    const age = Date.now() - entry.timestamp;
    if (age > ttl) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[CacheManager] Key expired: ${key}`);
      }
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    // Debug log
    // console.log(`[CacheManager] Hit key: ${key}`);
    return entry.data as T;
  }

  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      keys: this.cache.size,
      hitRatio: total > 0 ? (this.hits / total) : 0
    };
  }

  getTimestamp(key: string): number | null {
    const entry = this.cache.get(key);
    return entry ? entry.timestamp : null;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
    console.log(`[CacheManager] Invalidated key: ${key}`);
  }

  invalidateByTag(tag: string): void {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tag === tag) {
        this.cache.delete(key);
        console.log(`[CacheManager] Invalidated key by tag [${tag}]: ${key}`);
      }
    }
  }

  clear(): void {
    this.cache.clear();
    console.log('[CacheManager] Cache cleared');
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > (24 * 60 * 60 * 1000)) { // Hard cleanup for very old entries
        this.cache.delete(key);
      }
    }
  }
}

export const cacheManager = new CacheManager();
