'use client';

import { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import type { QueryResult } from '@/types/builder';
import { formatDisplayValue } from '@/lib/chart-utils';

interface DataTableWithPaginationProps {
  data: QueryResult;
  title: string;
  isLoading?: boolean;
}

export function DataTableWithPagination({ data, title, isLoading }: DataTableWithPaginationProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const pageSize = 50;

  // Deduplication & Column filtering
  const uniqueColumns = useMemo(() => {
    // Remove 'id' if 'count' exists, and remove exact duplicates
    const unique = Array.from(new Set(data.columns));
    return unique.filter(c => c !== 'id' && (c !== 'count' || !unique.includes('Count')));
  }, [data.columns]);

  const rows = data.rows as Record<string, unknown>[];

  // Filter and sort
  const filteredRows = useMemo(() => {
    let filtered = rows;
    
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(row =>
        uniqueColumns.some(col => 
          String(row[col]).toLowerCase().includes(term)
        )
      );
    }
    
    // Sort
    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        
        // Always keep grand total at bottom
        const aIsTotal = Object.values(a).some(v => String(v).toLowerCase().includes('total'));
        const bIsTotal = Object.values(b).some(v => String(v).toLowerCase().includes('total'));
        if (aIsTotal) return 1;
        if (bIsTotal) return -1;
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        
        if (sortDirection === 'asc') {
          return aStr.localeCompare(bStr);
        } else {
          return bStr.localeCompare(aStr);
        }
      });
    }
    
    return filtered;
  }, [rows, uniqueColumns, searchTerm, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredRows.length / pageSize);
  const paginatedRows = filteredRows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSort = (col: string) => {
    if (sortColumn === col) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(col);
      setSortDirection('desc');
    }
  };

  const exportCSV = () => {
    const headers = uniqueColumns.join(',');
    const csvRows = filteredRows.map(row => 
      uniqueColumns.map(col => {
        const val = row[col];
        const str = String(val).replace(/"/g, '""');
        return str.includes(',') ? `"${str}"` : str;
      }).join(',')
    );
    
    const csv = [headers, ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatValue = (val: unknown, colName: string): string => {
    return formatDisplayValue(val, colName);
  };

  return (
    <div className="flex flex-col h-full bg-white font-sans text-sm rounded-3xl border border-gray-100 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.08)] overflow-hidden">
      {/* Header - Ultra Compact */}
      <div className="px-4 py-2 flex items-center justify-between gap-4 border-b border-gray-50 bg-white/50 backdrop-blur-sm sticky top-0 z-40">
        <h3 className="text-[11px] font-bold text-gray-800 uppercase tracking-widest pl-2">
          {title}
        </h3>
        
        <div className="flex items-center gap-2">
          {/* Search - Compact */}
          <div className="relative group">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 pr-3 py-1 text-[10px] bg-gray-50/50 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500 w-32 transition-all"
            />
          </div>
          
          {/* Export Buttons - Compact */}
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors border border-transparent hover:border-indigo-100"
            title="Export CSV"
          >
            <FileText size={12} />
            <span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-4 pt-0">
        <table className="w-full border-separate border-spacing-0">
          <thead className="sticky top-0 bg-white z-20 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
            <tr>
              <th className="px-4 py-3 border-b border-gray-100 text-[9px] font-bold text-gray-400 uppercase tracking-wider w-10 text-center bg-white first:rounded-tl-lg">#</th>
              {uniqueColumns.map(col => (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  className="px-4 py-3 border-b border-gray-100 text-[9px] font-bold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-indigo-600 transition-colors select-none bg-white"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  <div className="flex items-center gap-1 group">
                    {col.replace(/_/g, ' ')}
                    {sortColumn === col ? (
                      <span className="text-[8px] text-indigo-500">
                        {sortDirection === 'asc' ? '▲' : '▼'}
                      </span>
                    ) : (
                      <span className="text-[8px] text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">▼</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr>
                <td colSpan={uniqueColumns.length + 1} className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-gray-500 font-medium">Aggregating report data...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={uniqueColumns.length + 1} className="px-6 py-8 text-center text-gray-400 text-xs italic">
                  No data found
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, idx) => {
                const isGrandTotal = Object.values(row).some(v => String(v).toLowerCase().includes('grand total') || String(v).toLowerCase() === 'total');
                
                // Only group if not searching, sorted by first column or default, and matches previous row
                const firstCol = uniqueColumns[0];
                const prevRow = idx > 0 ? paginatedRows[idx - 1] : null;
                const isRepeated = !searchTerm && !isGrandTotal && (!sortColumn || sortColumn === firstCol) && prevRow && String(row[firstCol]) === String(prevRow[firstCol]);

                return (
                  <tr
                    key={idx}
                    className={`
                      transition-colors
                      ${isGrandTotal ? 'bg-indigo-50/50 font-bold text-indigo-900 sticky bottom-0 z-10 border-t-2 border-indigo-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]' : 'hover:bg-gray-50/80'}
                    `}
                  >
                    <td className={`px-6 py-3 text-[10px] text-center ${isRepeated && !isGrandTotal ? 'text-transparent' : 'text-gray-400'}`}>
                      {isGrandTotal ? 'Σ' : (currentPage - 1) * pageSize + idx + 1}
                    </td>
                    {uniqueColumns.map((col, cIdx) => {
                      const val = row[col];
                      const isNumber = typeof val === 'number';
                      const showValue = cIdx === 0 && isRepeated && !isGrandTotal ? false : true;

                      return (
                        <td
                          key={col}
                          className={`
                            px-6 py-3 text-xs 
                            ${cIdx === 0 && !isGrandTotal ? 'font-semibold text-gray-900 whitespace-nowrap' : 'text-gray-600'}
                            ${isNumber ? 'font-mono tracking-tight' : ''}
                            ${cIdx === 0 ? 'border-r border-transparent group-hover:border-gray-100' : ''}
                          `}
                        >
                           {showValue ? formatValue(val, col) : ''}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination - Compact */}
      <div className="px-6 py-3 border-t border-gray-50 bg-white flex items-center justify-between">
        <span className="text-[10px] text-gray-400 font-medium">
          Showing <span className="text-gray-700">{(currentPage - 1) * pageSize + 1}</span> - <span className="text-gray-700">{Math.min(currentPage * pageSize, filteredRows.length)}</span> of <span className="text-gray-700">{filteredRows.length}</span>
        </span>
        
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-gray-500"
          >
            <ChevronLeft size={14} />
          </button>
          
          <span className="text-[10px] text-gray-500 px-2 font-medium">
            {currentPage} / {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-gray-500"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
