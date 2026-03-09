'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, X, RefreshCw } from 'lucide-react';

export default function NotificationPermission() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    if (!('Notification' in window)) {
      return;
    }

    // Check current permission status
    setPermission(Notification.permission);

    // Check if user dismissed the prompt before
    const dismissed = localStorage.getItem('notification-permission-dismissed');
    const dismissedTime = dismissed ? parseInt(dismissed) : 0;
    const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);

    // Show again after 14 days
    if (daysSinceDismissed < 14) {
      return;
    }

    // Show prompt after user has used the app for a while
    if (Notification.permission === 'default') {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 30000); // 30 seconds delay

      return () => clearTimeout(timer);
    }
  }, []);

  const requestPermission = async () => {
    setLoading(true);
    
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        // Subscribe to push notifications
        await subscribeToPush();
        
        // Show welcome notification
        new Notification('Notifikasi Diaktifkan! 🎉', {
          body: 'Anda akan menerima notifikasi untuk laporan baru dan update penting',
          icon: '/logo.png',
          badge: '/logo.png',
          tag: 'welcome'
        });
        
        setShowPrompt(false);
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToPush = async () => {
    try {
      if (!('serviceWorker' in navigator)) return;

      const registration = await navigator.serviceWorker.ready;
      
      // Check if push manager is available
      if (!registration.pushManager) {
        console.warn('Push manager not available');
        return;
      }

      // Get existing subscription
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Create new subscription
        // Note: You'll need to generate VAPID keys and add to env
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        
        if (!vapidPublicKey) {
          console.warn('VAPID public key not configured');
          return;
        }

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        });
      }

      // Send subscription to server
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });

      console.log('Push notification subscribed');
    } catch (error) {
      console.error('Failed to subscribe to push:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('notification-permission-dismissed', Date.now().toString());
  };

  // Convert VAPID key
  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Don't show if already granted or denied
  if (permission === 'granted' || permission === 'denied') {
    return null;
  }

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-md"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-blue-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 backdrop-blur p-2 rounded-lg">
                    <Bell className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold">Aktifkan Notifikasi</h3>
                    <p className="text-sm text-white/90">Tetap update dengan laporan baru</p>
                  </div>
                </div>
                <button
                  onClick={handleDismiss}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                  aria-label="Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <div className="space-y-3 text-sm text-gray-700">
                <p className="font-medium">Anda akan mendapat notifikasi untuk:</p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>Laporan baru dari tim Anda</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>Update status laporan Anda</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>Pengingat deadline SLA</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>Pesan dari supervisor/analyst</span>
                  </li>
                </ul>
              </div>

              {/* Enable button */}
              <button
                onClick={requestPermission}
                disabled={loading}
                className="w-full mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 px-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <Bell className="w-5 h-5" />
                    Aktifkan Notifikasi
                  </>
                )}
              </button>

              {/* Later button */}
              <button
                onClick={handleDismiss}
                className="w-full mt-2 text-gray-500 hover:text-gray-700 text-sm py-2 transition-colors"
              >
                Nanti saja
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
