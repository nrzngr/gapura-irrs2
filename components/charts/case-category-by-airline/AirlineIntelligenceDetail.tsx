'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  fetchAirlineOverview,
  fetchCategoryCompositionByAirline,
  fetchBranchDistributionByAirline,
  fetchAreaBreakdownByAirline,
  fetchMonthlyTrendByAirline,
  fetchRootCauseByAirline,
  fetchAllAirlineIntelReports,
  AirlineOverview,
  CategoryCompositionData,
  BranchDistributionData,
  AreaBreakdownData,
  TrendDataPoint,
  RootCauseData,
  AirlineIntelReportRecord,
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
import { AiRootCauseInvestigation } from '../ai-root-cause/AiRootCauseInvestigation';
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
    </div>
  );
}

// ─── Auto-Insight Block ───
function AutoInsight({ data }: {
  data: AirlineOverview[];
}) {
  if (data.length === 0) return null;

  const topAirline = data[0];
  const highRiskAirlines = data.filter(a => a.riskIndex >= 50);
  const negSentimentAirlines = data.filter(a => a.netSentiment < 0);

  const insightParts: string[] = [];

  insightParts.push(
    `${topAirline.airline} contributes ${topAirline.contribution.toFixed(1)}% of total reports with Net Sentiment ${topAirline.netSentiment >= 0 ? '+' : ''}${topAirline.netSentiment.toFixed(1)}%, dominated by ${topAirline.dominantCategory}.`
  );

  if (highRiskAirlines.length > 0) {
    insightParts.push(
      `${highRiskAirlines.length} airline${highRiskAirlines.length > 1 ? 's' : ''} flagged as high risk (Risk Index >= 50): ${highRiskAirlines.slice(0, 3).map(a => a.airline).join(', ')}${highRiskAirlines.length > 3 ? ` +${highRiskAirlines.length - 3} more` : ''}.`
    );
  }

  if (negSentimentAirlines.length > 0) {
    insightParts.push(
      `${negSentimentAirlines.length} airline${negSentimentAirlines.length > 1 ? 's' : ''} show negative net sentiment, indicating complaint dominance.`
    );
  }

  const mainInsight = `Operational intelligence overview across ${data.length} airlines. ${topAirline.airline} currently represents the highest risk profile.`;

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

// ─── Category Composition: Vertical grouped bar ───
function CategoryCompositionChart({ data }: { data: CategoryCompositionData[] }) {
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
      y: { stacked: false, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 10 } } },
    },
  };

  return <div className="h-[400px]"><Bar data={chartData} options={options} /></div>;
}

// ─── Branch Distribution: Vertical bar ───
function BranchDistributionChart({ data }: { data: BranchDistributionData[] }) {
  const branchTotals = Array.from(
    data.reduce((acc, curr) => {
      const existing = acc.get(curr.branch) || 0;
      acc.set(curr.branch, existing + curr.count);
      return acc;
    }, new Map<string, number>())
  ).sort((a, b) => b[1] - a[1]).slice(0, 12);

  const chartData = {
    labels: branchTotals.map(([branch]) => branch.split(' ')),
    datasets: [{
      label: 'Reports',
      data: branchTotals.map(([, count]) => count),
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
      y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 10 } } },
    },
  };

  return <div className="h-[300px]"><Bar data={chartData} options={options} /></div>;
}

// ─── Area Breakdown: Vertical grouped bar ───
function AreaBreakdownChart({ data }: { data: AreaBreakdownData[] }) {
  // Group by airline, stack by area
  const airlineSet = new Set<string>();
  const areaSet = new Set<string>();
  data.forEach(d => { airlineSet.add(d.airline); areaSet.add(d.area); });

  const airlines = Array.from(airlineSet).slice(0, 10);
  const areas = Array.from(areaSet);

  const areaColors: Record<string, string> = {};
  const colorPalette = ['#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899', '#10b981', '#6366f1', '#f43f5e', '#84cc16'];
  areas.forEach((area, idx) => {
    areaColors[area] = colorPalette[idx % colorPalette.length];
  });

  const dataMap = new Map<string, Map<string, number>>();
  data.forEach(d => {
    if (!dataMap.has(d.airline)) dataMap.set(d.airline, new Map());
    dataMap.get(d.airline)!.set(d.area, d.count);
  });

  const chartData = {
    labels: airlines.map(a => a.split(' ')),
    datasets: areas.map(area => ({
      label: area,
      data: airlines.map(airline => dataMap.get(airline)?.get(area) || 0),
      backgroundColor: areaColors[area],
      borderRadius: 4,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const, labels: { usePointStyle: true, padding: 15, font: { size: 10 } } },
    },
    scales: {
      x: { stacked: false, grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 0, minRotation: 0, padding: 12 } },
      y: { stacked: false, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 10 } } },
    },
  };

  return <div className="h-[300px]"><Bar data={chartData} options={options} /></div>;
}

// ─── Monthly Trend: Line chart ───
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



