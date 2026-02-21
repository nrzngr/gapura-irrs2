'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  fetchAreaOverview,
  fetchCategoryBreakdownByArea,
  fetchBranchWithinArea,
  fetchAirlineWithinArea,
  fetchMonthlyTrendForArea,
  fetchRootCauseForArea,
  fetchBranchCategoryHeatmap,
  fetchAllAreaIntelReports,
  AreaSummary,
  AreaCategoryBreakdown,
  BranchWithinAreaData,
  AirlineWithinAreaData,
  TrendDataPoint,
  RootCauseParetoData,
  HeatmapMatrix,
  AreaReportRecord,
} from './data';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { ArrowUp, ArrowDown, Minus, Download, Filter, Zap } from 'lucide-react';
import { saveAs } from 'file-saver';
import { InvestigativeTable } from '@/components/chart-detail/InvestigativeTable';
import { DataTableWithPagination } from '@/components/chart-detail/DataTableWithPagination';
import type { QueryResult } from '@/types/builder';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface FilterParams {
  hub?: string;
  branch?: string;
  airlines?: string;
  area?: string;
  sourceSheet?: string;
}

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  color?: 'green' | 'red' | 'yellow' | 'blue' | 'orange';
}

function KPICard({ title, value, subtitle, trend, color = 'blue' }: KPICardProps) {
  const colorClasses = {
    green: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    yellow: 'bg-amber-50 border-amber-200 text-amber-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
  };

  return (
    <div className={`p-4 rounded-xl border ${colorClasses[color]} transition-all hover:shadow-md`}>
      <div className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">{title}</div>
      <div className="text-2xl font-black tracking-tight">{value}</div>
      {subtitle && <div className="text-xs font-medium opacity-70 mt-1">{subtitle}</div>}
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-bold mt-2 ${trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-red-600' : 'text-gray-500'}`}>
          {trend > 0 ? <ArrowUp size={12} /> : trend < 0 ? <ArrowDown size={12} /> : <Minus size={12} />}
          <span>{Math.abs(trend).toFixed(1)}% MoM</span>
        </div>
      )}
    </div>
  );
}

// ─── Auto-Insight Block ───
function AutoInsight({ data }: { data: AreaSummary[] }) {
  if (data.length === 0) return null;

  const topArea = data[0];
  const highRiskAreas = data.filter(a => a.riskIndex >= 50);
  const totalReports = data.reduce((s, a) => s + a.total, 0);
  const irregTotal = data.reduce((s, a) => s + a.irregularity, 0);
  const overallIrregRate = totalReports > 0 ? (irregTotal / totalReports) * 100 : 0;

  // Find which branches are most concentrated for the top area
  const topAreaContribution = topArea.contribution.toFixed(0);

  const insightParts: string[] = [];
  insightParts.push(
    `${topArea.area} area accounts for ${topAreaContribution}% of irregularities, dominating the report landscape.`
  );
  if (highRiskAreas.length > 0) {
    insightParts.push(
      `${highRiskAreas.length} area${highRiskAreas.length > 1 ? 's' : ''} flagged as high risk (${highRiskAreas.map(a => a.area).join(', ')}).`
    );
  }
  insightParts.push(
    `Overall irregularity rate: ${overallIrregRate.toFixed(1)}% across ${data.length} areas.`
  );
  if (topArea.momGrowth !== 0) {
    insightParts.push(
      `${topArea.area} shows ${topArea.momGrowth > 0 ? 'an increase' : 'a decrease'} of ${Math.abs(topArea.momGrowth).toFixed(1)}% month-over-month.`
    );
  }

  const mainInsight = `${topArea.area} area accounts for ${topAreaContribution}% of reports with a risk index of ${topArea.riskIndex}.`;

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Zap size={18} className="text-amber-600" />
        <h3 className="font-bold text-gray-800">Auto-Insight</h3>
      </div>
      <p className="text-sm font-semibold text-gray-800 mb-2">{mainInsight}</p>
      <ul className="space-y-1.5">
        {insightParts.map((insight, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
            <span className="text-amber-500 mt-0.5">&#8226;</span>
            {insight}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Category Stacked Horizontal Bar ───
function CategoryBreakdownChart({ data }: { data: AreaCategoryBreakdown[] }) {
  const chartData = {
    labels: data.slice(0, 12).map(d => d.area),
    datasets: [
      { label: 'Irregularity', data: data.slice(0, 12).map(d => d.Irregularity), backgroundColor: '#ef4444', borderRadius: 4 },
      { label: 'Complaint', data: data.slice(0, 12).map(d => d.Complaint), backgroundColor: '#f97316', borderRadius: 4 },
      { label: 'Compliment', data: data.slice(0, 12).map(d => d.Compliment), backgroundColor: '#22c55e', borderRadius: 4 },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: {
      legend: { position: 'bottom' as const, labels: { usePointStyle: true, padding: 15, font: { size: 10 } } },
    },
    scales: {
      x: { stacked: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 10 } } },
      y: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 } } },
    },
  };

  return <div className="h-[300px]"><Bar data={chartData} options={options} /></div>;
}

