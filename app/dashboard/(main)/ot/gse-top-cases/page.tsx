'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, TrendingUp, Wrench } from 'lucide-react';
import { ResponsivePieChart } from '@/components/charts/ResponsivePieChart';

interface GseSubcategoryStat {
  count: number;
  percentage: number;
}

interface GseTopResponse {
  total_records: number;
  gse_records: number;
  by_subcategory: Record<string, GseSubcategoryStat>;
  top: [string, GseSubcategoryStat][];
}

function toDonutData(top: [string, GseSubcategoryStat][], fallback: Record<string, GseSubcategoryStat>) {
  const arr = (top && top.length > 0 ? top : Object.entries(fallback)).map(([name, d]) => ({
    name,
    value: d.count,
  }));
  return arr.sort((a, b) => b.value - a.value).slice(0, 10);
}

export default function OTGseTopCases() {
  const [data, setData] = useState<GseTopResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        if (mounted) setError('Gagal memuat data GSE Top Cases');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetcher();
    return () => {
      mounted = false;
    };
  }, []);

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

  return (
    <div className="min-h-screen px-4 md:px-6 py-6 space-y-6">
      <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-emerald-600" />
            <h1 className="text-lg font-bold text-gray-800">Report Case GSE · Divisi OT</h1>
          </div>
          {typeof data?.total_records === 'number' && (
            <div className="text-[10px] font-bold text-gray-500">
              Total {data.total_records.toLocaleString('id-ID')}
            </div>
          )}
        </div>
        <p className="text-sm text-gray-500">Ringkasan kasus GSE berdasarkan subkategori SDA, SDM, dan Maintenance.</p>
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
              { icon: TrendingUp, label: 'GSE Records', value: (data?.gse_records || 0).toLocaleString('id-ID') },
              { icon: Wrench, label: 'Subcategories', value: String(Object.keys(data?.by_subcategory || {}).length) },
              { icon: AlertTriangle, label: 'Uncategorized', value: String(Math.max(0, (data?.total_records || 0) - (data?.gse_records || 0))) },
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
          <div className="text-xs font-bold text-gray-700 mb-3">Rincian Subkategori</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(loading ? [] : subcats).map((row) => (
              <div key={row.name} className="rounded-xl border border-gray-200 bg-white p-4">
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
              </div>
            ))}
          </div>
        </div>
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
