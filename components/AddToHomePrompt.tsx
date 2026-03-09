'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function isStandalone() {
  if (typeof window === 'undefined') return true;
  // @ts-ignore
  if (window.navigator.standalone) return true;
  return window.matchMedia('(display-mode: standalone)').matches;
}

function isMobileUA() {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export default function AddToHomePrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  const shouldShow = useMemo(() => {
    if (!isMobileUA()) return false;
    if (isStandalone()) return false;
    if (typeof window === 'undefined') return false;
    const dismissed = localStorage.getItem('a2hs_dismissed') === '1';
    return !dismissed;
  }, []);

  useEffect(() => {
    if (!shouldShow) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => {
      setVisible(false);
      localStorage.setItem('a2hs_dismissed', '1');
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [shouldShow]);

  if (!shouldShow) return null;
  if (!visible) return null;

  const onDismiss = () => {
    localStorage.setItem('a2hs_dismissed', '1');
    setVisible(false);
  };

  const onInstall = async () => {
    if (isIOS()) {
      onDismiss();
      return;
    }
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      try {
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome !== 'accepted') {
          localStorage.setItem('a2hs_dismissed', '1');
        }
      } catch {}
      setDeferredPrompt(null);
      setVisible(false);
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 md:p-6">
      <div className="mx-auto max-w-md rounded-2xl border border-emerald-200 bg-white shadow-2xl shadow-emerald-700/10">
        <div className="flex items-center gap-3 p-4">
          <div className="relative w-14 h-14 flex-shrink-0 rounded-xl overflow-hidden ring-1 ring-emerald-100">
            <Image src="/front-image-2.svg" alt="Add to Home" fill className="object-cover" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">Tambahkan ke Halaman Utama</p>
            <p className="text-xs text-gray-500">Akses lebih cepat seperti aplikasi.</p>
          </div>
        </div>
        {isIOS() ? (
          <div className="px-4 pb-4">
            <div className="text-xs text-gray-600">
              Buka menu Share dan pilih <span className="font-semibold">Add to Home Screen</span>.
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={onDismiss} className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700">
                Mengerti
              </button>
            </div>
          </div>
        ) : (
          <div className="px-4 pb-4 flex gap-2">
            <button onClick={onDismiss} className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700">
              Nanti
            </button>
            <button onClick={onInstall} className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
              Tambahkan
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
