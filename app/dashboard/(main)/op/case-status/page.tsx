'use client';

import { useEffect, useMemo, useState } from 'react';
import { Clock, RefreshCw } from 'lucide-react';

type Report = {
  id: string;
  created_at?: string;
  status?: string;
  category?: string;
};

function normalizeStatus(s?: string): 'OPEN' | 'PROGRESS' | 'CLOSED' {
  const v = (s || '').toString().toLowerCase();
  if (v.includes('selesai') || v.includes('closed') || v === 'closed' || v === 'close' || v.includes('done')) {
    return 'CLOSED';
  }
  if (
    v.includes('menunggu') ||
    v.includes('progress') ||
    v.includes('verifikasi') ||
    v.includes('pending')
  ) {
    return 'PROGRESS';
  }
  return 'OPEN';
}

export default function OPCaseStatus() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState<'all' | 'week' | 'month'>('all');

  const fetchData = async (hard = false) => {
    try {
      if (hard) setRefreshing(true);
      else setLoading(true);
      if (hard) await fetch('/api/reports/refresh', { method: 'POST' });
      // Primary endpoint
      let res = await fetch('/api/admin/reports');
      if (!res.ok) {
        // Fallback to analytics endpoint (no division filter)
        const fields = [
          'id',
          'created_at',
          'status',
          'category',
        ].join(',');
        res = await fetch(`/api/reports/analytics?fields=${encodeURIComponent(fields)}&refresh=${hard ? 'true' : 'false'}`);
        if (res.ok) {
          const data = await res.json();
          setReports(Array.isArray(data?.reports) ? data.reports : []);
        } else {
          setReports([]);
        }
      } else {
        const data = await res.json();
        setReports(Array.isArray(data) ? data : []);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    let list = reports;
    if (range !== 'all') {
      const now = new Date();
      const days = range === 'week' ? 7 : 30;
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      list = list.filter((r) => {
        const d = r.created_at ? new Date(r.created_at) : null;
        return d && d >= cutoff;
      });
    }
    return list;
  }, [reports, range]);

  const statusAgg = useMemo(() => {
    let open = 0;
    let progress = 0;
    let closed = 0;
    for (const r of filtered) {
      const n = normalizeStatus(r.status);
      if (n === 'OPEN') open++;
      else if (n === 'PROGRESS') progress++;
      else closed++;
    }
    const total = open + progress + closed;
    const closedRate = total > 0 ? Math.round((closed / total) * 100) : 0;
    return { open, progress, closed, total, closedRate };
  }, [filtered]);

  return (
    <div className="min-h-screen px-4 md:px-6 py-6">
      <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-600" />
            <h1 className="text-lg font-bold text-gray-800">Status Case</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl bg-gray-100 p-1">
              {(['all', 'week', 'month'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg ${
                    range === r
                      ? 'bg-white shadow border border-gray-200 text-gray-800'
                      : 'text-gray-500'
                  }`}
                >
                  {r === 'all' ? 'Semua' : r === 'week' ? '7 Hari' : '30 Hari'}
                </button>
              ))}
            </div>
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-white border border-gray-200 hover:bg-gray-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="h-[30vh] flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-4 animate-spin" style={{ borderColor: 'var(--surface-4)', borderTopColor: 'var(--brand-primary)' }} />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl border border-[var(--surface-2)] bg-[var(--surface-1)]">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Total</p>
                <p className="text-2xl font-extrabold text-gray-900">{statusAgg.total}</p>
              </div>
              <div className="p-4 rounded-2xl border border-[var(--surface-2)] bg-[var(--surface-1)]">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Open</p>
                <p className="text-2xl font-extrabold text-gray-900">{statusAgg.open}</p>
              </div>
              <div className="p-4 rounded-2xl border border-[var(--surface-2)] bg-[var(--surface-1)]">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Progress</p>
                <p className="text-2xl font-extrabold text-gray-900">{statusAgg.progress}</p>
              </div>
              <div className="p-4 rounded-2xl border border-[var(--surface-2)] bg-[var(--surface-1)]">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Closed Rate</p>
                <p className="text-2xl font-extrabold text-gray-900">{statusAgg.closedRate}%</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-[var(--surface-2)] bg-[var(--surface-1)]">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-gray-800 tracking-wide uppercase">Distribusi Status</h2>
              </div>
              <div className="space-y-3">
                {[
                  { name: 'OPEN', value: statusAgg.open, color: 'from-amber-500 to-orange-600' },
                  { name: 'PROGRESS', value: statusAgg.progress, color: 'from-cyan-500 to-sky-600' },
                  { name: 'CLOSED', value: statusAgg.closed, color: 'from-emerald-500 to-teal-600' },
                ].map((row) => {
                  const max = Math.max(statusAgg.open, statusAgg.progress, statusAgg.closed, 1);
                  const pct = Math.round((row.value / max) * 100);
                  return (
                    <div key={row.name}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-800">{row.name}</span>
                        <span className="text-gray-600 font-semibold">{row.value}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${row.color}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
