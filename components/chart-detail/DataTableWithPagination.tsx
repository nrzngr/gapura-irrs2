'use client';

import { useState, useMemo } from 'react';
import { Download, Search, ChevronLeft, ChevronRight, FileSpreadsheet, FileText, FileType } from 'lucide-react';
import type { QueryResult } from '@/types/builder';

interface DataTableWithPaginationProps {
  data: QueryResult;
  title: string;
}

export function DataTableWithPagination({ data, title }: DataTableWithPaginationProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const pageSize = 50;

  const { columns, rows: allRows } = data;
  const rows = allRows as Record<string, unknown>[];

  // Filter and sort
  const filteredRows = useMemo(() => {
    let filtered = rows;
    
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(row =>
        columns.some(col => 
          String(row[col]).toLowerCase().includes(term)
        )
      );
    }
    
    // Sort
    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        
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
  }, [rows, columns, searchTerm, sortColumn, sortDirection]);

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
    const headers = columns.join(',');
    const csvRows = filteredRows.map(row => 
      columns.map(col => {
        const val = row[col];
        // Escape quotes and wrap in quotes if contains comma
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

  const formatValue = (val: unknown): string => {
    if (val === null || val === undefined) return '-';
    if (typeof val === 'number') return val.toLocaleString('id-ID');
    return String(val);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-[#e0e0e0] bg-[#f9f9f9]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-sm font-semibold text-[#6b8e3d] uppercase tracking-wide">
            Data Tabel
          </h3>
          
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999]" />
              <input
                type="text"
                placeholder="Cari data..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-[#e0e0e0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6b8e3d]/30 w-64"
              />
            </div>
            
            {/* Export Buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={exportCSV}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#666] hover:text-[#6b8e3d] hover:bg-[#f5f5f5] rounded-lg transition-colors"
                title="Export CSV"
              >
                <FileText size={14} />
                CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-[#6b8e3d] text-white">
            <tr>
              <th className="px-3 py-3 text-left text-[10px] font-bold w-12">#</th>
              {columns.map(col => (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  className="px-3 py-3 text-left text-[10px] font-bold cursor-pointer hover:bg-[#5a7a3a] transition-colors select-none"
                >
                  <div className="flex items-center gap-1">
                    {col}
                    {sortColumn === col && (
                      <span className="text-[8px]">
                        {sortDirection === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((row, idx) => (
              <tr
                key={idx}
                className="border-b border-[#f0f0f0] hover:bg-[#f9f9f9] transition-colors"
                style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#fafafa' }}
              >
                <td className="px-3 py-2 text-[11px] text-[#999]">
                  {(currentPage - 1) * pageSize + idx + 1}
                </td>
                {columns.map(col => (
                  <td
                    key={col}
                    className="px-3 py-2 text-[11px] text-[#333] max-w-[200px] truncate"
                    title={String(row[col])}
                  >
                    {formatValue(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="p-4 border-t border-[#e0e0e0] bg-[#f9f9f9]">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#666]">
            Menampilkan {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredRows.length)} dari {filteredRows.length} baris
          </span>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg hover:bg-[#e0e0e0] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} className="text-[#666]" />
            </button>
            
            <span className="text-xs text-[#666] px-2">
              Halaman {currentPage} dari {totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg hover:bg-[#e0e0e0] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} className="text-[#666]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
