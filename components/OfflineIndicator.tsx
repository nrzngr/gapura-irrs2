'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi, CloudOff, RefreshCw } from 'lucide-react';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [showReconnected, setShowReconnected] = useState(false);
  const [pendingActions, setPendingActions] = useState(0);

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    const checkPendingActions = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          // @ts-ignore
          if (registration.sync && typeof registration.sync.getTags === 'function') {
            // @ts-ignore
            const tags = await registration.sync.getTags();
            setPendingActions(tags.length);
          }
        } catch (error) {
          // Silently fail
        }
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const interval = setInterval(checkPendingActions, 5000);
    checkPendingActions();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return (
    <AnimatePresence>
      {/* Offline banner */}
      {!isOnline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-white shadow-lg"
        >
          <div className="container mx-auto px-4 py-2">
            <div className="flex items-center justify-center gap-2 text-sm font-medium">
              <WifiOff className="w-4 h-4" />
              <span>Anda sedang offline - Perubahan akan disinkronkan saat online</span>
              {pendingActions > 0 && (
                <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                  {pendingActions} menunggu
                </span>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Reconnected notification */}
      {showReconnected && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-emerald-500 text-white shadow-lg"
        >
          <div className="container mx-auto px-4 py-2">
            <div className="flex items-center justify-center gap-2 text-sm font-medium">
              <Wifi className="w-4 h-4" />
              <span>Kembali online - Menyinkronkan data...</span>
              {pendingActions > 0 && (
                <RefreshCw className="w-4 h-4 animate-spin" />
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Floating offline status indicator */}
      {!isOnline && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          className="fixed bottom-20 right-4 z-50"
        >
          <div className="bg-amber-500 text-white p-3 rounded-full shadow-lg">
            <CloudOff className="w-6 h-6" />
          </div>
          {pendingActions > 0 && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
              {pendingActions}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
