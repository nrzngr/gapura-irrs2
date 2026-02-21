'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import {
  fetchAirlineSummary,
  fetchMonthlyTrendByAirline,
  fetchBranchByAirline,
  fetchRootCauseByAirline,
  fetchAllAirlineReports,
  fetchCategoryByAirline,
  fetchAreaByAirline,
  fetchRootCausePareto,
  fetchAirlineKPIs,
  fetchAirlineCategoryBreakdown,
  fetchAggregatedAirlineReport,
  AirlineSummary,
  TrendDataPoint,
  BranchByAirlineData,
  RootCauseByAirlineData,
  AirlineReportRecord,
  AirlineCategoryData,
  AreaByAirlineData,
  RootCauseParetoData,
  AirlineKPIs,
  AirlineCategoryBreakdown,
} from './data';
import { fetchRiskSummaryAi, AiRiskSummary } from '@/lib/services/gapura-ai';
import { HeatmapChart } from '@/components/charts/HeatmapChart';
import { 
  BarChart, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip, 
  Legend as RechartsLegend, 
  ResponsiveContainer, 
  Bar as RechartsBar 
} from 'recharts';
import { barLabelsPlugin } from '../chartConfig';
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
import { 
  ArrowUp, 
  ArrowDown, 
  Minus, 
  Download, 
  Filter, 
  AlertTriangle, 
  Zap,
  Brain 
} from 'lucide-react';
import { saveAs } from 'file-saver';
import { InvestigativeTable } from '@/components/chart-detail/InvestigativeTable';
import { DataTableWithPagination } from '@/components/chart-detail/DataTableWithPagination';
import { AiRootCauseInvestigation } from '../ai-root-cause/AiRootCauseInvestigation';
import { AirlineAIVisualization } from '@/components/chart-detail/ai/AirlineAIVisualization';
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
  dateFrom?: string;
  dateTo?: string;
}

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  color?: 'green' | 'red' | 'yellow' | 'blue' | 'orange';
  explanation?: string;
}

function KPICard({ title, value, subtitle, trend, color = 'blue', explanation }: KPICardProps) {
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
          <span>{Math.abs(trend).toFixed(1)}% vs Avg</span>
        </div>
      )}
      {explanation && (
        <div className="text-xs text-gray-600 mt-2 pt-2 border-t border-gray-200 leading-relaxed">
          {explanation}
        </div>
      )}
    </div>
  );
}

