'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  fetchPivotData,
  buildPivotMatrix,
  fetchDimensionBreakdown,
  fetchMonthlyTrend,
  fetchAllPivotReports,
  inferDimensions,
  PivotMatrix,
  TrendDataPoint,
  DimensionBreakdown,
  PivotReportRecord,
} from './data';
import { Report } from '@/types';
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
import { ArrowUp, ArrowDown, Minus, Download, Filter } from 'lucide-react';
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
  color?: 'green' | 'red' | 'yellow' | 'blue' | 'orange';
}

function KPICard({ title, value, subtitle, color = 'blue' }: KPICardProps) {
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
    </div>
  );
}

function HeatmapTable({ matrix }: { matrix: PivotMatrix }) {
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

function DimensionChart({ data, label, color }: { data: DimensionBreakdown[]; label: string; color: string }) {
  const chartData = {
    labels: data.slice(0, 12).map(d => d.label),
    datasets: [
      {
        label,
        data: data.slice(0, 12).map(d => d.count),
        backgroundColor: color,
        borderRadius: 4,
      },
    ],
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

  return <div className="h-[280px]"><Bar data={chartData} options={options} /></div>;
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
      y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 10 } } },
    },
  };

  return <div className="h-[250px]"><Line data={chartData} options={options} /></div>;
}

function DataTable({ data }: { data: PivotReportRecord[] }) {
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
    saveAs(blob, 'pivot-report.csv');
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
                className="px-3 py-1 text-sm border border-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
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

function ManagementSummary({ matrix, rowLabel, colLabel }: { matrix: PivotMatrix; rowLabel: string; colLabel: string }) {
  if (matrix.grandTotal === 0) return null;

  const topRow = matrix.rows[0];
  const topCol = matrix.cols[0];
  const topRowCount = matrix.rowTotals.get(topRow) || 0;
  const topColCount = matrix.colTotals.get(topCol) || 0;

  // Find peak cell
  let peakValue = 0;
  let peakRow = '';
  let peakCol = '';
  matrix.cells.forEach((value, key) => {
    if (value > peakValue) {
      peakValue = value;
      const [r, c] = key.split('|||');
      peakRow = r;
      peakCol = c;
    }
  });

  const insights = [
    `Highest ${rowLabel}: "${topRow}" with ${topRowCount} reports (${((topRowCount / matrix.grandTotal) * 100).toFixed(1)}%).`,
    `Highest ${colLabel}: "${topCol}" with ${topColCount} reports.`,
    `Peak cell: "${peakRow}" × "${peakCol}" = ${peakValue} reports.`,
    `Matrix spans ${matrix.rows.length} ${rowLabel}s × ${matrix.cols.length} ${colLabel}s (${matrix.grandTotal} total).`,
  ];

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
      <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
        <span className="text-xl">📊</span> Management Summary
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

export default function PivotReportDetail({ filters = {}, pivotTitle = '' }: { filters?: FilterParams; pivotTitle?: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [tableData, setTableData] = useState<PivotReportRecord[]>([]);
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

  const { rowField, colField } = useMemo(() => inferDimensions(pivotTitle), [pivotTitle]);

  const rowLabel = rowField.replace('_', ' ').replace(/^\w/, c => c.toUpperCase());
  const colLabel = colField === 'category' ? 'Case Category' : colField.replace('_', ' ').replace(/^\w/, c => c.toUpperCase());

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const [pivotReports, trend, table] = await Promise.all([
          fetchPivotData(filters),
          fetchMonthlyTrend(filters),
          fetchAllPivotReports(filters),
        ]);

        setReports(pivotReports);
        setTrendData(trend);
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

  const matrix = useMemo(() => buildPivotMatrix(reports, rowField, colField), [reports, rowField, colField]);
  const rowBreakdown = useMemo(() => fetchDimensionBreakdown(reports, rowField), [reports, rowField]);
  const colBreakdown = useMemo(() => fetchDimensionBreakdown(reports, colField), [reports, colField]);
  const fullTableData: QueryResult = useMemo(() => {
    const rowColumn = rowLabel;
    const valueColumns = matrix.cols;
    const columns = [rowColumn, ...valueColumns, 'Total'];

    const rows: Record<string, unknown>[] = matrix.rows.map((rowName) => {
      const record: Record<string, unknown> = { [rowColumn]: rowName };
      valueColumns.forEach((col) => {
        record[col] = matrix.cells.get(`${rowName}|||${col}`) || 0;
      });
      record.Total = matrix.rowTotals.get(rowName) || 0;
      return record;
    });

    const grandTotalRow: Record<string, unknown> = { [rowColumn]: 'Grand Total' };
    valueColumns.forEach((col) => {
      grandTotalRow[col] = matrix.colTotals.get(col) || 0;
    });
    grandTotalRow.Total = matrix.grandTotal;

    const allRows = [...rows, grandTotalRow];

    return {
      columns,
      rows: allRows,
      rowCount: allRows.length,
      executionTimeMs: 0,
    };
  }, [matrix, rowLabel]);

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

  // Find peak cell value
  let peakValue = 0;
  matrix.cells.forEach((value) => {
    if (value > peakValue) peakValue = value;
  });

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard title="Total Reports" value={matrix.grandTotal.toLocaleString('id-ID')} color="blue" />
        <KPICard
          title={`Unique ${rowLabel}s`}
          value={matrix.rows.length}
          color="green"
        />
        <KPICard
          title={`Unique ${colLabel}s`}
          value={matrix.cols.length}
          color="orange"
        />
        <KPICard
          title="Peak Cell Value"
          value={peakValue}
          color="yellow"
        />
      </div>

      {/* Enlarged Heatmap/Pivot Table */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">
          {pivotTitle || `${colLabel} by ${rowLabel}`}
        </h2>
        <HeatmapTable matrix={matrix} />
      </section>

      {/* Split View: Row & Column Dimension Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">{rowLabel} Breakdown</h2>
          <DimensionChart data={rowBreakdown} label={rowLabel} color="#3b82f6" />
        </section>
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">{colLabel} Breakdown</h2>
          <DimensionChart data={colBreakdown} label={colLabel} color="#8b5cf6" />
        </section>
      </div>

      {/* Monthly Trend */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Monthly Trend Analysis</h2>
        <MonthlyTrendChart data={trendData} />
      </section>

      {/* Management Summary */}
      <ManagementSummary matrix={matrix} rowLabel={rowLabel} colLabel={colLabel} />

      {/* Investigative Table */}
      <InvestigativeTable
        data={investigativeData}
        title={`Investigative Table - ${pivotTitle || `${colLabel} by ${rowLabel}`}`}
        rowsPerPage={5}
        maxRows={40}
      />

      {/* Data Table */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800">Full Data Table</h2>
        </div>
        <div className="p-6">
          <DataTableWithPagination data={fullTableData} title={pivotTitle || `${colLabel} by ${rowLabel}`} />
        </div>
      </section>
    </div>
  );
}