// ─── Branch Distribution Horizontal Bar ───
function BranchDistributionChart({ data }: { data: BranchWithinAreaData[] }) {
  const chartData = {
    labels: data.slice(0, 12).map(d => d.branch),
    datasets: [{
      label: 'Reports',
      data: data.slice(0, 12).map(d => d.count),
      backgroundColor: '#3b82f6',
      borderRadius: 4,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 10 } } },
      y: { grid: { display: false }, ticks: { font: { size: 10 } } },
    },
  };

  return <div className="h-[300px]"><Bar data={chartData} options={options} /></div>;
}

// ─── Airline Distribution Horizontal Bar ───
function AirlineDistributionChart({ data }: { data: AirlineWithinAreaData[] }) {
  const chartData = {
    labels: data.slice(0, 12).map(d => d.airline),
    datasets: [{
      label: 'Reports',
      data: data.slice(0, 12).map(d => d.count),
      backgroundColor: '#8b5cf6',
      borderRadius: 4,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 10 } } },
      y: { grid: { display: false }, ticks: { font: { size: 10 } } },
    },
  };

  return <div className="h-[300px]"><Bar data={chartData} options={options} /></div>;
}

// ─── Monthly Trend Line Chart ───
function MonthlyTrendChart({ data }: { data: TrendDataPoint[] }) {
  const chartData = {
    labels: data.map(d => d.month),
    datasets: [
      {
        label: 'Total',
        data: data.map(d => d.total),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.3,
      },
      {
        label: 'Irregularity',
        data: data.map(d => d.Irregularity),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.3,
      },
      {
        label: 'Complaint',
        data: data.map(d => d.Complaint),
        borderColor: '#f97316',
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        fill: true,
        tension: 0.3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { usePointStyle: true, padding: 20, font: { size: 11 } },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 10 } } },
    },
  };

  return <div className="h-[250px]"><Line data={chartData} options={options} /></div>;
}

