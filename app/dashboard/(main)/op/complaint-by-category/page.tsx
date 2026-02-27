'use client';

import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, RefreshCw } from 'lucide-react';

type Report = {
  id: string;
  created_at?: string;
  main_category?: string;
  category?: string;
  irregularity_complain_category?: string;
  airlines?: string;
  airline?: string;
  branch?: string;
  reporting_branch?: string;
  station_code?: string;
  description?: string;
  date_of_event?: string;
};

function getCategory(r: Report): string {
  const raw = (r.category || r.main_category || '').toString().toLowerCase();
  if (raw.includes('accident') || raw.includes('incident')) return 'Accidents / Incidents';
  if (raw.includes('irregular')) return 'Irregularity Report';
  if (raw.includes('complaint')) return 'Complaint';
  if (raw.includes('compliment')) return 'Compliment';
  return (r.category || r.main_category) ? String(r.category || r.main_category) : 'Unknown';
}

function getSource(r: Report): 'Customer' | 'Internal' | 'Unknown' {
  const cat = getCategory(r);
  if (cat === 'Complaint' || cat === 'Compliment') return 'Customer';
  if (cat === 'Irregularity Report' || cat === 'Accidents / Incidents') return 'Internal';
  return 'Unknown';
}

export default function OPComplaintByCategory() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState<'all' | 'week' | 'month'>('all');

  const fetchData = async (hard = false) => {
    try {
      if (hard) setRefreshing(true);
      else setLoading(true);
      if (hard) await fetch('/api/reports/refresh', { method: 'POST' });
      let res = await fetch('/api/admin/reports');
      if (!res.ok) {
        const fields = [
          'id','original_id','created_at','main_category','category','irregularity_complain_category',
          'airlines','airline','branch','reporting_branch','station_code',
          'description','date_of_event'
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
        const d = r.date_of_event || r.created_at;
        const t = d ? new Date(d) : null;
        return t && t >= cutoff;
      });
    }
    return list;
  }, [reports, range]);

  const bySource = useMemo(() => {
    const result = {
      Customer: 0,
      Internal: 0,
      Unknown: 0,
    };
    for (const r of filtered) {
      const s = getSource(r);
      // @ts-ignore
      result[s] = (result[s] || 0) + 1;
    }
    return result;
  }, [filtered]);

  const customerCats = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filtered) {
      const src = getSource(r);
      if (src !== 'Customer') continue;
      const cat = getCategory(r);
      map.set(cat, (map.get(cat) || 0) + 1);
    }
    const arr = Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a,b) => b.count - a.count);
    const max = arr[0]?.count || 1;
    return { arr, max };
  }, [filtered]);

  const internalCats = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filtered) {
      const src = getSource(r);
      if (src !== 'Internal') continue;
      const cat = getCategory(r);
      map.set(cat, (map.get(cat) || 0) + 1);
    }
    const arr = Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a,b) => b.count - a.count);
    const max = arr[0]?.count || 1;
    return { arr, max };
  }, [filtered]);

  const latest = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => {
      const da = new Date(a.date_of_event || a.created_at || 0).getTime();
      const db = new Date(b.date_of_event || b.created_at || 0).getTime();
      return db - da;
    });
    const seen = new Set<string>();
    const out: Report[] = [];
    for (const r of sorted) {
      const dateKey = new Date(r.date_of_event || r.created_at || 0).toISOString().slice(0, 10);
      const branchKey = String(r.branch || r.reporting_branch || r.station_code || '').toUpperCase();
      const airlineKey = String(r.airlines || r.airline || '').toUpperCase();
      const catKey = getCategory(r).toUpperCase();
      const descKey = String(r.description || '').toLowerCase().slice(0, 64);
      // @ts-ignore
      const orig = (r as any).original_id ? String((r as any).original_id) : '';
      const idKey = r.id || orig || `${dateKey}|${branchKey}|${airlineKey}|${catKey}|${descKey}`;
      if (!seen.has(idKey)) {
        seen.add(idKey);
        out.push(r);
      }
      if (out.length >= 50) break;
    }
    return out;
  }, [filtered]);

  return (
    <div className="min-h-screen px-4 md:px-6 py-6">
      <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-emerald-600" />
            <h1 className="text-lg font-bold text-gray-800">Complaint by Category</h1>
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
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl border border-[var(--surface-2)] bg-[var(--surface-1)]">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Total</p>
                <p className="text-2xl font-extrabold text-gray-900">{filtered.length}</p>
              </div>
              <div className="p-4 rounded-2xl border border-[var(--surface-2)] bg-[var(--surface-1)]">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Sumber: Customer</p>
                <p className="text-2xl font-extrabold text-gray-900">{bySource.Customer}</p>
              </div>
              <div className="p-4 rounded-2xl border border-[var(--surface-2)] bg-[var(--surface-1)]">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Sumber: Internal</p>
                <p className="text-2xl font-extrabold text-gray-900">{bySource.Internal}</p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl border border-[var(--surface-2)] bg-[var(--surface-1)]">
                <h2 className="text-sm font-bold text-gray-800 tracking-wide uppercase mb-3">Kategori — Sumber Customer</h2>
                <div className="space-y-2">
                  {customerCats.arr.length === 0 ? (
                    <div className="text-sm text-gray-500 italic">Tidak ada data</div>
                  ) : (
                    customerCats.arr.map((row) => (
                      <div key={row.name}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-800">{row.name}</span>
                          <span className="text-gray-600 font-semibold">{row.count}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-rose-500 to-red-600"
                            style={{ width: `${Math.round((row.count / customerCats.max) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="p-4 rounded-2xl border border-[var(--surface-2)] bg-[var(--surface-1)]">
                <h2 className="text-sm font-bold text-gray-800 tracking-wide uppercase mb-3">Kategori — Sumber Internal</h2>
                <div className="space-y-2">
                  {internalCats.arr.length === 0 ? (
                    <div className="text-sm text-gray-500 italic">Tidak ada data</div>
                  ) : (
                    internalCats.arr.map((row) => (
                      <div key={row.name}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-800">{row.name}</span>
                          <span className="text-gray-600 font-semibold">{row.count}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-sky-600"
                            style={{ width: `${Math.round((row.count / internalCats.max) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Latest List */}
            <div className="p-4 rounded-2xl border border-[var(--surface-2)] bg-[var(--surface-1)]">
              <h2 className="text-sm font-bold text-gray-800 tracking-wide uppercase mb-3">Daftar Laporan Terbaru</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="py-2 pr-4">Tanggal</th>
                      <th className="py-2 pr-4">Sumber</th>
                      <th className="py-2 pr-4">Kategori</th>
                      <th className="py-2 pr-4">Cabang</th>
                      <th className="py-2 pr-4">Airlines</th>
                      <th className="py-2 pr-4">Deskripsi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {latest.map((r) => {
                      const tanggal = r.date_of_event || r.created_at || '';
                      const cabang = r.branch || r.reporting_branch || r.station_code || '-';
                      const airline = r.airlines || r.airline || '-';
                      const cat = getCategory(r);
                      const src = getSource(r);
                      return (
                        <tr key={r.id}>
                          <td className="py-2 pr-4 whitespace-nowrap">{tanggal ? new Date(tanggal).toLocaleDateString('id-ID') : '-'}</td>
                          <td className="py-2 pr-4 whitespace-nowrap">{src}</td>
                          <td className="py-2 pr-4 whitespace-nowrap">{cat}</td>
                          <td className="py-2 pr-4 whitespace-nowrap">{cabang}</td>
                          <td className="py-2 pr-4 whitespace-nowrap">{airline}</td>
                          <td className="py-2 pr-4">
                            <span className="line-clamp-2 text-gray-700">{r.description || '-'}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
