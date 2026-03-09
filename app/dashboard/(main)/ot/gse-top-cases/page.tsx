'use client';

import { useEffect, useMemo, useState, type ElementType } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CircleGauge,
  Plane,
  Wrench,
} from 'lucide-react';
import { ResponsivePieChart } from '@/components/charts/ResponsivePieChart';

interface GseExample {
  row_id: string;
  report?: string;
  root_cause?: string;
  action_taken?: string;
  area?: string;
  branch?: string;
  airlines?: string;
}

interface GseSubcategoryDetail {
  count: number;
  percentage: number;
  top_areas?: Record<string, number>;
  top_branches?: Record<string, number>;
  top_airlines?: Record<string, number>;
  top_keywords?: Record<string, number>;
  examples?: GseExample[];
  recommendations?: string[];
  timeline_monthly?: Record<string, number>;
}

interface GseTopRow {
  subcategory?: string;
  name?: string;
  count?: number;
  value?: number;
  percentage?: number;
}

interface GseTopResponse {
  total_records: number;
  gse_records: number;
  by_subcategory: Record<string, GseSubcategoryDetail>;
  top?: Array<[string, GseSubcategoryDetail] | GseTopRow>;
}

interface SubcategorySummary {
  name: string;
  count: number;
  percentage: number;
}

