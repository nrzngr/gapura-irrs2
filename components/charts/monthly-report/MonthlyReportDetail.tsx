'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  fetchMonthlySummary,
  fetchDailyTrend,
  fetchBranchByMonth,
  fetchAirlineByMonth,
  fetchAllMonthlyReports,
  fetchRollingAverage,
  fetchPeakDay,
  fetchDominantBranch,
  fetchDominantAirline,
  fetchMonthlyKPIs,
  fetchMonthlyTrendByCategory,
  MonthlySummary,
  DailyDataPoint,
  BranchByMonthData,
  AirlineByMonthData,
  MonthlyReportRecord,
  RollingAveragePoint,
  PeakDayInfo,
  DominantInfo,
  MonthlyKPIs,
  MonthlyTrendData,
} from './data';
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
import { BarChart, Bar as RechartsBar, LineChart, Line as RechartsLine, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend as RechartsLegend, ResponsiveContainer } from 'recharts';
import { ArrowUp, ArrowDown, Minus, Download, Filter, Zap } from 'lucide-react';
import { saveAs } from 'file-saver';
import { InvestigativeTable } from '@/components/chart-detail/InvestigativeTable';
import { DataTableWithPagination } from '@/components/chart-detail/DataTableWithPagination';
import { AiRootCauseInvestigation } from '../ai-root-cause/AiRootCauseInvestigation';
import { AiBranchSummary } from '@/components/ai/AiBranchSummary';
import { AiReportSummary } from '@/components/ai/AiReportSummary';
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
  month?: string;
  sourceSheet?: string;
}

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  trendLabel?: string;
  color?: 'green' | 'red' | 'yellow' | 'blue' | 'orange';
  explanation?: string;
}

function KPICard({ title, value, subtitle, trend, trendLabel, color = 'blue', explanation }: KPICardProps) {
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
          <span>{Math.abs(trend).toFixed(1)}% {trendLabel || 'vs Prev'}</span>
        </div>
      )}
      {explanation && (
        <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-current/10 leading-relaxed">{explanation}</div>
      )}
    </div>
  );
}

