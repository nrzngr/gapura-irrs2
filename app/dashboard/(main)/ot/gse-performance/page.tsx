'use client';

import { Fragment, useEffect, useMemo, useState, useSyncExternalStore, type ElementType } from 'react';
import {
  Activity,
  AlertTriangle,
  CircleGauge,
  Search,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { ResponsivePieChart } from '@/components/charts/ResponsivePieChart';
import { MonthlyTrendChart } from '@/components/chart-detail/custom-charts/MonthlyTrendChart';

interface GseExample {
  row_id: string;
  date?: number;
  unit?: string;
  status?: string;
  report?: string;
  root_cause?: string;
  action_taken?: string;
  area?: string;
  branch?: string;
  airlines?: string;
}

interface GseDetail {
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
  by_subcategory: Record<string, GseDetail>;
  top?: Array<[string, GseDetail] | GseTopRow>;
}

interface UnitDetail {
  count: number;
  percentage: number;
  statuses?: Record<string, number>;
  top_areas?: Record<string, number>;
  top_branches?: Record<string, number>;
  top_airlines?: Record<string, number>;
  examples?: GseExample[];
}

interface GseServiceabilityResponse {
  total_records: number;
  gse_records: number;
  overall_status: Record<string, number>;
  by_unit: Record<string, UnitDetail>;
  top_units?: Array<[string, number]>;
}

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
  root_cause_text?: string;
  severity?: 'Low' | 'Medium' | 'High';
}

interface GseCasesResponse {
  total_records: number;
  gse_records: number;
  filtered_count: number;
  items: GseCaseItem[];
}

interface SubcategorySummary {
  name: string;
  count: number;
  percentage: number;
}

interface TrendPoint {
  month: string;
  year: number;
  count: number;
  change: number;
  changePercent: number;
}

interface StatCardProps {
  label: string;
  value: string;
  note: string;
  accent: 'emerald' | 'amber' | 'blue' | 'rose';
  icon: ElementType;
}

const STATUS_ORDER = ['Serviceable', 'Maintenance', 'Unserviceable', 'Unknown'];
const UNIT_DONUT_COLORS = ['#81c784', '#13b5cb', '#cddc39', '#66bb6a', '#9ccc65'];
const DATE_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

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

function sumMap(record?: Record<string, number>): number {
  if (!record) return 0;
  return Object.values(record).reduce((sum, value) => sum + toNumber(value), 0);
}