// ─── Pareto Root Cause: bar counts + cumulative line ───
function ParetoRootCauseChart({ data }: { data: RootCauseParetoData[] }) {
  const categoryColors: Record<string, string> = {
    Irregularity: '#ef4444',
    Complaint: '#f97316',
    Compliment: '#22c55e',
    Other: '#6b7280',
  };

  const chartData = {
    labels: data.map(d => d.rootCause),
    datasets: [
      {
        type: 'bar' as const,
        label: 'Count',
        data: data.map(d => d.count),
        backgroundColor: data.map(d => categoryColors[d.category] || '#6b7280'),
        borderRadius: 4,
        yAxisID: 'y',
      },
      {
        type: 'line' as const,
        label: 'Cumulative %',
        data: data.map(d => d.cumPercent),
        borderColor: '#6366f1',
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: '#6366f1',
        yAxisID: 'y1',
        tension: 0.3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: {
      legend: { position: 'bottom' as const, labels: { usePointStyle: true, padding: 15, font: { size: 10 } } },
    },
    scales: {
      x: {
        position: 'bottom' as const,
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: { font: { size: 10 } },
      },
      y: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y1: {
        position: 'right' as const,
        min: 0,
        max: 100,
        grid: { display: false },
        ticks: { font: { size: 10 }, callback: (v: number | string) => `${v}%` },
      },
    },
  };

  return <div className="h-[350px]"><Bar data={chartData as any} options={options as any} /></div>;
}

// ─── Heatmap: Branch x Category ───
function HeatmapTable({ matrix }: { matrix: HeatmapMatrix }) {
  const maxValue = Math.max(...Array.from(matrix.cells.values()), 1);

  function getCellColor(value: number): string {
    if (value === 0) return 'bg-gray-50';
    const intensity = value / maxValue;
    if (intensity > 0.75) return 'bg-green-600 text-white';
    if (intensity > 0.5) return 'bg-green-500 text-white';
    if (intensity > 0.25) return 'bg-green-300 text-green-900';
    return 'bg-green-100 text-green-800';
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-gray-600 bg-gray-50 border border-gray-200 sticky left-0 z-10"></th>
            {matrix.cols.map(col => (
              <th key={col} className="px-3 py-2 text-center font-semibold text-gray-600 bg-gray-50 border border-gray-200 whitespace-nowrap">
                {col}
              </th>
            ))}
            <th className="px-3 py-2 text-center font-bold text-gray-800 bg-gray-100 border border-gray-200">Total</th>
          </tr>
        </thead>
        <tbody>
          {matrix.rows.map(row => (
            <tr key={row}>
              <td className="px-3 py-2 font-semibold text-gray-900 bg-gray-50 border border-gray-200 sticky left-0 z-10 whitespace-nowrap">
                {row}
              </td>
              {matrix.cols.map(col => {
                const value = matrix.cells.get(`${row}|||${col}`) || 0;
                return (
                  <td key={col} className={`px-3 py-2 text-center border border-gray-200 font-medium ${getCellColor(value)}`}>
                    {value || '-'}
                  </td>
                );
              })}
              <td className="px-3 py-2 text-center font-bold text-gray-800 bg-gray-100 border border-gray-200">
                {matrix.rowTotals.get(row) || 0}
              </td>
            </tr>
          ))}
          {/* Grand Total Row */}
          <tr>
            <td className="px-3 py-2 font-bold text-gray-800 bg-gray-100 border border-gray-200 sticky left-0 z-10">
              Grand Total
            </td>
            {matrix.cols.map(col => (
              <td key={col} className="px-3 py-2 text-center font-bold text-gray-800 bg-gray-100 border border-gray-200">
                {matrix.colTotals.get(col) || 0}
              </td>
            ))}
            <td className="px-3 py-2 text-center font-black text-gray-900 bg-gray-200 border border-gray-200">
              {matrix.grandTotal}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ─── Management Summary ───
function ManagementSummary({ data }: { data: AreaSummary[] }) {
  if (data.length === 0) return null;

  const topArea = data[0];
  const highRiskCount = data.filter(a => a.riskIndex >= 50).length;
  const avgIrregRate = data.reduce((sum, a) => sum + a.irregularityRate, 0) / data.length;
  const totalReports = data.reduce((sum, a) => sum + a.total, 0);

  const insights = [
    `${topArea.area} leads with ${topArea.total} reports (${topArea.contribution.toFixed(1)}% of total).`,
    `${highRiskCount} area${highRiskCount !== 1 ? 's' : ''} identified as high risk (risk index >= 50).`,
    `Average irregularity rate across areas: ${avgIrregRate.toFixed(1)}%.`,
    `Total volume: ${totalReports.toLocaleString('id-ID')} reports across ${data.length} areas.`,
    topArea.momGrowth !== 0 ? `${topArea.area} trending ${topArea.momGrowth > 0 ? 'upward' : 'downward'} (${topArea.momGrowth > 0 ? '+' : ''}${topArea.momGrowth.toFixed(1)}% MoM).` : null,
  ].filter(Boolean);

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
      <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
        Management Summary
      </h3>
      <ul className="space-y-2">
        {insights.map((insight, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
            <span className="text-[#6b8e3d] mt-0.5">&#8226;</span>
            {insight}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Data Table ───
function DataTable({ data }: { data: AreaReportRecord[] }) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortField, setSortField] = useState('Date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  if (!data || data.length === 0) {
    return <div className="p-8 text-center text-gray-500">No data available</div>;
  }

  const columns = Object.keys(data[0]);

  const filteredData = data
    .filter(row => {
      const matchesSearch = search === '' ||
        columns.some(col => String(row[col]).toLowerCase().includes(search.toLowerCase()));
      const matchesCategory = categoryFilter === 'all' ||
        String(row.Category)?.toLowerCase() === categoryFilter.toLowerCase();
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      const aVal = a[sortField] as string | number;
      const bVal = b[sortField] as string | number;
      if (aVal === bVal) return 0;
      const cmp = aVal < bVal ? -1 : 1;
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
    setCurrentPage(1);
  };

  const handleExportCSV = () => {
    const headers = columns.join(',');
    const rows = filteredData.map(row =>
      columns.map(col => {
        const cell = row[col];
        return typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell;
      }).join(',')
    ).join('\n');
    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'area-intelligence-report.csv');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b8e3d]"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          <option value="all">All Categories</option>
          <option value="Irregularity">Irregularity</option>
          <option value="Complaint">Complaint</option>
          <option value="Compliment">Compliment</option>
        </select>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-[#6b8e3d] text-white rounded-lg text-sm font-medium"
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {columns.map(col => (
                <th key={col} onClick={() => handleSort(col)} className="px-4 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center gap-1">
                    {col}
                    {sortField === col && <span className="text-[#6b8e3d]">{sortDir === 'asc' ? '\u2191' : '\u2193'}</span>}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, idx) => (
              <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50">
                {columns.map(col => (
                  col === 'Evidence' ? (
                    <td key={col} className="px-4 py-2.5 text-gray-700" dangerouslySetInnerHTML={{ __html: row[col] as string || '-' }} />
                  ) : (
                    <td key={col} className="px-4 py-2.5 text-gray-700">{row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'}</td>
                  )
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="p-3 flex items-center justify-between bg-gray-50 border-t">
            <div className="text-sm text-gray-500">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} rows
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-200 rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-200 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───
export default function AreaIntelligenceDetail({ filters = {} }: { filters?: FilterParams }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [areaData, setAreaData] = useState<AreaSummary[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<AreaCategoryBreakdown[]>([]);
  const [branchData, setBranchData] = useState<BranchWithinAreaData[]>([]);
  const [airlineData, setAirlineData] = useState<AirlineWithinAreaData[]>([]);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [paretoData, setParetoData] = useState<RootCauseParetoData[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapMatrix>({ rows: [], cols: [], cells: new Map(), rowTotals: new Map(), colTotals: new Map(), grandTotal: 0 });
  const [tableData, setTableData] = useState<AreaReportRecord[]>([]);
  const investigativeData: QueryResult = useMemo(() => {
    const rows = tableData as unknown as Record<string, unknown>[];
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

    return {
      columns,
      rows,
      rowCount: rows.length,
      executionTimeMs: 0,
    };
  }, [tableData]);
  const fullTableData: QueryResult = useMemo(() => {
    const rows = areaData.map(item => ({ ...item })) as unknown as Record<string, unknown>[];
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

    return {
      columns,
      rows,
      rowCount: rows.length,
      executionTimeMs: 0,
    };
  }, [areaData]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const [areas, catBreakdown, branches, airlines, trend, pareto, heatmap, table] = await Promise.all([
          fetchAreaOverview(filters),
          fetchCategoryBreakdownByArea(filters),
          fetchBranchWithinArea(filters),
          fetchAirlineWithinArea(filters),
          fetchMonthlyTrendForArea(filters),
          fetchRootCauseForArea(filters),
          fetchBranchCategoryHeatmap(filters),
          fetchAllAreaIntelReports(filters),
        ]);

        setAreaData(areas);
        setCategoryBreakdown(catBreakdown);
        setBranchData(branches);
        setAirlineData(airlines);
        setTrendData(trend);
        setParetoData(pareto);
        setHeatmapData(heatmap);
        setTableData(table);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [filters.hub, filters.branch, filters.airlines, filters.area]);

  if (loading) {
    return (
      <div className="min-h-[600px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#6b8e3d]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-2">{error}</div>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-[#6b8e3d] text-white rounded-lg text-sm font-medium">Retry</button>
        </div>
      </div>
    );
  }

  // Compute aggregate KPIs
  const totalReports = areaData.reduce((sum: number, a: any) => sum + a.total, 0);
  const totalIrreg = areaData.reduce((sum: number, a: any) => sum + a.irregularity, 0);
  const totalComplaint = areaData.reduce((sum: number, a: any) => sum + a.complaint, 0);
  const totalCompliment = areaData.reduce((sum: number, a: any) => sum + a.compliment, 0);

  const topArea = areaData[0];
  
  const overallIrregRate = totalReports > 0 ? (totalIrreg / totalReports) * 100 : 0;
  const overallComplaintRate = totalReports > 0 ? (totalComplaint / totalReports) * 100 : 0;
  const overallComplimentRate = totalReports > 0 ? (totalCompliment / totalReports) * 100 : 0;
  const overallNetSentiment = (totalCompliment + totalComplaint) > 0 
    ? ((totalCompliment - totalComplaint) / (totalCompliment + totalComplaint)) * 100 
    : 0;

  const avgRiskIndex = areaData.length > 0 ? areaData.reduce((sum: number, a: any) => sum + a.riskIndex, 0) / areaData.length : 0;

  return (
    <div className="space-y-8">
      {/* 1. Auto-Insight Block */}
      <AutoInsight data={areaData} />

      {/* 2. Hero KPI Cards (2 rows of 4) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Total Reports"
          value={totalReports.toLocaleString('id-ID')}
          subtitle={`Across ${areaData.length} areas`}
          color="blue"
        />
        <KPICard
          title="% of System"
          value={topArea ? `${topArea.percentOfSystem.toFixed(1)}%` : '-'}
          subtitle={topArea ? `Top: ${topArea.area}` : ''}
          color="blue"
        />
        <KPICard
          title="Rank"
          value={topArea ? `#${topArea.rank}` : '-'}
          subtitle={topArea ? topArea.area : ''}
          color="yellow"
        />
        <KPICard
          title="Overall Irreg. %"
          value={`${overallIrregRate.toFixed(1)}%`}
          subtitle="Weighted total"
          color={overallIrregRate > 50 ? 'red' : 'orange'}
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Overall Complaint %"
          value={`${overallComplaintRate.toFixed(1)}%`}
          subtitle="Weighted total"
          color="orange"
        />
        <KPICard
          title="Overall Compliment %"
          value={`${overallComplimentRate.toFixed(1)}%`}
          subtitle="Weighted total"
          color="green"
        />
        <KPICard
          title="Overall Net Sentiment"
          value={`${overallNetSentiment >= 0 ? '+' : ''}${overallNetSentiment.toFixed(1)}%`}
          subtitle="Weighted total"
          color={overallNetSentiment > 0 ? 'green' : 'red'}
        />
        <KPICard
          title="Risk Score Index"
          value={avgRiskIndex.toFixed(1)}
          subtitle="Avg (Irreg*2 + Complaint)"
          trend={topArea?.momGrowth}
          color={avgRiskIndex >= 50 ? 'red' : avgRiskIndex >= 20 ? 'orange' : 'green'}
        />
      </div>

      {/* 3. Category Breakdown within Area */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-1">Category Breakdown within Area</h2>
        <p className="text-xs text-gray-500 mb-4">Stacked Irregularity / Complaint / Compliment per area (absolute values)</p>
        <CategoryBreakdownChart data={categoryBreakdown} />
      </section>

      {/* 4 & 5. Branch and Airline Distribution (side by side) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-1">Branch Distribution within Area</h2>
          <p className="text-xs text-gray-500 mb-4">Branches ranked by report volume</p>
          <BranchDistributionChart data={branchData} />
        </section>
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-1">Airline Distribution within Area</h2>
          <p className="text-xs text-gray-500 mb-4">Top airlines contributing to this area</p>
          <AirlineDistributionChart data={airlineData} />
        </section>
      </div>

      {/* 6. Monthly Trend for Area */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-1">Monthly Trend for Area</h2>
        <p className="text-xs text-gray-500 mb-4">Total / Irregularity / Complaint volume over last 14 months</p>
        <MonthlyTrendChart data={trendData} />
      </section>

      {/* 7. Root Cause Pareto */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-1">Root Cause Pareto Analysis</h2>
        <p className="text-xs text-gray-500 mb-4">Top issues ranked by frequency with cumulative percentage</p>
        <ParetoRootCauseChart data={paretoData} />
      </section>

      {/* 8. Heatmap: Branch x Category */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-1">Heatmap: Branch x Category</h2>
        <p className="text-xs text-gray-500 mb-4">Green intensity scale with row/column totals</p>
        <HeatmapTable matrix={heatmapData} />
      </section>

      {/* 9. Management Summary */}
      <ManagementSummary data={areaData} />

      {/* Investigative Table */}
      <InvestigativeTable
        data={investigativeData}
        title="Investigative Table - Area Intelligence"
        rowsPerPage={5}
        maxRows={40}
      />

      {/* 10. Full Data Table */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800">Full Data Table</h2>
        </div>
        <div className="p-6">
          <DataTableWithPagination data={fullTableData} title="Area Intelligence (Main Chart Source)" />
        </div>
      </section>
    </div>
  );
}