// ─── Auto-Insight Block ───
function AutoInsight({ monthly, peakDay, dominantBranch, dominantAirline }: {
  monthly: MonthlySummary[];
  peakDay: PeakDayInfo;
  dominantBranch: DominantInfo;
  dominantAirline: DominantInfo;
}) {
  if (monthly.length < 2) return null;

  const current = monthly[monthly.length - 1];
  const prev = monthly[monthly.length - 2];
  const growth = prev.total > 0 ? ((current.total - prev.total) / prev.total) * 100 : 0;

  const direction = growth >= 0 ? 'up' : 'down';
  const drivers: string[] = [];

  if (dominantBranch.name !== '-') {
    drivers.push(`${dominantBranch.name} (${dominantBranch.percent.toFixed(0)}%)`);
  }
  if (dominantAirline.name !== '-') {
    drivers.push(`${dominantAirline.name}`);
  }

  const mainInsight = `Reports ${direction} ${Math.abs(growth).toFixed(1)}% MoM${drivers.length > 0 ? `, driven by ${drivers.join(' & ')}` : ''}.`;

  const insightParts = [
    mainInsight,
    peakDay.date !== '-' ? `Peak day: ${peakDay.date} (${peakDay.dayOfWeek}) with ${peakDay.count} reports.` : null,
    `Irregularity accounts for ${current.irregularityRate.toFixed(1)}% of all reports this period.`,
    current.total > prev.total ? `Volume increased from ${prev.total} to ${current.total}.` : `Volume decreased from ${prev.total} to ${current.total}.`,
  ].filter(Boolean);

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Zap size={18} className="text-amber-600" />
        <h3 className="font-bold text-gray-800">Auto-Insight</h3>
      </div>
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

function MonthlyTrendTable({ data }: { data: MonthlySummary[] }) {
  // Show all months from earliest to latest, sorted newest first
  const displayData = [...data].reverse();
  
  return (
    <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 sticky top-0 z-10">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-gray-600 sticky top-0 bg-gray-50">Month</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-600 sticky top-0 bg-gray-50">Total</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-600 sticky top-0 bg-gray-50">Irreg.</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-600 sticky top-0 bg-gray-50">Complaint</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-600 sticky top-0 bg-gray-50">Compliment</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-600 sticky top-0 bg-gray-50">Irreg. Rate</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-600 sticky top-0 bg-gray-50">Net Sentiment</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-600 sticky top-0 bg-gray-50">MoM</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-600 sticky top-0 bg-gray-50">YoY</th>
          </tr>
        </thead>
        <tbody>
          {displayData.map((month, idx) => {
            const isCurrent = idx === 0;
            return (
              <tr key={month.month} className={`border-t border-gray-100 hover:bg-gray-50 ${isCurrent ? 'bg-blue-50' : ''}`}>
                <td className="px-3 py-2 font-semibold text-gray-900">{month.month}</td>
                <td className="px-3 py-2 text-right font-medium">{month.total.toLocaleString('id-ID')}</td>
                <td className="px-3 py-2 text-right text-red-600">{month.irregularity}</td>
                <td className="px-3 py-2 text-right text-orange-600">{month.complaint}</td>
                <td className="px-3 py-2 text-right text-green-600">{month.compliment}</td>
                <td className="px-3 py-2 text-right">{month.irregularityRate.toFixed(1)}%</td>
                <td className={`px-3 py-2 text-right ${month.netSentiment >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {month.netSentiment >= 0 ? '+' : ''}{month.netSentiment.toFixed(1)}%
                </td>
                <td className={`px-3 py-2 text-right font-medium ${month.momGrowth > 0 ? 'text-red-600' : month.momGrowth < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                  {month.momGrowth > 0 ? '+' : ''}{month.momGrowth.toFixed(1)}%
                </td>
                <td className={`px-3 py-2 text-right font-medium ${month.yoyGrowth !== undefined ? (month.yoyGrowth > 0 ? 'text-red-600' : month.yoyGrowth < 0 ? 'text-emerald-600' : 'text-gray-600') : 'text-gray-400'}`}>
                  {month.yoyGrowth !== undefined ? `${month.yoyGrowth > 0 ? '+' : ''}${month.yoyGrowth.toFixed(1)}%` : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DailyTrendChart({ data }: { data: DailyDataPoint[] }) {
  const chartData = {
    labels: data.map(d => d.date),
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
      x: { grid: { display: false }, ticks: { font: { size: 9 }, maxRotation: 45, minRotation: 30 } },
      y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 10 } } },
    },
  };

  return <div className="h-[250px]"><Line data={chartData} options={options} /></div>;
}

// ─── Rolling Average Comparison Chart ───
function RollingAverageChart({ data }: { data: RollingAveragePoint[] }) {
  const chartData = {
    labels: data.map(d => d.month),
    datasets: [
      {
        label: 'Actual',
        data: data.map(d => d.actual),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.3,
        borderWidth: 2,
      },
      {
        label: '3-Month Avg',
        data: data.map(d => parseFloat(d.rollingAvg3.toFixed(1))),
        borderColor: '#f97316',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 2,
      },
      {
        label: '6-Month Avg',
        data: data.map(d => parseFloat(d.rollingAvg6.toFixed(1))),
        borderColor: '#8b5cf6',
        backgroundColor: 'transparent',
        borderDash: [10, 5],
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 2,
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

function TopBranchesChart({ data }: { data: BranchByMonthData[] }) {
  const topBranches = Array.from(
    data.reduce((acc, curr) => {
      const existing = acc.get(curr.branch) || 0;
      acc.set(curr.branch, existing + curr.count);
      return acc;
    }, new Map<string, number>())
  ).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const chartData = {
    labels: topBranches.map(([branch]) => branch.split(' ')),
    datasets: [{
      label: 'Reports',
      data: topBranches.map(([, count]) => count),
      backgroundColor: '#8b5cf6',
      borderRadius: 4,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'x' as const,
    plugins: { legend: { display: false } },
    scales: {
      x: { stacked: false, grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 0, minRotation: 0, padding: 12 } },
      y: { 
        grid: { color: 'rgba(0,0,0,0.05)' }, 
        ticks: { font: { size: 10 } }, 
        suggestedMax: topBranches.length > 0 ? Math.max(...topBranches.map(d => d[1])) * 1.15 : undefined 
      },
    },
  };

  return <div className="h-[250px]"><Bar data={chartData} options={options} plugins={[barLabelsPlugin]} /></div>;
}

function TopAirlinesChart({ data }: { data: AirlineByMonthData[] }) {
  const topAirlines = Array.from(
    data.reduce((acc, curr) => {
      const existing = acc.get(curr.airline) || 0;
      acc.set(curr.airline, existing + curr.count);
      return acc;
    }, new Map<string, number>())
  ).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const chartData = {
    labels: topAirlines.map(([airline]) => airline.split(' ')),
    datasets: [{
      label: 'Reports',
      data: topAirlines.map(([, count]) => count),
      backgroundColor: ['#f97316', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'],
      borderRadius: 4,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'x' as const,
    plugins: { legend: { display: false } },
    scales: {
      x: { stacked: false, grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 0, minRotation: 0, padding: 12 } },
      y: { 
        grid: { color: 'rgba(0,0,0,0.05)' }, 
        ticks: { font: { size: 10 } }, 
        suggestedMax: topAirlines.length > 0 ? Math.max(...topAirlines.map(d => d[1])) * 1.15 : undefined 
      },
    },
  };

  return <div className="h-[250px]"><Bar data={chartData} options={options} plugins={[barLabelsPlugin]} /></div>;
}


function DataTable({ data }: { data: MonthlyReportRecord[] }) {
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
    saveAs(blob, 'monthly-report.csv');
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

function ManagementSummary({ data, dominantBranch, dominantAirline }: {
  data: MonthlySummary[];
  dominantBranch: DominantInfo;
  dominantAirline: DominantInfo;
}) {
  if (data.length < 2) return null;

  const currentMonth = data[data.length - 1];
  const prevMonth = data[data.length - 2];
  const growth = prevMonth.total > 0 ? ((currentMonth.total - prevMonth.total) / prevMonth.total) * 100 : 0;

  const insights = [
    `Reports ${growth >= 0 ? 'increased' : 'decreased'} by ${Math.abs(growth).toFixed(1)}% compared to previous month.`,
    `Total of ${currentMonth.total} reports this month vs ${prevMonth.total} last month.`,
    `Irregularity accounts for ${currentMonth.irregularityRate.toFixed(1)}% of all reports.`,
    dominantBranch.name !== '-' ? `Dominant branch: ${dominantBranch.name} with ${dominantBranch.count} reports (${dominantBranch.percent.toFixed(1)}%).` : null,
    dominantAirline.name !== '-' ? `Top airline: ${dominantAirline.name} with ${dominantAirline.count} reports (${dominantAirline.percent.toFixed(1)}%).` : null,
  ].filter(Boolean);

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
      <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
        📅 Management Summary
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

export default function MonthlyReportDetail({ filters = {} }: { filters?: FilterParams }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlySummary[]>([]);
  const [dailyData, setDailyData] = useState<DailyDataPoint[]>([]);
  const [branchData, setBranchData] = useState<BranchByMonthData[]>([]);
  const [airlineData, setAirlineData] = useState<AirlineByMonthData[]>([]);
  const [tableData, setTableData] = useState<MonthlyReportRecord[]>([]);
  const [rollingData, setRollingData] = useState<RollingAveragePoint[]>([]);
  const [peakDay, setPeakDay] = useState<PeakDayInfo>({ date: '-', count: 0, dayOfWeek: '-' });
  const [dominantBranch, setDominantBranch] = useState<DominantInfo>({ name: '-', count: 0, percent: 0 });
  const [dominantAirline, setDominantAirline] = useState<DominantInfo>({ name: '-', count: 0, percent: 0 });
  const [kpis, setKpis] = useState<MonthlyKPIs | null>(null);
  const [trendData, setTrendData] = useState<MonthlyTrendData[]>([]);
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
    const rows = monthlyData.map(item => ({ ...item })) as unknown as Record<string, unknown>[];
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

    return {
      columns,
      rows,
      rowCount: rows.length,
      executionTimeMs: 0,
    };
  }, [monthlyData]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const [monthly, daily, branch, airline, table, rolling, peak, domBranch, domAirline, kpiData, trend] = await Promise.all([
          fetchMonthlySummary(filters),
          fetchDailyTrend(filters),
          fetchBranchByMonth(filters),
          fetchAirlineByMonth(filters),
          fetchAllMonthlyReports(filters),
          fetchRollingAverage(filters),
          fetchPeakDay(filters),
          fetchDominantBranch(filters),
          fetchDominantAirline(filters),
          fetchMonthlyKPIs(filters),
          fetchMonthlyTrendByCategory(filters),
        ]);

        setMonthlyData(monthly);
        setDailyData(daily);
        setBranchData(branch);
        setAirlineData(airline);
        setTableData(table);
        setRollingData(rolling);
        setPeakDay(peak);
        setDominantBranch(domBranch);
        setDominantAirline(domAirline);
        setKpis(kpiData);
        setTrendData(trend);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [filters.hub, filters.branch, filters.airlines, filters.area, filters.month]);

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

  const currentMonth = monthlyData[monthlyData.length - 1];
  const prevMonth = monthlyData[monthlyData.length - 2];
  // Overall growth calculation (weighted)
  const totalCurrentReports = monthlyData.reduce((s: number, m: any) => s + m.total, 0);
  const totalPrevReports = monthlyData.reduce((s: number, m: any) => s + m.prevMonthTotal, 0);
  const totalPrevYearReportsSelection = monthlyData.reduce((s: number, m: any) => s + (m.prevYearTotal || 0), 0);

  const overallMomGrowth = totalPrevReports > 0 ? ((totalCurrentReports - totalPrevReports) / totalPrevReports) * 100 : 0;
  const overallYoyGrowth = totalPrevYearReportsSelection > 0 ? ((totalCurrentReports - totalPrevYearReportsSelection) / totalPrevYearReportsSelection) * 100 : undefined;

  // Overall metrics calculation
  const totalReportsSum = monthlyData.reduce((sum: number, m: any) => sum + m.total, 0);
  const totalIrregSum = monthlyData.reduce((sum: number, m: any) => sum + m.irregularity, 0);
  const totalComplaintSum = monthlyData.reduce((sum: number, m: any) => sum + (m.complaint || 0), 0);
  const totalComplimentSum = monthlyData.reduce((sum: number, m: any) => sum + (m.compliment || 0), 0);

  const overallIrregRate = totalReportsSum > 0 ? (totalIrregSum / totalReportsSum) * 100 : 0;
  const overallNetSentiment = (totalComplimentSum + totalComplaintSum) > 0
    ? ((totalComplimentSum - totalComplaintSum) / (totalComplimentSum + totalComplaintSum)) * 100
    : 0;

  return (
    <div className="space-y-8">
      {/* AI Intelligence Layer */}
      <AiReportSummary source={filters.sourceSheet as any} />
      <AiBranchSummary source={filters.sourceSheet as any} />

      {/* Auto-Insight Block */}
      <AutoInsight
        monthly={monthlyData}
        peakDay={peakDay}
        dominantBranch={dominantBranch}
        dominantAirline={dominantAirline}
      />

      {/* New KPI Cards - Monthly Overview */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            title="Current Month"
            value={kpis.currentMonthTotal}
            color="blue"
            explanation="Total laporan bulan ini (bulan terakhir dalam dataset)."
          />
          <KPICard
            title="Previous Month"
            value={kpis.previousMonthTotal}
            color="blue"
            explanation="Total laporan bulan sebelumnya untuk perbandingan."
          />
          <KPICard
            title="MoM Change"
            value={`${kpis.momChange > 0 ? '+' : ''}${kpis.momChange}%`}
            color={kpis.momChange > 0 ? 'red' : 'green'}
            explanation="Perubahan persentase dari bulan lalu ke bulan ini."
          />
          <KPICard
            title="Highest Peak"
            value={kpis.highestPeakMonth.month}
            subtitle={`${kpis.highestPeakMonth.count} reports`}
            color="yellow"
            explanation="Bulan dengan jumlah laporan tertinggi dalam periode ini."
          />
        </div>
      )}

      {/* Category Trends Over Time */}
      {trendData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold mb-4">Category Trends Over Time</h3>
          <p className="text-xs text-gray-500 mb-4">Tren kategori laporan per bulan untuk melihat pola perubahan kategori Irregularity, Complaint, dan Compliment</p>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <RechartsTooltip />
              <RechartsLegend />
              <RechartsLine type="monotone" dataKey="irregularity" stroke="#4ade80" strokeWidth={2} name="Irregularity" />
              <RechartsLine type="monotone" dataKey="complaint" stroke="#0ea5e9" strokeWidth={2} name="Complaint" />
              <RechartsLine type="monotone" dataKey="compliment" stroke="#facc15" strokeWidth={2} name="Compliment" />
              <RechartsLine type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={3} strokeDasharray="5 5" name="Total" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* KPI Cards — Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Growth (MoM)"
          value={`${overallMomGrowth >= 0 ? '+' : ''}${overallMomGrowth.toFixed(1)}%`}
          subtitle={`Total: ${totalCurrentReports} vs Prev: ${totalPrevReports}`}
          trend={overallMomGrowth}
          trendLabel="MoM"
          color={overallMomGrowth > 0 ? 'red' : 'green'}
          explanation="Pertumbuhan volume laporan periode ini vs periode sebelumnya (shifted 1 bulan)."
        />
        {overallYoyGrowth !== undefined && (
          <KPICard
            title="Growth (YoY)"
            value={`${overallYoyGrowth >= 0 ? '+' : ''}${overallYoyGrowth.toFixed(1)}%`}
            subtitle={`Total: ${totalCurrentReports} vs Prev Year: ${totalPrevYearReportsSelection}`}
            trend={overallYoyGrowth}
            trendLabel="YoY"
            color={overallYoyGrowth > 0 ? 'red' : 'green'}
            explanation="Pertumbuhan vs periode yang sama tahun lalu."
          />
        )}
        <KPICard
          title="Dominant Branch"
          value={dominantBranch.name}
          subtitle={`${dominantBranch.count} reports (${dominantBranch.percent.toFixed(0)}%)`}
          color="blue"
          explanation="Cabang dengan laporan terbanyak dalam periode ini."
        />
        <KPICard
          title="Dominant Airline"
          value={dominantAirline.name}
          subtitle={`${dominantAirline.count} reports (${dominantAirline.percent.toFixed(0)}%)`}
          color="orange"
          explanation="Maskapai dengan laporan terbanyak dalam periode ini."
        />
      </div>

      {/* KPI Cards — Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Total Reports"
          value={totalReportsSum.toLocaleString('id-ID')}
          color="blue"
          explanation="Total laporan yang masuk dalam periode ini."
        />
        <KPICard
          title="Irregularity Rate"
          value={`${overallIrregRate.toFixed(1)}%`}
          color="red"
          explanation="Persentase laporan irregularity dari total keseluruhan periode ini."
        />
        <KPICard
          title="Net Sentiment"
          value={`${overallNetSentiment >= 0 ? '+' : ''}${overallNetSentiment.toFixed(1)}%`}
          color={overallNetSentiment > 0 ? 'green' : 'red'}
          explanation="Selisih Compliment vs Complaint untuk keseluruhan periode ini."
        />
      </div>

      {/* Monthly Trend Table */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Monthly Trend</h2>
            <p className="text-xs text-gray-500 mt-1">Tren laporan bulanan ({monthlyData.length} bulan) - Januari 2025 sampai terbaru</p>
          </div>
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg max-w-xs">
            <strong className="text-gray-700">Penjelasan:</strong> Tabel ini menunjukkan jumlah laporan per bulan dari awal data. Kolom MoM menunjukkan perubahan dari bulan sebelumnya. Warna merah = naik (lebih banyak laporan), hijau = turun (lebih sedikit laporan). Scroll untuk melihat semua bulan.
          </div>
        </div>
        <MonthlyTrendTable data={monthlyData} />
      </section>

      {/* Daily Timeline */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Daily Timeline</h2>
            <p className="text-xs text-gray-500 mt-1">Distribusi laporan harian untuk melihat pola dan lonjakan</p>
          </div>
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg max-w-xs">
            <strong className="text-gray-700">Penjelasan:</strong> Grafik ini menunjukkan jumlah laporan setiap hari. Puncak tinggi = hari dengan banyak insiden. Gunakan ini untuk mengidentifikasi tanggal kejadian.
          </div>
        </div>
        <DailyTrendChart data={dailyData} />
      </section>

      {/* Historical Context: Rolling Average Comparison */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Historical Context</h2>
            <p className="text-xs text-gray-500 mt-1">Perbandingan dengan rata-rata 3 dan 6 bulan terakhir</p>
          </div>
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg max-w-xs">
            <strong className="text-gray-700">Penjelasan:</strong> Grafik ini membandingkan laporan bulan ini dengan rata-rata 3 dan 6 bulan sebelumnya. Jika garis biru di atas garis lain = lonjakan tidak normal.
          </div>
        </div>
        <RollingAverageChart data={rollingData} />
      </section>
      
      {/* AI Root Cause Investigation - Full Width */}
      <section className="bg-white/40 backdrop-blur-3xl rounded-[2.5rem] border border-white p-8 shadow-2xl shadow-indigo-500/10 transition-all hover:shadow-indigo-500/20">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">AI Root Cause Analysis</h2>
            <p className="text-slate-500 text-sm font-medium">Neural investigation into operational friction points.</p>
          </div>
        </div>
        <AiRootCauseInvestigation source={filters.sourceSheet === 'CGO' ? 'CGO' : 'NON CARGO'} />
      </section>

      {/* Attribution: Top Branches & Airlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Top Contributing Branches</h2>
              <p className="text-xs text-gray-500 mt-1">Cabang dengan kontribusi laporan tertinggi</p>
            </div>
            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg max-w-xs">
              <strong className="text-gray-700">Penjelasan:</strong> Cabang mana yang paling banyak melaporkan masalah bulan ini. Prioritas perbaikan bisa difokuskan ke cabang ini.
            </div>
          </div>
          <TopBranchesChart data={branchData} />
        </section>
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Top Contributing Airlines</h2>
              <p className="text-xs text-gray-500 mt-1">Maskapai dengan kontribusi laporan tertinggi</p>
            </div>
            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg max-w-xs">
              <strong className="text-gray-700">Penjelasan:</strong> Maskapai mana yang paling banyak dilaporkan. Bisa jadi indikasi masalah operasional maskapai tertentu.
            </div>
          </div>
          <TopAirlinesChart data={airlineData} />
        </section>
      </div>

      {/* Management Summary */}
      <ManagementSummary data={monthlyData} dominantBranch={dominantBranch} dominantAirline={dominantAirline} />

      {/* Investigative Table */}
      <InvestigativeTable
        data={investigativeData}
        title="Investigative Table - Monthly Reports"
        rowsPerPage={5}
        maxRows={40}
      />

      {/* Data Table */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Full Data Table</h2>
            <p className="text-xs text-gray-500 mt-1">Tabel lengkap semua laporan bulan ini</p>
          </div>
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg max-w-xs">
            <strong className="text-gray-700">Penjelasan:</strong> Tabel ini berisi semua laporan. Gunakan fitur pencarian dan filter untuk menemukan laporan spesifik. Export ke CSV untuk analisis lebih lanjut.
          </div>
        </div>
        <div className="p-6">
          <DataTableWithPagination data={fullTableData} title="Monthly Trend Source Data" />
        </div>
      </section>
    </div>
  );
}
