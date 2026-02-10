'use client';

import { useState } from 'react';
import type { DashboardDefinition } from '@/types/builder';

export function useAIDashboard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate(prompt: string): Promise<DashboardDefinition | null> {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/dashboards/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data.details
          ? `${data.error}: ${Array.isArray(data.details) ? data.details.join(', ') : data.details}`
          : data.error || 'Gagal membuat dashboard';
        setError(msg);
        return null;
      }

      return data.dashboard as DashboardDefinition;
    } catch {
      setError('Gagal menghubungi server. Periksa koneksi internet.');
      return null;
    } finally {
      setLoading(false);
    }
  }

  function clearError() {
    setError(null);
  }

  return { generate, loading, error, clearError };
}
