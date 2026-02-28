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

function toDonutData(top: unknown, fallback: Record<string, GseDetail>) {
  let pairs: [string, GseDetail][] = [];
  if (Array.isArray(top) && top.length > 0) {
    // Accept only if items are [key, value] tuples
    if (Array.isArray(top[0]) && (top[0] as unknown[]).length >= 2) {
      pairs = top as [string, GseDetail][];
    } else {
      // If not tuples, ignore and fall back to object entries
      pairs = Object.entries(fallback);
    }
  } else {
    pairs = Object.entries(fallback);
  }

  const arr = pairs
    .map(([name, d]) => ({
      name,
      value: typeof d?.count === 'number' ? d.count : 0,
    }))
    .filter((x) => Number.isFinite(x.value));

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

  // Kept for potential future use; currently not used to avoid duplication with cases donut
  // const donutTop = useMemo(
  //   () => toDonutData(data?.top || [], data?.by_subcategory || {}),
  //   [data]
  // );

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

  // Helpers for date normalization (Excel serial/Unix)
  function toYearMonthFromExcelLike(n: unknown): string | null {
    if (typeof n !== 'number' || !Number.isFinite(n)) return null;
    let d: Date;
    if (n > 1000000000000) {
      d = new Date(n); // ms
    } else if (n > 1000000000) {
      d = new Date(n * 1000); // seconds
    } else {
      const epoch = Date.UTC(1899, 11, 30); // Excel epoch
      d = new Date(epoch + n * 86400000);
    }
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    if (!Number.isFinite(yyyy) || yyyy < 1900) return null;
    return `${yyyy}-${mm}`;
  }

  // monthlyTrend will be computed after cases state is declared (below)

  // Serviceability (Operational Performance)
  interface GseServiceabilityUnitDetail {
    count: number;
    percentage: number;
    statuses?: Record<string, number>;
    top_areas?: Record<string, number>;
    top_branches?: Record<string, number>;
    top_airlines?: Record<string, number>;
    top_keywords?: Record<string, number>;
    examples?: Array<{ row_id: string; report?: string }>;
    timeline_monthly?: Record<string, number>;
  }
  interface GseServiceabilityResponse {
    total_records: number;
    gse_records: number;
    overall_status: Record<string, number>;
    by_unit: Record<string, GseServiceabilityUnitDetail>;
    top_units?: [string, number][];
  }
  const [srv, setSrv] = useState<GseServiceabilityResponse | null>(null);
  const [loadingSrv, setLoadingSrv] = useState(false);
  useEffect(() => {
    let mounted = true;
    const fetchSrv = async () => {
      try {
        setLoadingSrv(true);
        const res = await fetch('https://ridzki-nrzngr-gapura-ai.hf.space/api/ai/gse/serviceability', {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });
        const ct = res.headers.get('content-type') || '';
        if (!res.ok || !ct.includes('application/json')) throw new Error(String(res.status));
        const json = (await res.json()) as GseServiceabilityResponse;
        if (mounted) setSrv(json);
      } catch {
        try {
          const mod = await import('@/gse-serviceability.json');
          const local = (mod as { default: unknown }).default as GseServiceabilityResponse;
          if (mounted) setSrv(local);
        } catch {
          // ignore
        }
      } finally {
        if (mounted) setLoadingSrv(false);
      }
    };
    fetchSrv();
    return () => { mounted = false; };
  }, []);

  const srvStatusDonut = useMemo(() => {
    const status = srv?.overall_status || {};
    return Object.entries(status).map(([k, v]) => ({ name: k, value: Number(v || 0) }))
      .filter(d => Number.isFinite(d.value))
      .sort((a, b) => b.value - a.value);
  }, [srv]);

  const srvTopUnits = useMemo(() => {
    let pairs: [string, number][] = [];
    if (Array.isArray(srv?.top_units) && srv!.top_units!.length > 0) {
      pairs = srv!.top_units!;
    } else if (srv?.by_unit) {
      pairs = Object.entries(srv.by_unit).map(([k, v]) => [k, Number(v?.count || 0)]);
    }
    return pairs
      .map(([name, count]) => ({ name, value: Number(count || 0) }))
      .filter(d => Number.isFinite(d.value))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [srv]);

  // Cases (Irregularity & Complaint)
  interface GseCaseItem {
    row_id: string;
    date?: number;
    airlines?: string;
    branch?: string;
    area?: string;
    unit_type?: string;
    status?: string;
    bucket?: string;
    report?: string;
    severity?: 'Low' | 'Medium' | 'High';
  }
  interface GseCasesResponse {
    total_records: number;
    gse_records: number;
    filtered_count: number;
    items: GseCaseItem[];
  }
  const [cases, setCases] = useState<GseCasesResponse | null>(null);
  const [loadingCases, setLoadingCases] = useState(false);
  useEffect(() => {
    let mounted = true;
    const fetchCases = async () => {
      try {
        setLoadingCases(true);
        const res = await fetch('https://ridzki-nrzngr-gapura-ai.hf.space/api/ai/gse/cases', {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });
        const ct = res.headers.get('content-type') || '';
        if (!res.ok || !ct.includes('application/json')) throw new Error(String(res.status));
        const json = (await res.json()) as GseCasesResponse;
        if (mounted) setCases(json);
      } catch {
        try {
          const mod = await import('@/gse-cases.json');
          const local = (mod as { default: unknown }).default as GseCasesResponse;
          if (mounted) setCases(local);
        } catch {
          // ignore
        }
      } finally {
        if (mounted) setLoadingCases(false);
      }
    };
    fetchCases();
    return () => { mounted = false; };
  }, []);

  const casesCategoryDonut = useMemo(() => {
    const agg = new Map<string, number>();
    for (const it of cases?.items || []) {
      const key = (it.bucket || 'Other').trim();
      agg.set(key, (agg.get(key) || 0) + 1);
    }
    return Array.from(agg.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [cases]);

  const sampleCases = useMemo(() => {
    const rank: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
    return [...(cases?.items || [])]
      .sort((a, b) => (rank[b.severity || 'Low'] - rank[a.severity || 'Low']))
      .slice(0, 6);
  }, [cases]);

  // Monthly trend with fallback: use timeline_monthly if available, otherwise build from cases by bucket
  const monthlyTrend = useMemo(() => {
    const tl = detail?.timeline_monthly || {};
    if (Object.keys(tl).length > 0) {
      return toMonthlyTrend(tl);
    }
    const agg: Record<string, number> = {};
    if (activeSubcat && Array.isArray(cases?.items)) {
      for (const it of cases.items) {
        if ((it?.bucket || '').trim() === activeSubcat) {
          const ym = toYearMonthFromExcelLike(it?.date);
          if (ym) agg[ym] = (agg[ym] || 0) + 1;
        }
      }
    }
    return toMonthlyTrend(agg);
  }, [detail, cases, activeSubcat]);

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

      {(srvStatusDonut.length > 0 || srvTopUnits.length > 0) && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-[var(--surface-1)] rounded-2xl p-4 border border-[var(--surface-2)] shadow-spatial-sm">
            <ResponsivePieChart
              title="Status GSE Serviceability"
              data={srvStatusDonut}
              donut
              showLegend
              height="h-[40vh] min-h-[220px] lg:h-[320px]"
            />
          </div>
          <div className="bg-[var(--surface-1)] rounded-2xl p-4 border border-[var(--surface-2)] shadow-spatial-sm">
            <div className="text-xs font-bold text-gray-700 mb-3">Top Unit GSE</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {srvTopUnits.map((u) => (
                <div key={u.name} className="rounded-xl border border-gray-200 bg-white p-3 flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-800">{u.name}</div>
                  <div className="text-xs font-bold text-emerald-700">{u.value}</div>
                </div>
              ))}
              {(loadingSrv && srvTopUnits.length === 0) && Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-gray-200 bg-white p-3">
                  <div className="animate-pulse h-5 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 gap-4">
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

      {casesCategoryDonut.length > 0 && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-[var(--surface-1)] rounded-2xl p-4 border border-[var(--surface-2)] shadow-spatial-sm">
            <ResponsivePieChart
              title="Kategori Kasus Tertinggi (SDM / SDA / Maintenance)"
              data={casesCategoryDonut}
              donut
              showLegend
              height="h-[40vh] min-h-[220px] lg:h-[320px]"
            />
          </div>
          <div className="bg-[var(--surface-1)] rounded-2xl p-4 border border-[var(--surface-2)] shadow-spatial-sm">
            <div className="text-xs font-bold text-gray-700 mb-3">Contoh Kasus Terkait GSE</div>
            <div className="divide-y rounded-xl border border-gray-200 bg-white">
              {(loadingCases ? [] : sampleCases).map((ex, idx) => (
                <div key={ex.row_id || idx} className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="text-[11px] font-semibold text-gray-800 pr-4">{ex.report || '—'}</div>
                    <span className="text-[10px] font-bold text-emerald-700">{ex.bucket || '—'}</span>
                  </div>
                  <div className="text-[10px] text-gray-500">
                    {[ex.area, ex.branch, ex.airlines].filter(Boolean).join(' • ') || '—'}
                  </div>
                </div>
              ))}
              {(loadingCases && sampleCases.length === 0) && Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-3">
                  <div className="animate-pulse h-4 bg-gray-100 rounded mb-1" />
                  <div className="animate-pulse h-3 bg-gray-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

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
