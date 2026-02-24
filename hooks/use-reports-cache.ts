
import useSWR, { SWRConfiguration } from 'swr';
import { Report } from '@/types';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const STORAGE_KEY = 'reports-cache-v2';
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

interface CacheData {
  data: Report[];
  timestamp: number;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch reports');
  return res.json();
};

export function useReportsData(url: string = '/api/reports', options?: SWRConfiguration) {
  const STORAGE_KEY_WITH_URL = `${STORAGE_KEY}:${url}`;
  // L1 Cache: Local Storage
  const [isOffline, setIsOffline] = useState(false);
  
  const { data, error, isLoading, mutate, isValidating } = useSWR<Report[]>(
    url,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 1000 * 60 * 5, // 5 minutes background refresh
      dedupingInterval: 1000 * 60, // 1 minute dedupe
      onSuccess: (newData) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY_WITH_URL, JSON.stringify({
            data: newData,
            timestamp: Date.now()
          }));
          setIsOffline(false);
        }
      },
      onError: (err) => {
        console.error('SWR Fetch Error:', err);
        // Check if we are offline
        if (!navigator.onLine) {
          setIsOffline(true);
        }
      },
      ...options
    }
  );

  // Hydrate from local storage on mount
  useEffect(() => {
      const local = localStorage.getItem(STORAGE_KEY_WITH_URL);
      if (local && !data) {
        try {
           const parsed = JSON.parse(local);
           // Mutate cache with local data, but allow revalidation to happen
           mutate(parsed.data, false); 
        } catch(e) {}
      }
  }, [url]); // Re-run when url changes

  // Realtime refresh on updates (reports table or system comments)
  useEffect(() => {
    const channel = supabase
      .channel(`realtime-reports`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'reports' }, () => {
        mutate();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'report_comments', filter: 'is_system_message=eq.true' }, () => {
        mutate();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [url, mutate]);

  // Sync offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    reports: data || [],
    isLoading,
    isError: error,
    isValidating,
    isOffline,
    refresh: () => mutate(),
    lastUpdated: typeof window !== 'undefined' ? 
      (JSON.parse(localStorage.getItem(STORAGE_KEY_WITH_URL) || 'null')?.timestamp || null) : null
  };
}
