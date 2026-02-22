'use client';

import { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, FileText, LayoutList } from 'lucide-react';
import type { QueryResult } from '@/types/builder';
import { formatDisplayValue } from '@/lib/chart-utils';
import { motion, AnimatePresence } from 'framer-motion';

interface DataTableWithPaginationProps {
  data: QueryResult;
  title: string;
  isLoading?: boolean;
  rowsPerPage?: number;
}

export function DataTableWithPagination({ data, title, isLoading, rowsPerPage = 50 }: DataTableWithPaginationProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const pageSize = rowsPerPage;

  // Deduplication & Column filtering
  const uniqueColumns = useMemo(() => {
    const unique = Array.from(new Set(data.columns));
    return unique.filter(c => c !== 'id' && (c !== 'count' || !unique.includes('Count')));
  }, [data.columns]);

  const rows = data.rows as Record<string, unknown>[];

  // Filter and sort
  const filteredRows = useMemo(() => {
    let filtered = rows;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(row =>
        uniqueColumns.some(col => 
          String(row[col]).toLowerCase().includes(term)
        )
      );
    }
    
    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        
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
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.19, 1, 0.22, 1] }}
      className="flex flex-col h-full bg-[var(--surface-glass)] backdrop-blur-md rounded-2xl border border-[var(--surface-border)] shadow-xl overflow-hidden relative group/fulltable"
    >
      {/* Glow Ornament */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-0 group-hover/fulltable:opacity-100 transition-opacity duration-1000">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--brand-primary)]/5 blur-[100px] rounded-full" />
      </div>

      {/* Header */}
      <div className="relative z-10 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--surface-border)] bg-[var(--surface-0)]/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--brand-primary)]/10 flex items-center justify-center border border-[var(--brand-primary)]/20 shadow-inner">
            <LayoutList size={16} className="text-[var(--brand-primary)]" />
          </div>
          <div>
            <h3 className="text-xs font-black text-[var(--surface-900)] uppercase tracking-[0.2em]">
              {title}
            </h3>
            <div className="text-[9px] font-bold text-[var(--surface-400)] uppercase tracking-wider flex items-center gap-1 mt-0.5">
              <span>Syncing Archive</span>
              <span className="w-1 h-1 rounded-full bg-[var(--brand-emerald-500)] animate-pulse" />
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group/search">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--surface-400)] group-focus-within/search:text-[var(--brand-primary)] transition-colors" />
            <input
              type="text"
              placeholder="QUERYS_SEARCH..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 text-[10px] font-black uppercase tracking-widest bg-[var(--surface-50)] border border-[var(--surface-border)] rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] w-full sm:w-48 transition-all shadow-inner"
            />
          </div>
          
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 text-[10px] font-black text-white bg-[var(--surface-900)] rounded-full hover:brightness-125 transition-all shadow-lg active:scale-95 uppercase tracking-wider"
          >
            <FileText size={12} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto custom-scrollbar relative z-10">
        <table className="w-full border-separate border-spacing-0">
          <thead className="sticky top-0 z-20">
            <tr className="bg-[var(--surface-0)]/90 backdrop-blur-md">
              <th className="px-6 py-4 border-b border-[var(--surface-border)] text-[9px] font-black text-[var(--surface-400)] uppercase tracking-widest text-center">#</th>
              {uniqueColumns.map(col => (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  className="px-6 py-4 border-b border-[var(--surface-border)] text-[9px] font-black text-[var(--surface-400)] uppercase tracking-widest cursor-pointer hover:text-[var(--brand-primary)] transition-colors select-none group/th"
                >
                  <div className="flex items-center gap-2">
                    <span>{col.replace(/_/g, ' ')}</span>
                    {sortColumn === col ? (
                      <span className="text-[var(--brand-primary)]">
                        {sortDirection === 'asc' ? '▲' : '▼'}
                      </span>
                    ) : (
                      <span className="opacity-0 group-hover/th:opacity-100 text-[var(--surface-300)] transition-opacity">▼</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--surface-100)]">
            {isLoading ? (
              <tr>
                <td colSpan={uniqueColumns.length + 1} className="px-6 py-24 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-[var(--brand-primary)]/20 blur-2xl rounded-full animate-pulse" />
                      <div className="relative w-12 h-12 border-2 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin" />
                    </div>
                    <span className="text-xs font-black text-[var(--surface-900)] tracking-widest uppercase italic">Streaming Records...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={uniqueColumns.length + 1} className="px-6 py-16 text-center text-[var(--surface-400)] text-xs font-medium italic">
                  Null result set.
                </td>
              </tr>
            ) : (
              <AnimatePresence mode="popLayout">
                {paginatedRows.map((row, idx) => {
                  const isGrandTotal = Object.values(row).some(v => String(v).toLowerCase().includes('grand total') || String(v).toLowerCase() === 'total');
                  const firstCol = uniqueColumns[0];
                  const prevRow = idx > 0 ? paginatedRows[idx - 1] : null;
                  const isRepeated = !searchTerm && !isGrandTotal && (!sortColumn || sortColumn === firstCol) && prevRow && String(row[firstCol]) === String(prevRow[firstCol]);

                  return (
                    <motion.tr
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.01 }}
                      className={`
                        group/tr transition-colors duration-200
                        ${isGrandTotal ? 'bg-[var(--brand-primary)]/5 font-black text-[var(--surface-900)] sticky bottom-0 z-10 border-t-2 border-[var(--brand-primary)]/10 shadow-xl backdrop-blur-xl' : 'hover:bg-[var(--brand-primary)]/[0.02]'}
                      `}
                    >
                      <td className={`px-6 py-4 text-[10px] font-bold text-center ${isRepeated && !isGrandTotal ? 'text-transparent' : 'text-[var(--surface-400)]'}`}>
                        {isGrandTotal ? '∑' : (currentPage - 1) * pageSize + idx + 1}
                      </td>
                      {uniqueColumns.map((col, cIdx) => {
                        const val = row[col];
                        const isNumber = typeof val === 'number';
                        const showValue = cIdx === 0 && isRepeated && !isGrandTotal ? false : true;

                        return (
                          <td
                            key={col}
                            className={`
                              px-6 py-4 text-[11px] 
                              ${cIdx === 0 && !isGrandTotal ? 'font-black text-[var(--surface-900)] whitespace-nowrap' : 'text-[var(--surface-600)] font-medium'}
                              ${isNumber ? 'tabular-nums' : ''}
                              ${cIdx === 0 ? 'relative' : ''}
                            `}
                          >
                            {(col.toLowerCase().includes('evidence') || col.toLowerCase().includes('link')) && typeof row[col] === 'string' && (row[col] as string).includes('<a href') ? (
                               <span dangerouslySetInnerHTML={{ __html: row[col] as string }} />
                            ) : (col.toLowerCase().includes('evidence') || col.toLowerCase().includes('link')) && typeof row[col] === 'string' && (row[col] as string).startsWith('http') ? (
                              <a 
                                href={row[col] as string} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] rounded-full text-[10px] font-black uppercase hover:bg-[var(--brand-primary)] hover:text-white transition-all duration-300"
                              >
                                Evidence
                              </a>
                            ) : (
                               showValue ? formatValue(val, col) : ''
                            )}
                          </td>
                        );
                      })}
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="relative z-10 px-6 py-4 border-t border-[var(--surface-border)] bg-[var(--surface-0)]/80 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-[10px] font-black text-[var(--surface-400)] uppercase tracking-widest">
           {filteredRows.length > 0
            ? `SYNCING ${((currentPage - 1) * pageSize + 1)} — ${Math.min(currentPage * pageSize, filteredRows.length)} / ${filteredRows.length} RECORDS`
            : 'NULL SET'}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="px-3 py-1.5 text-[10px] font-black border border-[var(--surface-border)] rounded-full disabled:opacity-20 hover:bg-[var(--surface-50)] transition-all uppercase tracking-tighter"
          >
            Start
          </button>
          
          <div className="flex items-center gap-1 bg-[var(--surface-50)] px-3 py-1.5 rounded-full border border-[var(--surface-border)] shadow-inner">
            <span className="text-[10px] font-black text-[var(--brand-primary)]">{currentPage}</span>
            <span className="text-[10px] font-black text-[var(--surface-300)]">/</span>
            <span className="text-[10px] font-black text-[var(--surface-400)]">{totalPages}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 border border-[var(--surface-border)] rounded-full disabled:opacity-20 hover:bg-[var(--surface-50)] transition-all"
            >
              <ChevronLeft size={14} />
            </button>
            <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 text-[10px] font-black border border-[var(--surface-border)] rounded-full disabled:opacity-20 hover:bg-[var(--surface-50)] transition-all uppercase tracking-tighter"
          >
            Next Phase
          </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 border border-[var(--surface-border)] rounded-full disabled:opacity-20 hover:bg-[var(--surface-50)] transition-all"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
