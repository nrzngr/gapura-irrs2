'use client';

import { Report } from '@/types';
import { QueryDefinition } from '@/types/builder';
import { processQuery } from '@/lib/engine/query-processor';

const CACHE_KEY = 'gapura_reports_cache';
const META_KEY = 'gapura_reports_meta';
const CACHE_DURATION = 1000 * 60 * 15; // 15 minutes

interface CacheMeta {
  timestamp: number;
  count: number;
  version: string;
}

class ClientReportsService {
  private static instance: ClientReportsService;
  private memoryCache: Report[] | null = null;
  private pendingPromise: Promise<Report[]> | null = null;

  private constructor() {}

  static getInstance(): ClientReportsService {
    if (!ClientReportsService.instance) {
      ClientReportsService.instance = new ClientReportsService();
    }
    return ClientReportsService.instance;
  }

  async getReports(forceRefresh = false): Promise<Report[]> {
    if (typeof window === 'undefined') return [];

    // Deduplicate concurrent requests
    if (this.pendingPromise) {
      return this.pendingPromise;
    }

    // 1. Check memory cache
    if (!forceRefresh && this.memoryCache) {
      return this.memoryCache;
    }

    // 2. Check local storage
    if (!forceRefresh) {
      const cached = this.loadFromStorage();
      if (cached) {
        this.memoryCache = cached;
        // Background refresh if older than 5 mins but less than 15?
        // For now, strict expiration
        return cached;
      }
    }

    // 3. Fetch from API
    this.pendingPromise = (async () => {
      try {
        console.log('[ClientReportsService] Fetching from /api/reports/sync...');
        const response = await fetch('/api/reports/sync');
        if (!response.ok) throw new Error('Failed to sync reports');
        
        const data = await response.json();
        const reports = data.reports as Report[];
        
        this.saveToStorage(reports);
        this.memoryCache = reports;
        
        return reports;
      } catch (err) {
        console.error('Sync error:', err);
        // Fallback to stale cache if available
        const stale = this.loadFromStorage(true);
        if (stale) {
          console.warn('Returning stale cache due to sync error');
          this.memoryCache = stale;
          return stale;
        }
        throw err;
      } finally {
        this.pendingPromise = null;
      }
    })();

    return this.pendingPromise;
  }

  async executeQuery(query: QueryDefinition) {
    const reports = await this.getReports();
    return processQuery(query, reports);
  }
  
  private saveToStorage(reports: Report[]) {
    if (typeof window === 'undefined') return;
    try {
      const serialized = JSON.stringify(reports);
      localStorage.setItem(CACHE_KEY, serialized);
      
      const meta: CacheMeta = {
        timestamp: Date.now(),
        count: reports.length,
        version: '1.0'
      };
      localStorage.setItem(META_KEY, JSON.stringify(meta));
    } catch (e) {
      console.error('Storage quota exceeded', e);
      // Strategy: maybe clear other keys or warn user
    }
  }
  
  private loadFromStorage(ignoreExpiration = false): Report[] | null {
    if (typeof window === 'undefined') return null;
    try {
      const metaStr = localStorage.getItem(META_KEY);
      if (!metaStr) return null;
      
      const meta: CacheMeta = JSON.parse(metaStr);
      const now = Date.now();
      
      if (!ignoreExpiration && (now - meta.timestamp > CACHE_DURATION)) {
        console.log('[ClientReportsService] Cache expired');
        return null; // Expired
      }
      
      const dataStr = localStorage.getItem(CACHE_KEY);
      if (!dataStr) return null;
      
      return JSON.parse(dataStr);
    } catch (e) {
      console.error('Error loading from storage', e);
      return null;
    }
  }
  
  clearCache() {
    this.memoryCache = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(META_KEY);
    }
  }
}

export const clientReportsService = ClientReportsService.getInstance();
