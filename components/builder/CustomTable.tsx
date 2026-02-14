'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { QueryResult } from '@/types/builder';
import { formatDisplayValue } from '@/lib/chart-utils';

interface CustomTableProps {
  result: QueryResult;
  title?: string;
}

const GAPURA_GREEN = '#6b8e3d';
const GAPURA_GREEN_DARK = '#5a7a3a';

function formatValue(val: unknown, colName: string): string {
  return formatDisplayValue(val, colName);
}

function isNumericColumn(rows: Record<string, unknown>[], col: string): boolean {
  let numericCount = 0;
  let totalCount = 0;
  
  for (const row of rows.slice(0, 10)) {
    const val = row[col];
    if (val !== null && val !== undefined) {
      totalCount++;
      if (typeof val === 'number' || (!isNaN(Number(val)) && String(val).trim() !== '')) {
        numericCount++;
      }
    }
  }
  
  return totalCount > 0 && numericCount / totalCount > 0.8;
}

export function CustomTable({ result, title }: CustomTableProps) {
  const columns = result.columns;
  const allRows = result.rows as Record<string, unknown>[];
  const totalRows = allRows.length;
  
  // Pagination
  const pageSize = 100;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(totalRows / pageSize);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalRows);
  const displayRows = allRows.slice(startIdx, endIdx);
  
  // Determine numeric columns for alignment
  const numericCols = new Set<string>();
  columns.forEach(col => {
    if (isNumericColumn(allRows, col)) {
      numericCols.add(col);
    }
  });

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-lg border border-[#e0e0e0] overflow-hidden">
      {/* Header */}
      {title && (
        <div 
          className="px-4 py-2 text-white text-xs font-bold"
          style={{ backgroundColor: GAPURA_GREEN }}
        >
          {title}
        </div>
      )}
      
      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ backgroundColor: GAPURA_GREEN }}>
              <th 
                className="px-3 py-2 text-left text-xs font-bold text-white border-r border-[#5a7a3a]"
                style={{ backgroundColor: GAPURA_GREEN_DARK }}
              >
                #
              </th>
              {columns.map((col, idx) => (
                <th
                  key={col}
                  className="px-3 py-2 text-xs font-bold text-white border-r border-[#5a7a3a] last:border-r-0 whitespace-nowrap"
                  style={{ 
                    backgroundColor: GAPURA_GREEN,
                    textAlign: numericCols.has(col) ? 'right' : 'left'
                  }}
                >
                  {col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, idx) => (
              <tr
                key={idx}
                className="border-b border-[#f0f0f0] transition-colors"
                style={{ 
                  backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9f9f9'
                }}
              >
                <td className="px-3 py-2 text-[11px] text-[#999] border-r border-[#f0f0f0]">
                  {startIdx + idx + 1}
                </td>
                {columns.map(col => {
                  const val = row[col];
                  const isNum = numericCols.has(col);
                  const formatted = formatValue(val, col);
                  const isLong = formatted.length > 50;
                  
                  return (
                    <td
                      key={col}
                      className="px-3 py-2 text-[11px] text-[#333] border-r border-[#f0f0f0] last:border-r-0"
                      style={{ 
                        textAlign: isNum ? 'right' : 'left',
                        maxWidth: 300
                      }}
                      title={isLong ? formatted : undefined}
                    >
                      <span className={isLong ? 'truncate block' : ''}>
                        {isLong ? formatted.substring(0, 47) + '...' : formatted}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {totalRows > pageSize && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-[#e0e0e0] bg-white">
          <span className="text-[10px] text-[#666]">
            Showing {startIdx + 1}-{endIdx} of {totalRows} records
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded hover:bg-[#f0f0f0] disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ color: GAPURA_GREEN }}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-[10px] text-[#666]">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded hover:bg-[#f0f0f0] disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ color: GAPURA_GREEN }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