interface StatCardProps {
  icon: ElementType;
  label: string;
  value: string;
  caption: string;
  tone: 'blue' | 'emerald' | 'amber' | 'rose';
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  const contentType = res.headers.get('content-type') || '';
  if (!res.ok || !contentType.includes('application/json')) {
    throw new Error(`HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeTop(
  top: GseTopResponse['top'],
  fallback: Record<string, GseSubcategoryDetail>
): SubcategorySummary[] {
  if (!Array.isArray(top) || top.length === 0) {
    return Object.entries(fallback)
      .map(([name, detail]) => ({
        name,
        count: toNumber(detail?.count),
        percentage: toNumber(detail?.percentage),
      }))
      .filter((item) => item.name && item.count > 0)
      .sort((a, b) => b.count - a.count);
  }

  const rows = top
    .map((item) => {
      if (Array.isArray(item) && item.length >= 2) {
        const name = String(item[0] || '').trim();
        const detail = item[1] as GseSubcategoryDetail;
        return {
          name,
          count: toNumber(detail?.count),
          percentage: toNumber(detail?.percentage),
        };
      }

      if (typeof item === 'object' && item) {
        const row = item as GseTopRow;
        const name = String(row.subcategory || row.name || '').trim();
        return {
          name,
          count: toNumber(row.count ?? row.value),
          percentage: toNumber(row.percentage),
        };
      }

      return null;
    })
    .filter((item): item is SubcategorySummary => Boolean(item && item.name && item.count > 0));

  if (rows.length > 0) return rows.sort((a, b) => b.count - a.count);

  return Object.entries(fallback)
    .map(([name, detail]) => ({
      name,
      count: toNumber(detail?.count),
      percentage: toNumber(detail?.percentage),
    }))
    .filter((item) => item.name && item.count > 0)
    .sort((a, b) => b.count - a.count);
}

function toTopEntries(record?: Record<string, number>, limit = 5): Array<[string, number]> {
  return Object.entries(record || {})
    .map(([key, value]) => [key, toNumber(value)] as [string, number])
    .filter(([key, value]) => key.trim().length > 0 && value > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

function StatCard({ icon: Icon, label, value, caption, tone }: StatCardProps) {
  const colors = {
    blue: {
      icon: 'bg-sky-100 text-sky-700',
      value: 'text-sky-900',
      border: 'border-sky-200',
    },
    emerald: {
      icon: 'bg-emerald-100 text-emerald-700',
      value: 'text-emerald-900',
      border: 'border-emerald-200',
    },
    amber: {
      icon: 'bg-amber-100 text-amber-700',
      value: 'text-amber-900',
      border: 'border-amber-200',
    },
    rose: {
      icon: 'bg-rose-100 text-rose-700',
      value: 'text-rose-900',
      border: 'border-rose-200',
    },
  }[tone];

  return (
    <div className={`rounded-2xl border bg-[var(--surface-1)] p-4 shadow-spatial-sm ${colors.border}`}>
      <div className="mb-2 flex items-center gap-2">
        <div className={`rounded-lg p-2 ${colors.icon}`}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      </div>
      <p className={`text-2xl font-black tracking-tight ${colors.value}`}>{value}</p>
      <p className="mt-1 text-xs text-gray-500">{caption}</p>
    </div>
  );
}

export default function OTGseTopCases() {
  const [data, setData] = useState<GseTopResponse | null>(null);
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);
  const [exampleQuery, setExampleQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const json = await fetchJson<GseTopResponse>('https://ridzki-nrzngr-gapura-ai.hf.space/api/ai/gse/top');
        if (mounted) setData(json);
      } catch {
        if (mounted) setError('Gagal memuat data GSE Top Cases');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchData();

    return () => {
      mounted = false;
    };
  }, []);

  const subcategories = useMemo(
    () => normalizeTop(data?.top, data?.by_subcategory || {}),
    [data]
  );

  const resolvedSubcategory = useMemo(() => {
    if (activeSubcategory && subcategories.some((item) => item.name === activeSubcategory)) {
      return activeSubcategory;
    }
    return subcategories[0]?.name || null;
  }, [activeSubcategory, subcategories]);

  const detail = useMemo(
    () => (resolvedSubcategory ? data?.by_subcategory?.[resolvedSubcategory] || null : null),
    [resolvedSubcategory, data]
  );

  const topAreas = useMemo(() => toTopEntries(detail?.top_areas, 5), [detail]);
  const topBranches = useMemo(() => toTopEntries(detail?.top_branches, 5), [detail]);
  const topAirlines = useMemo(() => toTopEntries(detail?.top_airlines, 5), [detail]);
  const topKeywords = useMemo(() => toTopEntries(detail?.top_keywords, 10), [detail]);

  const donutData = useMemo(
    () => subcategories.map((item) => ({ name: item.name, value: item.count })),
    [subcategories]
  );

  const exampleRows = useMemo(() => {
    const rows = detail?.examples || [];
    const keyword = exampleQuery.trim().toLowerCase();
    if (!keyword) return rows;
    return rows.filter((item) => {
      const haystack = [
        item.row_id,
        item.report || '',
        item.root_cause || '',
        item.action_taken || '',
        item.branch || '',
        item.area || '',
        item.airlines || '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [detail, exampleQuery]);

  const topSubcategory = subcategories[0];
  const totalRecords = data?.total_records || 0;
  const gseRecords = data?.gse_records || 0;
  const coverage = totalRecords > 0 ? (gseRecords / totalRecords) * 100 : 0;
  const concentration = gseRecords > 0 ? (toNumber(topSubcategory?.count) / gseRecords) * 100 : 0;

  return (
    <div className="min-h-screen space-y-6 px-4 py-6 md:px-6">
      <section className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-[#f5fff5] via-[#f4fbff] to-[#fff7ef] p-6 shadow-spatial-sm">
        <div className="absolute -right-24 -top-20 h-56 w-56 rounded-full bg-emerald-200/45 blur-3xl" />
        <div className="absolute -bottom-24 -left-14 h-56 w-56 rounded-full bg-sky-200/45 blur-3xl" />
        <div className="relative z-10">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
            <Wrench className="h-3.5 w-3.5" />
            OT · GSE Top Cases
          </div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 md:text-3xl">
            GSE Top Cases Dashboard
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-600">
            Halaman ini merangkum kasus GSE yang paling sering terjadi, lengkap dengan area, cabang, maskapai,
            kata kunci utama, saran tindak lanjut, dan contoh kasus.
          </p>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={CircleGauge}
          label="Total Data"
          value={totalRecords.toLocaleString('id-ID')}
          caption="Jumlah seluruh data"
          tone="blue"
        />
        <StatCard
          icon={Wrench}
          label="Terkait GSE"
          value={gseRecords.toLocaleString('id-ID')}
          caption={`${coverage.toFixed(1)}% dari total data`}
          tone="emerald"
        />
        <StatCard
          icon={BarChart3}
          label="Subkategori Teratas"
          value={topSubcategory?.name || '-'}
          caption={`${toNumber(topSubcategory?.count).toLocaleString('id-ID')} kasus`}
          tone="amber"
        />
        <StatCard
          icon={AlertTriangle}
          label="Porsi Subkategori Teratas"
          value={`${concentration.toFixed(1)}%`}
          caption="Porsi dari total kasus GSE"
          tone="rose"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="rounded-2xl border border-[var(--surface-2)] bg-[var(--surface-1)] p-4 shadow-spatial-sm lg:col-span-7">
          <div className="mb-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-800">Distribusi Subkategori</h2>
            <p className="text-xs text-gray-500">Distribusi kasus per subkategori.</p>
          </div>

          <ResponsivePieChart
            data={donutData}
            donut
            showLegend
            percentageLabels
            height="h-[320px]"
            innerRadius={66}
          />

          <div className="mt-3 flex flex-wrap gap-2">
            {subcategories.map((item) => (
              <button
                key={item.name}
                onClick={() => setActiveSubcategory(item.name)}
                className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
                  resolvedSubcategory === item.name
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                {item.name} ({item.count})
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--surface-2)] bg-[var(--surface-1)] p-4 shadow-spatial-sm lg:col-span-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-800">
              Fokus Subkategori {resolvedSubcategory ? `· ${resolvedSubcategory}` : ''}
            </h2>
            <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[10px] font-semibold text-sky-700">
              {toNumber(detail?.percentage).toFixed(1)}%
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Kasus</p>
              <p className="text-xl font-black text-gray-900">{toNumber(detail?.count).toLocaleString('id-ID')}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Kata Kunci</p>
              <p className="text-xl font-black text-gray-900">{topKeywords.length}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Contoh</p>
              <p className="text-xl font-black text-gray-900">{detail?.examples?.length || 0}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Rekomendasi</p>
              <p className="text-xl font-black text-gray-900">{detail?.recommendations?.length || 0}</p>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-600">Kata Kunci Teratas</p>
            <div className="flex flex-wrap gap-1.5">
              {topKeywords.map(([keyword, count]) => (
                <span
                  key={keyword}
                  className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700"
                >
                  {keyword} <span className="text-emerald-800">({count})</span>
                </span>
              ))}
              {topKeywords.length === 0 && <span className="text-xs text-gray-400">Tidak ada keyword.</span>}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {[{
          title: 'Area Teratas',
          icon: Building2,
          rows: topAreas,
        }, {
          title: 'Cabang Teratas',
          icon: BarChart3,
          rows: topBranches,
        }, {
          title: 'Maskapai Teratas',
          icon: Plane,
          rows: topAirlines,
        }].map((group) => (
          <div key={group.title} className="rounded-2xl border border-[var(--surface-2)] bg-[var(--surface-1)] p-4 shadow-spatial-sm lg:col-span-4">
            <div className="mb-3 flex items-center gap-2">
              <group.icon className="h-4 w-4 text-emerald-700" />
              <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">{group.title}</h3>
            </div>
            <div className="space-y-2">
              {group.rows.map(([name, value], index) => {
                const max = group.rows[0]?.[1] || 1;
                const width = (value / max) * 100;
                return (
                  <div key={`${group.title}-${name}`} className="rounded-lg border border-gray-200 bg-white p-2.5">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-gray-700">{index + 1}. {name}</span>
                      <span className="font-bold text-gray-800">{value}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100">
                      <div className="h-1.5 rounded-full bg-gradient-to-r from-[#13a37f] to-[#3b82f6]" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
              {group.rows.length === 0 && (
                <div className="rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-400">
                  Data belum tersedia.
                </div>
              )}
            </div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4">
        <div className="rounded-2xl border border-[var(--surface-2)] bg-[var(--surface-1)] p-4 shadow-spatial-sm">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-800">Rekomendasi</h3>
          <p className="mb-3 text-xs text-gray-500">Daftar tindakan prioritas dari subkategori yang dipilih.</p>
          <div className="space-y-2">
            {(detail?.recommendations || []).map((item, index) => (
              <div key={`${item}-${index}`} className="rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-700">
                <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">
                  {index + 1}
                </span>
                {item}
              </div>
            ))}
            {(!detail?.recommendations || detail.recommendations.length === 0) && (
              <div className="rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-400">
                Tidak ada rekomendasi pada subkategori terpilih.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--surface-2)] bg-[var(--surface-1)] p-4 shadow-spatial-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">Contoh Kasus</h3>
            <p className="text-xs text-gray-500">Contoh kasus dari subkategori yang dipilih.</p>
          </div>
          <input
            value={exampleQuery}
            onChange={(event) => setExampleQuery(event.target.value)}
            placeholder="Cari laporan / akar masalah / cabang..."
            className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-xs outline-none transition focus:border-emerald-300 md:w-72"
          />
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-[980px] border-collapse text-left">
            <thead className="bg-gray-50">
              <tr>
                {['ID Kasus', 'Area', 'Cabang', 'Maskapai', 'Laporan', 'Penyebab', 'Tindakan'].map((head) => (
                  <th key={head} className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {exampleRows.map((item) => (
                <tr key={item.row_id} className="border-t border-gray-100 align-top">
                  <td className="px-3 py-2.5 text-xs font-semibold text-gray-700">{item.row_id}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-700">{item.area || '-'}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-700">{item.branch || '-'}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-700">{item.airlines || '-'}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-600">
                    <p className="line-clamp-3 max-w-xs">{item.report || '-'}</p>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-600">
                    <p className="line-clamp-3 max-w-xs">{item.root_cause || '-'}</p>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-600">
                    <p className="line-clamp-3 max-w-xs">{item.action_taken || '-'}</p>
                  </td>
                </tr>
              ))}
              {!loading && exampleRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-sm text-gray-400">
                    Tidak ada contoh kasus yang cocok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