// ─── Airline Ranking Table ───
function AirlineRankTable({ data }: { data: AirlineOverview[] }) {
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
            <th className="px-3 py-2 text-right font-semibold text-gray-600">Irreg. %</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-600">Complaint %</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-600">Net Sentiment</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-600">Dominant</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-600">MoM Growth</th>
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
                <td className="px-3 py-2 text-right text-red-600">{airline.irregularityRate.toFixed(1)}%</td>
                <td className="px-3 py-2 text-right text-orange-600">{airline.complaintRate.toFixed(1)}%</td>
                <td className="px-3 py-2 text-right">{airline.netSentiment > 0 ? '+' : ''}{airline.netSentiment.toFixed(1)}%</td>
                <td className="px-3 py-2 text-left">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${
                    airline.dominantCategory === 'Irregularity' ? 'bg-red-500' :
                    airline.dominantCategory === 'Complaint' ? 'bg-orange-500' : 'bg-green-500'
                  }`}>
                    {airline.dominantCategory}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <span className={airline.momGrowth > 0 ? 'text-red-600' : airline.momGrowth < 0 ? 'text-emerald-600' : 'text-gray-500'}>
                    {airline.momGrowth > 0 ? '+' : ''}{airline.momGrowth.toFixed(1)}%
                  </span>
                </td>
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

// ─── Management Summary ───
function ManagementSummary({ data }: { data: AirlineOverview[] }) {
  if (data.length === 0) return null;

  const topAirline = data[0];
  const highRiskCount = data.filter(a => a.riskIndex >= 50).length;
  const avgIrregRate = data.reduce((sum, a) => sum + a.irregularityRate, 0) / data.length;
  const totalReports = data.reduce((sum, a) => sum + a.total, 0);
  const improvingAirlines = data.filter(a => a.momGrowth < 0).length;
  const worseningAirlines = data.filter(a => a.momGrowth > 0).length;

  const insights = [
    `${topAirline.airline} leads with ${topAirline.total} reports (${topAirline.contribution.toFixed(1)}% of total), dominated by ${topAirline.dominantCategory}.`,
    `${highRiskCount} airline${highRiskCount !== 1 ? 's' : ''} identified as high risk (Risk Index >= 50).`,
    `Average irregularity rate across airlines: ${avgIrregRate.toFixed(1)}%.`,
    `Total volume: ${totalReports.toLocaleString('id-ID')} reports across ${data.length} airlines.`,
    `Performance trend: ${improvingAirlines} improving, ${worseningAirlines} worsening (month-over-month).`,
  ];

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
function DataTable({ data }: { data: AirlineIntelReportRecord[] }) {
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
    saveAs(blob, 'airline-intelligence-report.csv');
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
export default function AirlineIntelligenceDetail({ filters = {} }: { filters?: FilterParams }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [airlineData, setAirlineData] = useState<AirlineOverview[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryCompositionData[]>([]);
  const [branchData, setBranchData] = useState<BranchDistributionData[]>([]);
  const [areaData, setAreaData] = useState<AreaBreakdownData[]>([]);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [rootCauseData, setRootCauseData] = useState<RootCauseData[]>([]);
  const [tableData, setTableData] = useState<AirlineIntelReportRecord[]>([]);
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
    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const [airline, category, branch, area, trend, rootCause, table] = await Promise.all([
          fetchAirlineOverview(filters),
          fetchCategoryCompositionByAirline(filters),
          fetchBranchDistributionByAirline(filters),
          fetchAreaBreakdownByAirline(filters),
          fetchMonthlyTrendByAirline(filters),
          fetchRootCauseByAirline(filters),
          fetchAllAirlineIntelReports(filters),
        ]);

        setAirlineData(airline);
        setCategoryData(category);
        setBranchData(branch);
        setAreaData(area);
        setTrendData(trend);
        setRootCauseData(rootCause);
        setTableData(table);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
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
          <div className="text-red-500 mb-2">{error}</div>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-[#6b8e3d] text-white rounded-lg text-sm font-medium">Retry</button>
        </div>
      </div>
    );
  }

  const totalReports = airlineData.reduce((sum: number, a: any) => sum + a.total, 0);
  const totalIrreg = airlineData.reduce((sum: number, a: any) => sum + a.irregularity, 0);
  const totalComplaint = airlineData.reduce((sum: number, a: any) => sum + a.complaint, 0);
  const totalCompliment = airlineData.reduce((sum: number, a: any) => sum + a.compliment, 0);

  const topAirline = airlineData[0];
  
  const overallIrregRate = totalReports > 0 ? (totalIrreg / totalReports) * 100 : 0;
  const overallComplaintRate = totalReports > 0 ? (totalComplaint / totalReports) * 100 : 0;
  const overallNetSentiment = (totalCompliment + totalComplaint) > 0 
    ? ((totalCompliment - totalComplaint) / (totalCompliment + totalComplaint)) * 100 
    : 0;

  const avgRiskIndex = airlineData.length > 0 ? airlineData.reduce((sum: number, b: any) => sum + b.riskIndex, 0) / airlineData.length : 0;


  return (
    <div className="space-y-8">
      {/* 1. Auto-Insight Block */}
      <AutoInsight data={airlineData} />

      {/* 2. Airline Summary KPI Cards - Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Total Reports"
          value={totalReports.toLocaleString('id-ID')}
          subtitle={`Across ${airlineData.length} airlines`}
          color="blue"
          explanation="Total laporan untuk maskapai dalam dataset ini."
        />
        <KPICard
          title="% System Contribution"
          value={topAirline ? `${topAirline.contribution.toFixed(1)}%` : '-'}
          subtitle={topAirline ? `Top: ${topAirline.airline}` : '-'}
          color="blue"
          explanation="Kontribusi sistem berdasarkan airline teratas di periode ini."
        />
        <KPICard
          title="Rank #1"
          value={topAirline?.airline || '-'}
          subtitle={topAirline ? `${topAirline.total} reports` : '-'}
          color="yellow"
          explanation="Maskapai dengan jumlah laporan tertinggi pada periode ini."
        />
        <KPICard
          title="Dominant Category"
          value={topAirline?.dominantCategory || '-'}
          subtitle={topAirline ? `For ${topAirline.airline}` : '-'}
          color={topAirline?.dominantCategory === 'Irregularity' ? 'red' : topAirline?.dominantCategory === 'Complaint' ? 'orange' : 'green'}
          explanation="Kategori temuan utama pada maskapai ini." 
        />
      </div>

      {/* KPI Cards - Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Overall Irreg. %"
          value={`${overallIrregRate.toFixed(1)}%`}
          color="red"
          explanation="Persentase irregularitas terhadap total laporan untuk semua maskapai."
        />
        <KPICard
          title="Overall Complaint %"
          value={`${overallComplaintRate.toFixed(1)}%`}
          color="orange"
          explanation="Persentase keluhan terhadap total laporan secara keseluruhan."
        />
        <KPICard
          title="Overall Net Sentiment"
          value={`${overallNetSentiment >= 0 ? '+' : ''}${overallNetSentiment.toFixed(1)}%`}
          subtitle="(Compliment - Complaint)"
          color={overallNetSentiment > 0 ? 'green' : 'red'}
          explanation="Nilai gabungan sentimen positif vs negatif secara keseluruhan."
        />
        <KPICard
          title="Avg Risk Score"
          value={avgRiskIndex.toFixed(1)}
          subtitle="(Irreg x 2) + Complaint"
          color={avgRiskIndex >= 50 ? 'red' : avgRiskIndex >= 20 ? 'orange' : 'green'}
          explanation="Indeks risiko rata-rata gabungan berdasarkan faktor ketidaknormalan dan keluhan."
        />
      </div>

      {/* Airline Ranking Table */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Airline Intelligence Ranking</h2>
        <AirlineRankTable data={airlineData} />
      </section>

      {/* 3. Category Composition */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-1">Category Composition by Airline</h2>
        <p className="text-xs text-gray-500 mb-4">Stacked Irregularity / Complaint / Compliment per airline (top 10)</p>
        <CategoryCompositionChart data={categoryData} />
      </section>

      {/* 4 & 5. Branch Distribution + Area Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-1">Branch Distribution (Airline)</h2>
          <p className="text-xs text-gray-500 mb-4">Shows local issue vs national issue -- are reports concentrated in one branch?</p>
          <BranchDistributionChart data={branchData} />
        </section>
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-1">Area Breakdown (Airline)</h2>
          <p className="text-xs text-gray-500 mb-4">Stacked Terminal / Apron / General per airline</p>
          <AreaBreakdownChart data={areaData} />
        </section>
      </div>

      {/* 6. Monthly Trend */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-1">Monthly Trend (Stability Check)</h2>
        <p className="text-xs text-gray-500 mb-4">Airline volume over time -- is performance improving or declining?</p>
        <MonthlyTrendChart data={trendData} />
      </section>

      {/* 7. AI Root Cause Investigation */}
      <section className="bg-white/40 backdrop-blur-3xl rounded-[2.5rem] border border-white p-8 shadow-2xl shadow-indigo-500/10 transition-all hover:shadow-indigo-500/20">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">AI Root Cause Analysis</h2>
            <p className="text-slate-500 text-sm font-medium">Neural investigation into airline-specific operational friction.</p>
          </div>
        </div>
        <AiRootCauseInvestigation source={filters.sourceSheet === 'CGO' ? 'CGO' : 'NON CARGO'} />
      </section>

      {/* 9. Management Summary */}
      <ManagementSummary data={airlineData} />

      {/* Investigative Table */}
      <InvestigativeTable
        data={investigativeData}
        title="Investigative Table - Airline Intelligence"
        rowsPerPage={5}
        maxRows={40}
      />

      {/* 10. Full Data Table */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800">Full Data Table</h2>
        </div>
        <div className="p-6">
          <DataTableWithPagination data={fullTableData} title="Airline Intelligence (Main Chart Source)" />
        </div>
      </section>
    </div>
  );
}
