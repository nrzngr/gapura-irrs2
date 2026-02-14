'use client';

import { useMemo, useState } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDisplayValue } from '@/lib/chart-utils';

interface DataTableProps {
  columns: string[];
  rows: Record<string, unknown>[];
  maxRows?: number;
}

function formatValue(val: unknown, colName: string): string {
  return formatDisplayValue(val, colName);
}

export function DataTable({ columns, rows, maxRows = 100 }: DataTableProps) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const sortedRows = useMemo(() => {
    if (!sortCol) return rows;
    return [...rows].sort((a, b) => {
      const aVal = a[sortCol];
      const bVal = b[sortCol];
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [rows, sortCol, sortDir]);

  const displayRows = sortedRows.slice(0, maxRows);

  if (columns.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-[var(--text-muted)]">
        Tidak ada data
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr>
              {columns.map(col => (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  className="text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] p-2 bg-[var(--surface-2)] border-b border-[var(--surface-4)] cursor-pointer hover:text-[var(--text-primary)] transition-colors whitespace-nowrap select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>{col}</span>
                    {sortCol === col ? (
                      sortDir === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />
                    ) : (
                      <ArrowUpDown size={10} className="opacity-30" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, idx) => (
              <tr
                key={idx}
                className="border-b border-[var(--surface-4)] hover:bg-[var(--surface-2)] transition-colors"
              >
                {columns.map(col => (
                  <td key={col} className="p-2 text-[var(--text-secondary)] whitespace-nowrap max-w-[200px] truncate">
                    {formatValue(row[col], col)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length > maxRows && (
        <div className="px-3 py-1.5 text-[10px] text-[var(--text-muted)] bg-[var(--surface-2)] border-t border-[var(--surface-4)]">
          Menampilkan {maxRows} dari {rows.length} baris
        </div>
      )}
    </div>
  );
}