function parseExcelLikeDate(value: unknown): Date | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;

  if (value > 1_000_000_000_000) {
    const dt = new Date(value);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  if (value > 1_000_000_000) {
    const dt = new Date(value * 1000);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  const epoch = Date.UTC(1899, 11, 30);
  const dt = new Date(epoch + value * 86400000);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function formatCaseDate(value: unknown): string {
  const dt = parseExcelLikeDate(value);
  if (!dt) return '—';
  return DATE_FORMATTER.format(dt);
}

function toMonthKey(value: unknown): string | null {
  const dt = parseExcelLikeDate(value);
  if (!dt) return null;
  const year = dt.getUTCFullYear();
  const month = String(dt.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function toSortedEntries(record?: Record<string, number>, take = 5): Array<[string, number]> {
  return Object.entries(record || {})
    .map(([key, value]) => [key, toNumber(value)] as [string, number])
    .filter(([key, value]) => key.trim().length > 0 && value > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, take);
}

function normalizeSubcategories(
  topList: GseTopResponse['top'],
  bySubcategory: Record<string, GseDetail>
): SubcategorySummary[] {
  if (!Array.isArray(topList) || topList.length === 0) {
    return Object.entries(bySubcategory)
      .map(([name, detail]) => ({
        name,
        count: toNumber(detail?.count),
        percentage: toNumber(detail?.percentage),
      }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count);
  }

  const normalized = topList
    .map((entry) => {
      if (Array.isArray(entry) && entry.length >= 2) {
        const name = String(entry[0] || '').trim();
        const detail = entry[1] as GseDetail;
        return {
          name,
          count: toNumber(detail?.count),
          percentage: toNumber(detail?.percentage),
        };
      }

      if (typeof entry === 'object' && entry) {
        const row = entry as GseTopRow;
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

  if (normalized.length > 0) {
    return normalized.sort((a, b) => b.count - a.count);
  }

  return Object.entries(bySubcategory)
    .map(([name, detail]) => ({
      name,
      count: toNumber(detail?.count),
      percentage: toNumber(detail?.percentage),
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);
}

function buildTrendFromMonthlyMap(timeline?: Record<string, number>): TrendPoint[] {
  const rows = Object.entries(timeline || {})
    .map(([key, value]) => {
      const [yearStr, monthStr] = key.split('-');
      const year = Number(yearStr);
      const month = String(monthStr || '').padStart(2, '0');
      const count = toNumber(value);
      if (!Number.isFinite(year) || !month || count < 0) return null;
      return { year, month, count };
    })
    .filter((item): item is { year: number; month: string; count: number } => Boolean(item))
    .sort((a, b) => (a.year - b.year) || a.month.localeCompare(b.month));

  return rows.map((row, index) => {
    const previous = rows[index - 1]?.count ?? 0;
    const change = row.count - previous;
    const changePercent = previous > 0 ? (change / previous) * 100 : 0;
    return { ...row, change, changePercent };
  });
}

function buildTrendFromCases(items: GseCaseItem[], bucket?: string | null): TrendPoint[] {
  const monthly: Record<string, number> = {};
  items.forEach((item) => {
    if (bucket && (item.bucket || 'Other') !== bucket) return;
    const key = toMonthKey(item.date);
    if (!key) return;
    monthly[key] = (monthly[key] || 0) + 1;
  });
  return buildTrendFromMonthlyMap(monthly);
}

function aggregateCases(items: GseCaseItem[], field: keyof GseCaseItem, take = 5): Array<[string, number]> {
  const map: Record<string, number> = {};
  items.forEach((item) => {
    const raw = item[field];
    const label = String(raw || '').trim() || 'Unknown';
    map[label] = (map[label] || 0) + 1;
  });
  return toSortedEntries(map, take);
}

function toneForStatus(status: string): string {
  if (status === 'Serviceable') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (status === 'Maintenance') return 'bg-amber-100 text-amber-700 border-amber-200';
  if (status === 'Unserviceable') return 'bg-rose-100 text-rose-700 border-rose-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

function toneForSeverity(severity?: string): string {
  if (severity === 'High') return 'bg-rose-100 text-rose-700 border-rose-200';
  if (severity === 'Medium') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-emerald-100 text-emerald-700 border-emerald-200';
}

function StatCard({ label, value, note, accent, icon: Icon }: StatCardProps) {
  const classes = {
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
    blue: {
      icon: 'bg-sky-100 text-sky-700',
      value: 'text-sky-900',
      border: 'border-sky-200',
    },
    rose: {
      icon: 'bg-rose-100 text-rose-700',
      value: 'text-rose-900',
      border: 'border-rose-200',
    },
  }[accent];

  return (
    <div className={`rounded-2xl border bg-[var(--surface-1)] p-4 shadow-spatial-sm ${classes.border}`}>
      <div className="mb-1 flex items-center gap-2">
        <div className={`rounded-lg p-2 ${classes.icon}`}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      </div>
      <p className={`text-2xl font-black tracking-tight ${classes.value}`}>{value}</p>
      <p className="mt-1 text-xs text-gray-500">{note}</p>
    </div>
  );
}

export default function OTGsePerformancePage() {
  const [topData, setTopData] = useState<GseTopResponse | null>(null);
  const [serviceData, setServiceData] = useState<GseServiceabilityResponse | null>(null);
  const [casesData, setCasesData] = useState<GseCasesResponse | null>(null);
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [bucketFilter, setBucketFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [expandedCaseKey, setExpandedCaseKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  useEffect(() => {
    let mounted = true;

    async function loadAll() {
      setLoading(true);
      setError(null);

      const [topRes, serviceRes, casesRes] = await Promise.allSettled([
        fetchJson<GseTopResponse>('https://ridzki-nrzngr-gapura-ai.hf.space/api/ai/gse/top'),
        fetchJson<GseServiceabilityResponse>('https://ridzki-nrzngr-gapura-ai.hf.space/api/ai/gse/serviceability'),
        fetchJson<GseCasesResponse>('https://ridzki-nrzngr-gapura-ai.hf.space/api/ai/gse/cases'),
      ]);

      if (!mounted) return;

      if (topRes.status === 'fulfilled') setTopData(topRes.value);
      if (serviceRes.status === 'fulfilled') setServiceData(serviceRes.value);
      if (casesRes.status === 'fulfilled') setCasesData(casesRes.value);

      const failed = [topRes, serviceRes, casesRes].filter((r) => r.status === 'rejected').length;
      if (failed === 3) {
        setError('Semua data gagal dimuat. Coba muat ulang halaman.');
      } else if (failed > 0) {
        setError('Sebagian data gagal dimuat. Halaman tetap menampilkan data yang tersedia.');
      }

      setLoading(false);
    }

    loadAll();

    return () => {
      mounted = false;
    };
  }, []);

  const subcategories = useMemo(
    () => normalizeSubcategories(topData?.top, topData?.by_subcategory || {}),
    [topData]
  );

  const resolvedSubcategory = useMemo(() => {
    if (activeSubcategory && subcategories.some((item) => item.name === activeSubcategory)) {
      return activeSubcategory;
    }
    return subcategories[0]?.name || null;
  }, [activeSubcategory, subcategories]);

  const selectedDetail = useMemo(
    () => (resolvedSubcategory ? topData?.by_subcategory?.[resolvedSubcategory] || null : null),
    [resolvedSubcategory, topData]
  );

  const allCases = useMemo(() => casesData?.items || [], [casesData]);

  const activeBucketCases = useMemo(() => {
    if (!resolvedSubcategory) return allCases;
    return allCases.filter((item) => (item.bucket || 'Other') === resolvedSubcategory);
  }, [allCases, resolvedSubcategory]);

  const overallStatus = useMemo(() => serviceData?.overall_status || {}, [serviceData]);
  const totalStatusRecords = sumMap(overallStatus);
  const serviceableCount = toNumber(overallStatus.Serviceable);
  const maintenanceCount = toNumber(overallStatus.Maintenance);
  const unserviceableCount = toNumber(overallStatus.Unserviceable);
  const unknownCount = toNumber(overallStatus.Unknown);

  const serviceabilityRate = totalStatusRecords > 0
    ? (serviceableCount / totalStatusRecords) * 100
    : 0;

  const severitySummary = useMemo(() => {
    return allCases.reduce(
      (acc, item) => {
        if (item.severity === 'High') acc.high += 1;
        else if (item.severity === 'Medium') acc.medium += 1;
        else acc.low += 1;
        return acc;
      },
      { high: 0, medium: 0, low: 0 }
    );
  }, [allCases]);

  const subcategoryDonut = useMemo(
    () => subcategories.map((item) => ({ name: item.name, value: item.count })),
    [subcategories]
  );

  const statusRows = Object.entries(overallStatus)
    .map(([status, count]) => ({ status, count: toNumber(count) }))
    .filter((item) => item.count > 0)
    .sort((a, b) => {
      const ia = STATUS_ORDER.indexOf(a.status);
      const ib = STATUS_ORDER.indexOf(b.status);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return b.count - a.count;
    });

  const unitRows = useMemo(() => {
    return Object.entries(serviceData?.by_unit || {})
      .map(([unit, detail]) => ({
        unit,
        count: toNumber(detail?.count),
        percentage: toNumber(detail?.percentage),
        statuses: detail?.statuses || {},
      }))
      .sort((a, b) => b.count - a.count);
  }, [serviceData]);

  const topUnitsDonut = useMemo(() => {
    if (Array.isArray(serviceData?.top_units) && serviceData.top_units.length > 0) {
      return serviceData.top_units
        .map(([name, count]) => ({ name, value: toNumber(count) }))
        .filter((item) => item.value > 0);
    }

    return unitRows.slice(0, 5).map((item) => ({
      name: item.unit,
      value: item.count,
    }));
  }, [serviceData, unitRows]);

  const topUnitsLegend = useMemo(() => topUnitsDonut.slice(0, 5), [topUnitsDonut]);

  const trendData = useMemo(() => {
    if (selectedDetail?.timeline_monthly && Object.keys(selectedDetail.timeline_monthly).length > 0) {
      return buildTrendFromMonthlyMap(selectedDetail.timeline_monthly);
    }
    return buildTrendFromCases(allCases, resolvedSubcategory);
  }, [selectedDetail, allCases, resolvedSubcategory]);

  const topAreas = useMemo(() => {
    const fromDetail = toSortedEntries(selectedDetail?.top_areas, 5);
    if (fromDetail.length > 0) return fromDetail;
    return aggregateCases(activeBucketCases, 'area', 5);
  }, [selectedDetail, activeBucketCases]);

  const topBranches = useMemo(() => {
    const fromDetail = toSortedEntries(selectedDetail?.top_branches, 5);
    if (fromDetail.length > 0) return fromDetail;
    return aggregateCases(activeBucketCases, 'branch', 5);
  }, [selectedDetail, activeBucketCases]);

  const topAirlines = useMemo(() => {
    const fromDetail = toSortedEntries(selectedDetail?.top_airlines, 5);
    if (fromDetail.length > 0) return fromDetail;
    return aggregateCases(activeBucketCases, 'airlines', 5);
  }, [selectedDetail, activeBucketCases]);

  const exampleCases = useMemo(() => {
    if (selectedDetail?.examples && selectedDetail.examples.length > 0) {
      return selectedDetail.examples.slice(0, 3).map((item) => ({
        row_id: item.row_id,
        report: item.report || '-',
        root_cause: item.root_cause || '-',
        branch: item.branch || '-',
        area: item.area || '-',
        airlines: item.airlines || '-',
      }));
    }

    return activeBucketCases.slice(0, 3).map((item) => ({
      row_id: item.row_id,
      report: item.report || '-',
      root_cause: item.root_cause_text || '-',
      branch: item.branch || '-',
      area: item.area || '-',
      airlines: item.airlines || '-',
    }));
  }, [selectedDetail, activeBucketCases]);

  const recommendations = selectedDetail?.recommendations || [];

  const bucketOptions = useMemo(() => {
    const set = new Set(allCases.map((item) => (item.bucket || 'Other').trim() || 'Other'));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allCases]);

  const statusOptions = useMemo(() => {
    const set = new Set(allCases.map((item) => (item.status || 'Unknown').trim() || 'Unknown'));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allCases]);

  const severityOptions = useMemo(() => {
    const set = new Set(allCases.map((item) => (item.severity || 'Low').trim() || 'Low'));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allCases]);

  const branchOptions = useMemo(() => {
    const set = new Set(allCases.map((item) => (item.branch || 'Unknown').trim() || 'Unknown'));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allCases]);

  const filteredCases = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return allCases.filter((item) => {
      const bucket = (item.bucket || 'Other').trim() || 'Other';
      const status = (item.status || 'Unknown').trim() || 'Unknown';
      const severity = (item.severity || 'Low').trim() || 'Low';
      const branch = (item.branch || 'Unknown').trim() || 'Unknown';

      if (bucketFilter !== 'ALL' && bucket !== bucketFilter) return false;
      if (statusFilter !== 'ALL' && status !== statusFilter) return false;
      if (severityFilter !== 'ALL' && severity !== severityFilter) return false;
      if (branchFilter !== 'ALL' && branch !== branchFilter) return false;

      if (!keyword) return true;

      const haystack = [
        item.row_id,
        item.report || '',
        item.root_cause_text || '',
        item.airlines || '',
        branch,
        bucket,
        status,
        item.unit_type || '',
        item.area || '',
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }, [allCases, search, bucketFilter, statusFilter, severityFilter, branchFilter]);

  const totalRecords = topData?.total_records || serviceData?.total_records || casesData?.total_records || 0;
  const gseRecords = topData?.gse_records || serviceData?.gse_records || casesData?.gse_records || 0;
  const showingCases = filteredCases.slice(0, 80);

  if (!isHydrated) {
    return (
      <div className="min-h-screen space-y-6 px-4 py-6 md:px-6">
        <section className="rounded-3xl border border-[var(--surface-2)] bg-[var(--surface-1)] p-6 shadow-spatial-sm">
          <div className="h-6 w-56 animate-pulse rounded bg-gray-200" />
          <div className="mt-3 h-4 w-80 animate-pulse rounded bg-gray-100" />
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-6 px-4 py-6 md:px-6">
      <section className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-[#f4fff6] via-[#f6fbff] to-[#fff8f1] p-6 shadow-spatial-sm">
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="relative z-10">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700">
              <Activity className="h-3.5 w-3.5" />
              OT Command Center
            </span>
            <span className="inline-flex rounded-full border border-sky-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-700">
              GSE Performance
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 md:text-3xl">
            Dashboard Kinerja GSE
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-600">
            Menampilkan ringkasan kondisi peralatan (GSE): sebaran subkategori kasus, status kelaikan unit,
            tren bulanan, serta contoh kasus.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-gray-600">
            <span className="rounded-full border border-white bg-white/80 px-3 py-1">Subkategori: {subcategories.length}</span>
            <span className="rounded-full border border-white bg-white/80 px-3 py-1">Unit GSE: {unitRows.length}</span>
            <span className="rounded-full border border-white bg-white/80 px-3 py-1">Total kasus: {allCases.length}</span>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Data"
          value={totalRecords.toLocaleString('id-ID')}
          note="Jumlah seluruh data"
          accent="blue"
          icon={CircleGauge}
        />
        <StatCard
          label="Terkait GSE"
          value={gseRecords.toLocaleString('id-ID')}
          note={`${((gseRecords / Math.max(totalRecords, 1)) * 100).toFixed(1)}% dari total data`}
          accent="emerald"
          icon={Wrench}
        />
        <StatCard
          label="Tingkat Kelaikan Unit"
          value={`${serviceabilityRate.toFixed(1)}%`}
          note={`${serviceableCount.toLocaleString('id-ID')} unit layak pakai`}
          accent="amber"
          icon={ShieldCheck}
        />
        <StatCard
          label="Kasus Prioritas Tinggi"
          value={severitySummary.high.toLocaleString('id-ID')}
          note={`${unserviceableCount.toLocaleString('id-ID')} unit tidak layak pakai`}
          accent="rose"
          icon={AlertTriangle}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          <div className="rounded-2xl border border-[var(--surface-2)] bg-[var(--surface-1)] p-4 shadow-spatial-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-gray-800">Distribusi Subkategori GSE</h2>
                <p className="text-xs text-gray-500">Distribusi kasus per subkategori.</p>
              </div>
              {resolvedSubcategory && (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-semibold text-emerald-700">
                  Fokus: {resolvedSubcategory}
                </span>
              )}
            </div>
            <ResponsivePieChart
              data={subcategoryDonut}
              donut
              showLegend
              percentageLabels
              innerRadius={68}
              height="h-[320px]"
            />
            <div className="mt-4 flex flex-wrap gap-2">
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
        </div>

        <div className="space-y-4 lg:col-span-5">
          <div className="rounded-2xl border border-[var(--surface-2)] bg-[var(--surface-1)] p-4 shadow-spatial-sm">
            <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-gray-800">Status Kelaikan Unit</h2>
            <p className="mb-4 text-xs text-gray-500">Jumlah unit berdasarkan status kelaikan.</p>

            <div className="space-y-2">
              {statusRows.map((item) => {
                const width = totalStatusRecords > 0 ? (item.count / totalStatusRecords) * 100 : 0;
                return (
                  <div key={item.status} className="rounded-xl border border-gray-200 bg-white p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${toneForStatus(item.status)}`}>
                        {item.status}
                      </span>
                      <span className="text-xs font-bold text-gray-700">{item.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100">
                      <div className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-sky-500" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-gray-200 bg-white p-3">
                <p className="text-[10px] uppercase tracking-wide text-gray-500">Dalam Perbaikan</p>
                <p className="text-lg font-black text-amber-700">{maintenanceCount}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-3">
                <p className="text-[10px] uppercase tracking-wide text-gray-500">Tidak Diketahui</p>
                <p className="text-lg font-black text-slate-700">{unknownCount}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--surface-2)] bg-[var(--surface-1)] p-4 shadow-spatial-sm lg:col-span-12">
          <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-gray-800">Unit Teratas</h2>
          <p className="mb-4 text-xs text-gray-500">Unit dengan jumlah terbanyak.</p>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="w-full">
              <ResponsivePieChart
                data={topUnitsDonut}
                donut
                showLegend={false}
                showDataLabels={false}
                innerRadius={54}
                height="h-[260px]"
              />
            </div>
            <div className="grid grid-cols-1 gap-2">
              {topUnitsLegend.map((item, index) => (
                <div key={item.name} className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs">
                  <div className="flex items-center gap-2 text-gray-700">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: UNIT_DONUT_COLORS[index % UNIT_DONUT_COLORS.length] }}
                    />
                    <span>{item.name}</span>
                  </div>
                  <span className="font-bold text-gray-800">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="rounded-2xl border border-[var(--surface-2)] bg-[var(--surface-1)] p-4 shadow-spatial-sm lg:col-span-7">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-gray-800">
                Rincian Subkategori {resolvedSubcategory ? `· ${resolvedSubcategory}` : ''}
              </h2>
              <p className="text-xs text-gray-500">Menampilkan area, cabang, maskapai, saran, dan contoh kasus.</p>
            </div>
            <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[10px] font-semibold text-sky-700">
              Jumlah {selectedDetail?.count || activeBucketCases.length}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {[{ title: 'Area Teratas', rows: topAreas }, { title: 'Cabang Teratas', rows: topBranches }, { title: 'Maskapai Teratas', rows: topAirlines }].map(
              (group) => (
                <div key={group.title} className="rounded-xl border border-gray-200 bg-white p-3">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-600">{group.title}</p>
                  <div className="space-y-2">
                    {group.rows.map(([name, value], idx) => {
                      const max = group.rows[0]?.[1] || 1;
                      const width = (value / max) * 100;
                      return (
                        <div key={`${group.title}-${name}`} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-700">{idx + 1}. {name}</span>
                            <span className="font-bold text-gray-800">{value}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-gray-100">
                            <div className="h-1.5 rounded-full bg-gradient-to-r from-[#159b74] to-[#70b1ff]" style={{ width: `${width}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    {group.rows.length === 0 && <p className="text-xs text-gray-400">Belum ada data</p>}
                  </div>
                </div>
              )
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-600">Rekomendasi</p>
              {recommendations.length > 0 ? (
                <ul className="space-y-2 text-xs text-gray-700">
                  {recommendations.map((item, index) => (
                    <li key={`${item}-${index}`} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-400">Belum ada rekomendasi untuk subkategori ini.</p>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-600">Contoh Kasus</p>
              <div className="space-y-2">
                {exampleCases.map((item) => (
                  <div key={item.row_id} className="rounded-lg border border-gray-100 bg-gray-50 p-2.5">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-gray-600">{item.row_id}</span>
                      <span className="text-[10px] text-gray-500">{item.branch} · {item.area}</span>
                    </div>
                    <p className="line-clamp-2 text-xs text-gray-700">{item.report}</p>
                    <p className="mt-1 line-clamp-2 text-[11px] text-gray-500">Penyebab: {item.root_cause}</p>
                  </div>
                ))}
                {exampleCases.length === 0 && <p className="text-xs text-gray-400">Belum ada contoh kasus.</p>}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--surface-2)] bg-[var(--surface-1)] p-4 shadow-spatial-sm lg:col-span-5">
          <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-gray-800">Tren Bulanan Kasus</h2>
          <p className="mb-4 text-xs text-gray-500">
            Tren jumlah kasus per bulan.
          </p>
          <MonthlyTrendChart
            title={resolvedSubcategory ? `Trend ${resolvedSubcategory}` : 'Trend Semua Subkategori'}
            data={trendData}
            explanation="Jika data bulanan kosong, tren dihitung ulang dari daftar kasus."
          />
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--surface-2)] bg-[var(--surface-1)] p-4 shadow-spatial-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-800">Ringkasan Kondisi Unit</h2>
            <p className="text-xs text-gray-500">Ringkasan setiap jenis unit beserta status kondisinya.</p>
          </div>
          <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[10px] font-semibold text-gray-600">
            Total Jenis Unit: {unitRows.length}
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-[780px] border-collapse text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-500">Unit</th>
                <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-500">Jumlah</th>
                <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-500">Porsi</th>
                <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-500">Campuran Status</th>
              </tr>
            </thead>
            <tbody>
              {unitRows.map((row) => {
                const total = sumMap(row.statuses);
                return (
                  <tr key={row.unit} className="border-t border-gray-100">
                    <td className="px-3 py-2.5 text-xs font-semibold text-gray-800">{row.unit}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-700">{row.count}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-700">{row.percentage.toFixed(1)}%</td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        {STATUS_ORDER.map((status) => {
                          const count = toNumber(row.statuses?.[status]);
                          if (count <= 0) return null;
                          const percent = total > 0 ? (count / total) * 100 : 0;
                          return (
                            <span
                              key={`${row.unit}-${status}`}
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${toneForStatus(status)}`}
                            >
                              {status} {count} ({percent.toFixed(0)}%)
                            </span>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {unitRows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-sm text-gray-400">
                    Data unit belum tersedia.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--surface-2)] bg-[var(--surface-1)] p-4 shadow-spatial-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-800">Daftar Kasus</h2>
            <p className="text-xs text-gray-500">Daftar kasus yang bisa dicari dan disaring sesuai kebutuhan.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px]">
            <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 font-semibold text-rose-700">
              Tinggi: {severitySummary.high}
            </span>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-semibold text-amber-700">
              Sedang: {severitySummary.medium}
            </span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
              Rendah: {severitySummary.low}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-5">
          <label className="relative block lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari laporan, penyebab, ID, cabang, atau unit..."
              className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-emerald-300"
            />
          </label>

          <select
            value={bucketFilter}
            onChange={(event) => setBucketFilter(event.target.value)}
            className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-emerald-300"
          >
            <option value="ALL">Semua Bucket</option>
            {bucketOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-emerald-300"
          >
            <option value="ALL">Semua Status</option>
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <select
            value={severityFilter}
            onChange={(event) => setSeverityFilter(event.target.value)}
            className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-emerald-300"
          >
            <option value="ALL">Semua Severity</option>
            {severityOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <select
            value={branchFilter}
            onChange={(event) => setBranchFilter(event.target.value)}
            className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-emerald-300"
          >
            <option value="ALL">Semua Branch</option>
            {branchOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
          Menampilkan {showingCases.length.toLocaleString('id-ID')} dari {filteredCases.length.toLocaleString('id-ID')} hasil filter
          {allCases.length ? ` (total source: ${allCases.length.toLocaleString('id-ID')} kasus)` : ''}.
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-[1240px] border-collapse text-left">
            <thead className="bg-gray-50">
              <tr>
                {['Tanggal', 'ID', 'Kategori', 'Tingkat Risiko', 'Status', 'Unit', 'Area', 'Cabang', 'Maskapai', 'Laporan', 'Aksi'].map((head) => (
                  <th key={head} className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {showingCases.map((item, index) => {
                const rowKey = `${item.row_id}-${index}`;
                const isExpanded = expandedCaseKey === rowKey;

                return (
                  <Fragment key={rowKey}>
                    <tr className="border-t border-gray-100 align-top">
                      <td className="px-3 py-2.5 text-xs text-gray-600">{formatCaseDate(item.date)}</td>
                      <td className="px-3 py-2.5 text-xs font-semibold text-gray-700">{item.row_id}</td>
                      <td className="px-3 py-2.5">
                        <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                          {item.bucket || 'Other'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${toneForSeverity(item.severity)}`}>
                          {item.severity || 'Low'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${toneForStatus(item.status || 'Unknown')}`}>
                          {item.status || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-700">{item.unit_type || '-'}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-700">{item.area || '-'}</td>
                      <td className="px-3 py-2.5 text-xs font-semibold text-gray-700">{item.branch || '-'}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-700">{item.airlines || '-'}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-600">
                        <p className="line-clamp-2 max-w-xl">{item.report || '-'}</p>
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        <button
                          type="button"
                          onClick={() => setExpandedCaseKey(isExpanded ? null : rowKey)}
                          className={`rounded-md border px-2 py-1 text-[10px] font-semibold transition ${
                            isExpanded
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          {isExpanded ? 'Hide' : 'View'}
                        </button>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="border-t border-emerald-100 bg-emerald-50/30">
                        <td colSpan={11} className="px-4 py-4">
                          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                            <div className="rounded-lg border border-gray-200 bg-white p-3">
                              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Report Detail</p>
                              <p className="whitespace-pre-line text-xs leading-relaxed text-gray-700">{item.report || '-'}</p>
                            </div>
                            <div className="rounded-lg border border-gray-200 bg-white p-3">
                              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Root Cause Detail</p>
                              <p className="whitespace-pre-line text-xs leading-relaxed text-gray-700">{item.root_cause_text || '-'}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {!loading && showingCases.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-3 py-8 text-center text-sm text-gray-400">
                    Tidak ada data yang cocok dengan filter saat ini.
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
