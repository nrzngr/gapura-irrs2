'use client';

import { useEffect, useMemo, useState } from 'react';
import { Gauge, Wrench, AlertTriangle, ListTree, CalendarClock } from 'lucide-react';
import { ResponsivePieChart } from '@/components/charts/ResponsivePieChart';
import { MonthlyTrendChart } from '@/components/chart-detail/custom-charts/MonthlyTrendChart';

interface GseExample {
  row_id: string;
  report: string;
  root_cause: string;
  action_taken: string;
  area: string;
  branch: string;
  airlines: string;
}

interface GseDetail {
  count: number;
  percentage: number;
  top_areas: Record<string, number>;
  top_branches: Record<string, number>;
  top_airlines: Record<string, number>;
  top_keywords: Record<string, number>;
  examples: GseExample[];
  recommendations: string[];
  timeline_monthly: Record<string, number>;
}

interface GseTopResponse {
  total_records: number;
  gse_records: number;
  by_subcategory: Record<string, GseDetail>;
  top: [string, GseDetail][];
}

function toDonutData(top: [string, GseDetail][], fallback: Record<string, GseDetail>) {
  const arr = (top && top.length > 0 ? top : Object.entries(fallback)).map(([name, d]) => ({
    name,
    value: d.count,
  }));
  return arr.sort((a, b) => b.value - a.value).slice(0, 10);
}

function toMonthlyTrend(timeline: Record<string, number>) {
  return Object.entries(timeline || {})
    .map(([ym, count]) => {
      const [yearStr, monthStr] = ym.split('-');
      return { month: monthStr || '00', year: Number(yearStr || 0), count: Number(count || 0) };
    })
    .sort((a, b) => (a.year - b.year) || (String(a.month).localeCompare(String(b.month))));
}

