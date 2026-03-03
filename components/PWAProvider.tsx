'use client';

import { useEffect } from 'react';
import PWAInstallPrompt from './PWAInstallPrompt';
import OfflineIndicator from './OfflineIndicator';

export default function PWAProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      const registerServiceWorker = async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
            updateViaCache: 'none'
          });
          
          console.log('[PWA] Service Worker registered:', registration.scope);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content available
                  if (confirm('Versi baru tersedia! Muat ulang halaman?')) {
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                    window.location.reload();
                  }
                }
              });
            }
          });
          
          // Check for updates every hour
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000);
          
        } catch (error) {
          console.error('[PWA] Service Worker registration failed:', error);
        }
      };
      
      if (document.readyState === 'complete') {
        registerServiceWorker();
      } else {
        window.addEventListener('load', registerServiceWorker, { once: true });
      }
    }
    
    // Handle messages from service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('[PWA] Message from SW:', event.data);
        
        if (event.data.type === 'SYNC_COMPLETE') {
          // Could show a toast notification here
          console.log('[PWA] Sync complete:', event.data);
        }
      });
    }
    
    // Handle online/offline status
    const handleOnlineStatusChange = () => {
      if (navigator.onLine) {
        console.log('[PWA] Back online');
        
        // Trigger background sync
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
          navigator.serviceWorker.ready.then((registration) => {
            // @ts-ignore
            if (registration.sync) {
              // @ts-ignore
              return Promise.all([
                // @ts-ignore
                registration.sync.register('sync-reports'),
                // @ts-ignore
                registration.sync.register('sync-uploads')
              ]);
            }
          }).catch((error) => {
            console.error('[PWA] Background sync registration failed:', error);
          });
        }
      } else {
        console.log('[PWA] Gone offline');
      }
    };
    
    window.addEventListener('online', handleOnlineStatusChange);
    window.addEventListener('offline', handleOnlineStatusChange);
    
    return () => {
      window.removeEventListener('online', handleOnlineStatusChange);
      window.removeEventListener('offline', handleOnlineStatusChange);
    };
  }, []);

  // Cache important pages on first load
  useEffect(() => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const pagesToCache = [
        '/',
        '/dashboard/employee',
        '/dashboard/analyst',
        '/api/dashboards/filter-options'
      ];
      
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_URLS',
        urls: pagesToCache
      });
    }
  }, []);

  return (
    <>
      {children}
      <PWAInstallPrompt />
      <OfflineIndicator />
    </>
  );
}
