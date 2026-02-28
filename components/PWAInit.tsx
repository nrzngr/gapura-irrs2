'use client';

import { useEffect } from 'react';
import AddToHomePrompt from './AddToHomePrompt';

export default function PWAInit() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ('serviceWorker' in navigator) {
      const register = () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      };
      if (document.readyState === 'complete') {
        register();
      } else {
        window.addEventListener('load', register, { once: true });
      }
    }
  }, []);

  return <AddToHomePrompt />;
}