export default function OTGsePerformance() {
  const [data, setData] = useState<GseTopResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSubcat, setActiveSubcat] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetcher = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('https://ridzki-nrzngr-gapura-ai.hf.space/api/ai/gse/top', {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });
        const ct = res.headers.get('content-type') || '';
        if (!res.ok || !ct.includes('application/json')) throw new Error(String(res.status));
        const json = (await res.json()) as GseTopResponse;
        if (mounted) setData(json);
      } catch {
        try {
          const mod = await import('@/gse-top.json');
          const local = (mod as { default: unknown }).default as GseTopResponse;
          if (mounted) setData(local);
        } catch {
          if (mounted) setError('Gagal memuat data GSE Performance');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetcher();
    return () => {
      mounted = false;
    };
  }, []);

  // Default active subcategory is the first top item
  useEffect(() => {
    if (!activeSubcat && data?.top?.length) {
      setActiveSubcat(data.top[0][0]);
    }
  }, [data, activeSubcat]);

  const donutTop = useMemo(
    () => toDonutData(data?.top || [], data?.by_subcategory || {}),
    [data]
  );

  const subcats = useMemo(() => {
    const entries = Object.entries(data?.by_subcategory || {}).map(([k, v]) => ({
      name: k,
      count: v.count,
      percentage: v.percentage,
    }));
    return entries.sort((a, b) => b.count - a.count);
  }, [data]);

  const detail = useMemo<GseDetail | null>(() => {
    if (!activeSubcat) return null;
    return data?.by_subcategory?.[activeSubcat] || null;
  }, [data, activeSubcat]);

  const monthlyTrend = useMemo(() => toMonthlyTrend(detail?.timeline_monthly || {}), [detail]);

  return (
    <div className="min-h-screen px-4 md:px-6 py-6 space-y-6">
      <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-emerald-600" />
            <h1 className="text-lg font-bold text-gray-800">Performa GSE · Divisi OT</h1>
          </div>
          {typeof data?.gse_records === 'number' && (
            <div className="text-[10px] font-bold text-gray-500">
              GSE Records {data.gse_records.toLocaleString('id-ID')} / {data.total_records?.toLocaleString('id-ID')}
            </div>
          )}
        </div>
        <p className="text-sm text-gray-500">Kinerja GSE berdasarkan subkategori SDA, SDM, dan Maintenance, lengkap dengan contoh kasus, rekomendasi, dan tren bulanan.</p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="bg-[var(--surface-1)] rounded-2xl p-4 border border-[var(--surface-2)] shadow-spatial-sm">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-[var(--surface-2)] rounded w-24" />
                <div className="h-6 bg-[var(--surface-2)] rounded w-32" />
              </div>
            </div>
          ))
        ) : (
          (() => {
            type StatCard = { icon: React.ElementType; label: string; value: string };
            const stats: StatCard[] = [
              { icon: Wrench, label: 'GSE Records', value: (data?.gse_records || 0).toLocaleString('id-ID') },
              { icon: ListTree, label: 'Subcategories', value: String(Object.keys(data?.by_subcategory || {}).length) },
              { icon: AlertTriangle, label: 'Non-GSE', value: String(Math.max(0, (data?.total_records || 0) - (data?.gse_records || 0))) },
            ];
            return stats.map((k, idx) => (
              <div key={idx} className="bg-[var(--surface-1)] rounded-2xl p-4 border border-[var(--surface-2)] shadow-spatial-sm">
                <div className="flex items-center gap-3">
                  <k.icon className="w-4 h-4 text-emerald-600" />
                  <div>
                    <div className="text-xs text-gray-500">{k.label}</div>
                    <div className="text-lg font-bold text-gray-800">{k.value}</div>
                  </div>
                </div>
              </div>
            ));
          })()
        )}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[var(--surface-1)] rounded-2xl p-4 border border-[var(--surface-2)] shadow-spatial-sm">
          <ResponsivePieChart
            title="Top GSE Subcategories"
            data={donutTop}
            donut
            showLegend
            height="h-[45vh] min-h-[220px] lg:h-[360px]"
          />
        </div>
        <div className="bg-[var(--surface-1)] rounded-2xl p-4 border border-[var(--surface-2)] shadow-spatial-sm">
          <div className="text-xs font-bold text-gray-700 mb-3">Subkategori</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(loading ? [] : subcats).map((row) => (
              <button
                key={row.name}
                onClick={() => setActiveSubcat(row.name)}
                className={`text-left rounded-xl border p-4 transition-all hover:shadow-md ${
                  activeSubcat === row.name ? 'border-emerald-300 ring-1 ring-emerald-400' : 'border-gray-200'
                } bg-white`}
                aria-pressed={activeSubcat === row.name}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-bold text-gray-800">{row.name || 'Tidak terklasifikasi'}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{row.percentage.toFixed(1)}%</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-extrabold text-gray-900">{row.count}</div>
                    <div className="text-[10px] text-gray-400">Kasus</div>
                  </div>
                </div>
                <div className="mt-3 w-full h-2 rounded bg-gray-100 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${Math.min(100, Math.max(0, row.percentage))}%` }}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[var(--surface-1)] rounded-2xl p-4 border border-[var(--surface-2)] shadow-spatial-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-bold text-gray-700">
            Detail Subkategori {activeSubcat || '—'}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-gray-500">
            <CalendarClock className="w-3.5 h-3.5" />
            Tren Bulanan
          </div>
        </div>

        {!detail ? (
          <div className="p-6 text-sm text-gray-500">Pilih salah satu subkategori untuk melihat detail.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <MonthlyTrendChart data={monthlyTrend} title="Tren Bulanan" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="text-[10px] font-bold text-gray-600 mb-2">Top Areas</div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(detail.top_areas || {}).map(([k, v]) => (
                      <span key={k} className="px-2 py-0.5 rounded-full bg-white border border-gray-200 text-[10px] text-gray-700">
                        {k} · {v}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="text-[10px] font-bold text-gray-600 mb-2">Top Branches</div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(detail.top_branches || {}).map(([k, v]) => (
                      <span key={k} className="px-2 py-0.5 rounded-full bg-white border border-gray-200 text-[10px] text-gray-700">
                        {k} · {v}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="text-[10px] font-bold text-gray-600 mb-2">Top Airlines</div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(detail.top_airlines || {}).map(([k, v]) => (
                      <span
                        key={k}
                        className="px-2 py-0.5 rounded-full bg-white border border-gray-200 text-[10px] text-gray-700 cursor-pointer hover:bg-gray-50"
                        onClick={() => window.open(`/embed/airline?name=${encodeURIComponent(k)}`, '_blank')}
                      >
                        {k} · {v}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="text-[10px] font-bold text-gray-600 mb-2">Top Keywords</div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(detail.top_keywords || {}).map(([k, v]) => (
                      <span key={k} className="px-2 py-0.5 rounded-full bg-white border border-gray-200 text-[10px] text-gray-700">
                        {k} · {v}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="text-[10px] font-bold text-gray-600 mb-2">Rekomendasi</div>
                <ul className="list-disc ml-5 text-[11px] text-gray-700 space-y-1">
                  {(detail.recommendations || []).map((r, idx) => (
                    <li key={idx}>{r}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="text-[10px] font-bold text-gray-600 mb-2">Contoh Kasus</div>
                <div className="divide-y">
                  {(detail.examples || []).slice(0, 6).map((ex, idx) => (
                    <div key={idx} className="py-2">
                      <div className="text-[11px] font-semibold text-gray-800">{ex.report || '—'}</div>
                      <div className="text-[10px] text-gray-500">{[ex.area, ex.branch, ex.airlines].filter(Boolean).join(' • ') || '—'}</div>
                      {ex.root_cause ? <div className="text-[10px] text-gray-600 mt-0.5">RC: {ex.root_cause}</div> : null}
                      {ex.action_taken ? <div className="text-[10px] text-gray-600">AT: {ex.action_taken}</div> : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}
    </div>
  );
}