// ─── Auto-Insight Block ───
function AutoInsight({ data }: {
  data: AirlineSummary[];
}) {
  if (data.length === 0) return null;

  const topAirline = data[0];
  const highRiskAirlines = data.filter(a => a.riskIndex >= 50);

  const insightParts: string[] = [];
  if (highRiskAirlines.length > 0) {
    insightParts.push(`${highRiskAirlines.length} airline${highRiskAirlines.length > 1 ? 's' : ''} flagged as high risk (${highRiskAirlines.map(a => a.airline).join(', ')})`);
  }
  insightParts.push(`${topAirline.airline} leads with ${topAirline.total} reports (${topAirline.contribution.toFixed(1)}% share)`);

  const mainInsight = `Performance analysis across ${data.length} airlines. ${topAirline.airline} currently shows the highest report volume.`;

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
            <span className="text-amber-500 mt-0.5">•</span>
            {insight}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AirlineRankTable({ data }: { data: AirlineSummary[] }) {
  const getRiskLevel = (riskIndex: number) => {
    if (riskIndex >= 50) return { label: 'High', color: 'bg-red-500' };
    if (riskIndex >= 20) return { label: 'Medium', color: 'bg-orange-500' };
    return { label: 'Low', color: 'bg-green-500' };
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-gray-600">Rank</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-600">Airline</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-600">Total</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-600">Irreg.</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-600">Complaint</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-600">Compliment</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-600">Irreg. Rate</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-600">Net Sentiment</th>
            <th className="px-3 py-2 text-center font-semibold text-gray-600">Risk</th>
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 15).map((airline) => {
            const risk = getRiskLevel(airline.riskIndex);
            return (
              <tr key={airline.airline} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2 font-bold text-gray-700">#{airline.rank}</td>
                <td className="px-3 py-2 font-semibold text-gray-900">{airline.airline}</td>
                <td className="px-3 py-2 text-right font-medium">{airline.total.toLocaleString('id-ID')}</td>
                <td className="px-3 py-2 text-right text-red-600">{airline.irregularity}</td>
                <td className="px-3 py-2 text-right text-orange-600">{airline.complaint}</td>
                <td className="px-3 py-2 text-right text-green-600">{airline.compliment}</td>
                <td className="px-3 py-2 text-right">{airline.irregularityRate.toFixed(1)}%</td>
                <td className="px-3 py-2 text-right">{airline.netSentiment > 0 ? '+' : ''}{airline.netSentiment.toFixed(1)}%</td>
                <td className="px-3 py-2 text-center">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${risk.color}`}>{risk.label}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

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
      y: { 
        grid: { color: 'rgba(0,0,0,0.05)' }, 
        ticks: { font: { size: 10 } },
        suggestedMax: data.length > 0 ? Math.max(...data.map(d => Math.max(d.total, d.Irregularity, d.Complaint, d.Compliment))) * 1.2 : undefined
      },
    },
  };

  return <div className="h-[250px]"><Line data={chartData} options={options} plugins={[barLabelsPlugin]} /></div>;
}


function BranchDistributionChart({ data }: { data: BranchByAirlineData[] }) {
  const topBranches = Array.from(
    data.reduce((acc, curr) => {
      const existing = acc.get(curr.branch) || 0;
      acc.set(curr.branch, existing + curr.count);
      return acc;
    }, new Map<string, number>())
  ).sort((a, b) => b[1] - a[1]).slice(0, 12);

  const chartData = {
    labels: topBranches.map(([branch]) => branch.split(' ')),
    datasets: [{
      label: 'Reports',
      data: topBranches.map(([, count]) => count),
      backgroundColor: '#3b82f6',
      borderRadius: 4,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'x' as const,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 0, minRotation: 0, padding: 12 } },
      y: { 
        grid: { color: 'rgba(0,0,0,0.05)' }, 
        ticks: { font: { size: 10 } },
        suggestedMax: topBranches.length > 0 ? Math.max(...topBranches.map(d => d[1])) * 1.15 : undefined 
      },
    },
  };

  return <div className="h-[300px]"><Bar data={chartData} options={options} plugins={[barLabelsPlugin]} /></div>;
}

// ─── Category Stacked Bar: Irregularity/Complaint/Compliment per Airline ───
function CategoryStackedBar({ data }: { data: AirlineCategoryData[] }) {
  const chartData = {
    labels: data.slice(0, 10).map(d => d.airline.split(' ')),
    datasets: [
      { label: 'Irregularity', data: data.slice(0, 10).map(d => d.Irregularity), backgroundColor: '#ef4444', borderRadius: 4 },
      { label: 'Complaint', data: data.slice(0, 10).map(d => d.Complaint), backgroundColor: '#f97316', borderRadius: 4 },
      { label: 'Compliment', data: data.slice(0, 10).map(d => d.Compliment), backgroundColor: '#22c55e', borderRadius: 4 },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'x' as const,
    plugins: {
      legend: { position: 'bottom' as const, labels: { usePointStyle: true, padding: 15, font: { size: 10 } } },
    },
    scales: {
      x: { stacked: false, grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 0, minRotation: 0, padding: 12 } },
      y: {
        stacked: false,
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: { font: { size: 10 } },
        suggestedMax: data.length > 0 ? Math.max(...data.slice(0, 10).map(d => Math.max(d.Irregularity, d.Complaint, d.Compliment))) * 1.15 : undefined
      },
    },
  };

  return <div className="h-[300px]"><Bar data={chartData} options={options} plugins={[barLabelsPlugin]} /></div>;
}

// ─── Top 10 Airlines Category Breakdown (Vertical Grouped Bar) ───
function Top10AirlinesCategoryChart({ data }: { data: AirlineCategoryBreakdown[] }) {
  const chartData = {
    labels: data.map(d => d.airline.split(' ')),
    datasets: [
      { label: 'Irregularity', data: data.map(d => d.irregularity), backgroundColor: '#ef4444', borderRadius: 4 },
      { label: 'Complaint', data: data.map(d => d.complaint), backgroundColor: '#f97316', borderRadius: 4 },
      { label: 'Compliment', data: data.map(d => d.compliment), backgroundColor: '#22c55e', borderRadius: 4 },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'x' as const,
    plugins: {
      legend: { position: 'bottom' as const, labels: { usePointStyle: true, padding: 15, font: { size: 10 } } },
    },
    scales: {
      x: {
        stacked: false,
        grid: { display: false },
        ticks: { font: { size: 10 }, maxRotation: 0, minRotation: 0, padding: 12 }
      },
      y: {
        stacked: false,
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: { font: { size: 10 } }
      },
    },
  };

  return <div className="h-[400px]"><Bar data={chartData} options={options} plugins={[barLabelsPlugin]} /></div>;
}

// ─── Pareto Root Cause: vertical bar counts ───

// ─── Area Breakdown Chart ───
function AreaBreakdownChart({ data }: { data: AreaByAirlineData[] }) {
  const chartData = {
    labels: data.map(d => d.area.split(' ')),
    datasets: [{
      label: 'Reports',
      data: data.map(d => d.count),
      backgroundColor: ['#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899', '#10b981', '#6366f1'],
      borderRadius: 4,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 0, minRotation: 0, padding: 12 } },
      y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 10 } },
           suggestedMax: data.length > 0 ? Math.max(...data.map(d => d.count)) * 1.15 : undefined },
    },
  };

  return <div className="h-[200px]"><Bar data={chartData} options={options} plugins={[barLabelsPlugin]} /></div>;
}

function DataTable({ data }: { data: AirlineReportRecord[] }) {
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
    saveAs(blob, 'airline-report.csv');
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
                    {sortField === col && <span className="text-[#6b8e3d]">{sortDir === 'asc' ? '↑' : '↓'}</span>}
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

function ManagementSummary({ data }: { data: AirlineSummary[] }) {
  if (data.length === 0) return null;

  const topAirline = data[0];
  const highRiskCount = data.filter(a => a.riskIndex >= 50).length;
  const totalIrreg = data.reduce((sum, a) => sum + a.irregularity, 0);
  const totalReports = data.reduce((sum, a) => sum + a.total, 0);
  const avgIrregRate = totalReports > 0 ? (totalIrreg / totalReports) * 100 : 0;

  const insights = [
    `${topAirline.airline} leads with ${topAirline.total} reports (${topAirline.contribution.toFixed(1)}% of total).`,
    `${highRiskCount} airline${highRiskCount !== 1 ? 's' : ''} identified as high risk.`,
    `Average irregularity rate across airlines: ${avgIrregRate.toFixed(1)}%.`,
    `Total volume: ${totalReports.toLocaleString('id-ID')} reports across ${data.length} airlines.`,
  ];

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
      <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
        ✈️ Management Summary
      </h3>
      <ul className="space-y-2">
        {insights.map((insight, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
            <span className="text-[#6b8e3d] mt-0.5">•</span>
            {insight}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AirlineReportDetail({ filters = {} }: { filters?: FilterParams }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [airlineData, setAirlineData] = useState<AirlineSummary[]>([]);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [branchData, setBranchData] = useState<BranchByAirlineData[]>([]);
  const [rootCauseData, setRootCauseData] = useState<RootCauseByAirlineData[]>([]);
  const [tableData, setTableData] = useState<AirlineReportRecord[]>([]);
  const [categoryData, setCategoryData] = useState<AirlineCategoryData[]>([]);
  const [areaData, setAreaData] = useState<AreaByAirlineData[]>([]);
  const [paretoData, setParetoData] = useState<RootCauseParetoData[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<AirlineCategoryBreakdown[]>([]);
  const [kpis, setKpis] = useState<AirlineKPIs | null>(null);
  const [aiRiskSummary, setAiRiskSummary] = useState<AiRiskSummary | null>(null);
  const [aiRiskHeatmap, setAiRiskHeatmap] = useState<any[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
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
    const rows = airlineData.map(item => ({ ...item })) as unknown as Record<string, unknown>[];
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

    return {
      columns,
      rows,
      rowCount: rows.length,
      executionTimeMs: 0,
    };
  }, [airlineData]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadAggregatedData() {
      setLoading(true);
      setError(null);

      try {
        const aggregated = await fetchAggregatedAirlineReport(filters as any);
        
        if (aggregated && aggregated.airlineData) {
          setAirlineData(aggregated.airlineData);
          setTrendData(aggregated.trendData || []);
          setCategoryBreakdown(aggregated.categoryBreakdown || []);
          setCategoryData(aggregated.categoryData || []);
          setKpis(aggregated.kpis);
        } else {
          throw new Error('Invalid aggregated airline data');
        }

        // Load AI data separately
        fetchRiskSummaryAi(controller.signal).then(riskSummaryRes => {
          const riskSummaryResult = riskSummaryRes as AiRiskSummary | null;
          if (riskSummaryResult) {
            setAiRiskSummary(riskSummaryResult);
            if (riskSummaryResult.airline_details) {
              const heatmapData = riskSummaryResult.airline_details.flatMap(a => 
                Object.entries(a.severity_distribution).map(([sev, count]) => ({
                  airline: a.name,
                  severity: sev,
                  count: count
                }))
              );
              setAiRiskHeatmap(heatmapData);
            }
          }
        }).catch(err => {
          if (err.name === 'AbortError') return;
          console.warn('AI Risk failed:', err);
        });

      } catch (err) {
        if ((err as any).name === 'AbortError') return;
        console.error('Failed to load aggregated airline data:', err);
        setError('Failed to load primary chart data.');
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadAggregatedData();

    return () => {
      controller.abort();
    };
  }, [filters.hub, filters.branch, filters.airlines, filters.area, filters.dateFrom, filters.dateTo]);

  useEffect(() => {
    async function loadDeferredData() {
      setTableLoading(true);
      try {
        const [branch, rootCause, table, area, pareto] = await Promise.all([
          fetchBranchByAirline(filters as any),
          fetchRootCauseByAirline(filters as any),
          fetchAllAirlineReports(filters as any),
          fetchAreaByAirline(filters as any),
          fetchRootCausePareto(filters as any),
        ]);
        setBranchData(branch);
        setRootCauseData(rootCause);
        setTableData(table);
        setAreaData(area);
        setParetoData(pareto);
      } catch (err) {
        console.error('Failed to load deferred airline data:', err);
      } finally {
        setTableLoading(false);
      }
    }

    loadDeferredData();
  }, [filters.hub, filters.branch, filters.airlines, filters.area, filters.dateFrom, filters.dateTo]);

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
          <div className="text-red-500 mb-2">⚠️ {error}</div>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-[#6b8e3d] text-white rounded-lg text-sm font-medium">Retry</button>
        </div>
      </div>
    );
  }

  const totalReports = airlineData.reduce((sum: number, a: any) => sum + a.total, 0);
  const totalIrreg = airlineData.reduce((sum: number, a: any) => sum + a.irregularity, 0);
  const totalComplaint = airlineData.reduce((sum: number, a: any) => sum + a.complaint, 0);
  const totalCompliment = airlineData.reduce((sum: number, a: any) => sum + a.compliment, 0);

  const overallIrregRate = totalReports > 0 ? (totalIrreg / totalReports) * 100 : 0;
  const overallNetSentiment = (totalCompliment + totalComplaint) > 0 
    ? ((totalCompliment - totalComplaint) / (totalCompliment + totalComplaint)) * 100 
    : 0;

  const avgRiskIndex = airlineData.length > 0 ? airlineData.reduce((sum: number, a: any) => sum + a.riskIndex, 0) / airlineData.length : 0;

  return (
    <div className="space-y-8">
      {/* Auto-Insight Block */}
      <AutoInsight data={airlineData} />

      {/* Task 3: New Custom KPIs */}
      {kpis && kpis.totalAirlines > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <KPICard title="Total Airlines" value={kpis.totalAirlines} color="blue" explanation="Total maskapai yang terdaftar dalam dataset ini." />
          <KPICard
            title="Top Airline"
            value={kpis.topAirline?.name || '-'}
            subtitle={`${kpis.topAirline?.count || 0} reports`}
            color="red"
            explanation="Maskapai dengan jumlah laporan tertinggi pada periode ini." 
          />
          <KPICard
            title="Best Performer"
            value={kpis.bestPerformer?.name || '-'}
            subtitle={`${kpis.bestPerformer?.count || 0} reports`}
            color="green"
            explanation="Performa terbaik berdasarkan jumlah laporan terbanyak." 
          />
          <KPICard title="Avg Reports/Airline" value={kpis.avgReportsPerAirline || 0} color="yellow" explanation="Rata-rata laporan per maskapai dalam dataset." />
          <KPICard title="Compliment Ratio" value={`${kpis.complimentRatio || 0}%`} color="green" explanation="Proporsi ulasan positif terhadap total ulasan." />
        </div>
      )}

      {/* Task 3: Top 10 Airlines Category Breakdown Chart */}
      {categoryBreakdown && (
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-1">Top 10 Airlines - Category Breakdown</h2>
          <p className="text-xs text-gray-500 mb-4">Stacked distribution of Irregularity, Complaint, and Compliment</p>
          <Top10AirlinesCategoryChart data={categoryBreakdown} />
        </section>
      )}

      {/* Original KPI Cards - Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KPICard
          title="Overall Irreg. Rate"
          value={`${overallIrregRate.toFixed(1)}%`}
          color={overallIrregRate >= 5 ? 'red' : 'green'}
        />
        <KPICard
          title="Overall Net Sentiment"
          value={`${overallNetSentiment >= 0 ? '+' : ''}${overallNetSentiment.toFixed(1)}%`}
          color={overallNetSentiment > 0 ? 'green' : 'red'}
        />
        <KPICard
          title="Top Airline"
          value={airlineData[0]?.airline || '-'}
          subtitle={`#1 with ${airlineData[0]?.total || 0} reports`}
        />
      </div>

      {/* Airline Ranking Table */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Airline Performance Ranking</h2>
        <AirlineRankTable data={airlineData} />
      </section>


      {/* Monthly Trend */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Monthly Trend (Stability Check)</h2>
        <MonthlyTrendChart data={trendData} />
      </section>

      {/* Split View: Category Composition & Branch Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-1">Category Composition by Airline</h2>
          <p className="text-xs text-gray-500 mb-4">Stacked Irregularity / Complaint / Compliment per airline</p>
          <CategoryStackedBar data={categoryData} />
        </section>
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-1">Branch Distribution</h2>
          <p className="text-xs text-gray-500 mb-4">Are issues systemic or specific to one location?</p>
          <BranchDistributionChart data={branchData} />
        </section>
      </div>

            {/* AI Risk Heatmap */}
      {aiRiskHeatmap.length > 0 && (
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-gray-800">AI Risk Heatmap</h2>
          </div>
          <p className="text-xs text-gray-500 mb-4">Proactive risk analysis by severity across airlines</p>
          <div className="h-[400px]">
            <HeatmapChart 
              data={aiRiskHeatmap}
              xAxis="severity"
              yAxis="airline"
              metric="count"
              showTitle={false}
            />
          </div>
        </section>
      )}

      {/* AI Root Cause Investigation - Full Width */}
      <Suspense fallback={<div className="h-[400px] flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#6b8e3d]"></div></div>}>
        <section className="bg-white/40 backdrop-blur-3xl rounded-[2.5rem] border border-white p-8 shadow-2xl shadow-indigo-500/10 transition-all hover:shadow-indigo-500/20">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">AI Root Cause Analysis</h2>
              <p className="text-slate-500 text-sm font-medium">Neural investigation into operational friction points.</p>
            </div>
          </div>
          <AiRootCauseInvestigation source={filters.sourceSheet || "CGO"} />
        </section>
      </Suspense>

      {/* AI Airline Risk Visualization */}
      <Suspense fallback={<div className="h-[300px] bg-gray-50 rounded-xl animate-pulse"></div>}>
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <AirlineAIVisualization filters={filters.airlines ? [{ field: 'airlines', value: filters.airlines }] : []} />
        </section>
      </Suspense>

      {/* Split View: Area Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Area Breakdown</h2>
          <AreaBreakdownChart data={areaData} />
        </section>
        <div /> {/* Spacer for layout symmetry */}
      </div>

      {/* Management Summary */}
      <ManagementSummary data={airlineData} />

      {/* Investigative Table */}
      <InvestigativeTable
        data={investigativeData}
        title="Investigative Table - Airline Reports"
        rowsPerPage={5}
        maxRows={40}
      />

      {/* Data Table */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800">Full Data Table</h2>
        </div>
        <div className="p-6">
          <DataTableWithPagination data={fullTableData} title="Airline Performance (Main Chart Source)" />
        </div>
      </section>
    </div>
  );
}
