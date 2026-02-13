'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { QueryResult } from '@/types/builder';

interface CustomPivotTableProps {
  result: QueryResult;
  title?: string;
}

const GAPURA_GREEN = '#6b8e3d';
const GAPURA_GREEN_DARK = '#5a7a3a';

// Safe number conversion
function toSafeNumber(val: unknown): number {
  if (val === null || val === undefined) return 0;
  const num = Number(val);
  return isNaN(num) ? 0 : num;
}

// Safe string conversion
function toSafeString(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

export function CustomPivotTable({ result, title }: CustomPivotTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const processedData = useMemo(() => {
    const columns = result.columns;
    const data = result.rows as Record<string, unknown>[];
    
    if (data.length === 0) {
      return {
        displayRows: [] as Array<{ row: string; total: number }>,
        cols: [] as string[],
        matrix: new Map<string, number>(),
        rowTotals: {} as { [key: string]: number },
        colTotals: {} as { [key: string]: number },
        grandTotal: 0,
        maxValue: 0,
        totalRows: 0,
        isHierarchical: false,
        rowField: '',
        colField: ''
      };
    }
    
    // Auto-detect column types
    const sampleRow = data[0];
    const dimColumns: string[] = [];
    const measureColumns: string[] = [];
    
    columns.forEach(col => {
      const val = sampleRow[col];
      if (typeof val === 'number') {
        measureColumns.push(col);
      } else {
        dimColumns.push(col);
      }
    });
    
    // Determine structure based on title and columns
    const isCaseReportByArea = title === 'Case Report by Area';
    const isDetailByBranch = title?.includes('by Branch');
    const isDetailByAirlines = title?.includes('by Airlines');
    
    let rowField: string;
    let colField: string;
    let valueField: string;
    let isHierarchical = false;
    
    if (isCaseReportByArea) {
      // Hierarchical: Branch Report -> Airlines -> Area columns
      isHierarchical = true;
      rowField = dimColumns.find(c => c.toLowerCase().includes('branch')) || dimColumns[0];
      colField = dimColumns.find(c => c.toLowerCase().includes('area')) || dimColumns[2];
      valueField = measureColumns[0];
    } else if (isDetailByBranch) {
      // Simple pivot: Category (row) x Branch (col)
      rowField = dimColumns.find(c => c.toLowerCase().includes('category')) || dimColumns[0];
      colField = dimColumns.find(c => c.toLowerCase().includes('branch')) || dimColumns[1];
      valueField = measureColumns[0];
    } else if (isDetailByAirlines) {
      // Simple pivot: Category (row) x Airlines (col)
      rowField = dimColumns.find(c => c.toLowerCase().includes('category')) || dimColumns[0];
      colField = dimColumns.find(c => c.toLowerCase().includes('airlines')) || dimColumns[1];
      valueField = measureColumns[0];
    } else {
      // Default: first dim = row, second dim = col, first measure = value
      rowField = dimColumns[0];
      colField = dimColumns[1];
      valueField = measureColumns[0];
    }
    
    console.log(`[CustomPivotTable] ${title} - Structure:`, {
      isHierarchical,
      rowField,
      colField,
      valueField,
      dimColumns,
      measureColumns
    });
    
    // Extract unique values
    const rowValues = [...new Set(data.map(r => toSafeString(r[rowField])).filter(Boolean))];
    const colValues = [...new Set(data.map(r => toSafeString(r[colField])).filter(Boolean))].sort();
    
    // Build matrix
    const matrix = new Map<string, number>();
    let maxValue = 0;
    
    data.forEach(row => {
      const rowVal = toSafeString(row[rowField]);
      const colVal = toSafeString(row[colField]);
      const val = toSafeNumber(row[valueField]);
      
      if (rowVal && colVal) {
        const key = `${rowVal}__${colVal}`;
        matrix.set(key, val);
        if (val > maxValue) maxValue = val;
      }
    });
    
    // Build display rows with totals
    const displayRows = rowValues.map(rowVal => {
      const total = colValues.reduce((sum, colVal) => {
        return sum + (matrix.get(`${rowVal}__${colVal}`) || 0);
      }, 0);
      
      return {
        row: rowVal,
        total
      };
    }).sort((a, b) => b.total - a.total); // Sort by total descending
    
    // Calculate column totals
    const colTotals: { [key: string]: number } = {};
    colValues.forEach((colVal: string) => {
      colTotals[colVal] = displayRows.reduce((sum: number, row: { row: string; total: number }) => {
        return sum + (matrix.get(`${row.row}__${colVal}`) || 0);
      }, 0);
    });
    
    // Calculate row totals
    const rowTotals: Record<string, number> = {};
    displayRows.forEach(row => {
      rowTotals[row.row] = row.total;
    });
    
    // Calculate grand total
    const grandTotal = Object.values(colTotals).reduce((a, b) => a + b, 0);
    
    console.log(`[CustomPivotTable] ${title} - Totals:`, {
      grandTotal,
      colTotals,
      rowCount: displayRows.length
    });
    
    return {
      displayRows,
      cols: colValues,
      matrix,
      rowTotals,
      colTotals,
      grandTotal,
      maxValue,
      totalRows: displayRows.length,
      isHierarchical,
      rowField,
      colField
    };
  }, [result, title]);

  const { 
    displayRows, 
    cols, 
    matrix, 
    rowTotals, 
    colTotals, 
    grandTotal, 
    maxValue, 
    totalRows,
    isHierarchical,
    rowField,
    colField
  } = processedData;

  // Paginate
  const totalPages = Math.ceil(totalRows / pageSize);
  const paginatedRows = displayRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Color intensity function
  function getCellColor(value: number): { bg: string; text: string } {
    if (value === 0) return { bg: '#ffffff', text: '#999' };
    
    const intensity = maxValue > 0 ? value / maxValue : 0;
    
    if (intensity <= 0.2) {
      return { bg: '#e8f5e9', text: '#333' };
    } else if (intensity <= 0.4) {
      return { bg: '#c8e6c9', text: '#333' };
    } else if (intensity <= 0.6) {
      return { bg: '#a5d6a7', text: '#333' };
    } else if (intensity <= 0.8) {
      return { bg: '#81c784', text: '#fff' };
    } else {
      return { bg: '#66bb6a', text: '#fff' };
    }
  }

  // Format subtitle
  const subtitle = title === 'Case Report by Area' 
    ? 'Area Report / Branch by Airlines'
    : title?.includes('by Branch')
      ? `${rowField} / Branch`
      : title?.includes('by Airlines')
        ? `${rowField} / Airlines`
        : '';

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-lg border border-[#e0e0e0] overflow-hidden">
      {/* Header */}
      {subtitle && (
        <div className="bg-[#f5f5f5] border-b border-[#e0e0e0]">
          <div 
            className="px-3 py-2 text-white text-[11px] font-bold text-center"
            style={{ backgroundColor: GAPURA_GREEN }}
          >
            {subtitle}
          </div>
        </div>
      )}
      
      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th 
                className="px-2 py-2 text-left text-[10px] font-bold text-white border-r border-[#5a7a3a]"
                style={{ backgroundColor: GAPURA_GREEN, minWidth: 120 }}
              >
                {rowField}
              </th>
              {cols.map(col => (
                <th
                  key={col}
                  className="px-2 py-2 text-center text-[10px] font-bold text-white border-r border-[#5a7a3a] last:border-r-0"
                  style={{ 
                    backgroundColor: GAPURA_GREEN, 
                    minWidth: 80,
                    maxWidth: 120,
                    width: 100,
                    whiteSpace: 'normal',
                    wordWrap: 'break-word',
                    overflow: 'hidden',
                    lineHeight: '1.2',
                    verticalAlign: 'middle'
                  }}
                  title={col}
                >
                  {col}
                </th>
              ))}
              <th 
                className="px-2 py-2 text-center text-[10px] font-bold text-white"
                style={{ backgroundColor: GAPURA_GREEN_DARK, minWidth: 70 }}
              >
                Grand total
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length === 0 ? (
              <tr>
                <td 
                  colSpan={cols.length + 2} 
                  className="px-4 py-8 text-center text-[11px] text-[#999]"
                >
                  No data available
                </td>
              </tr>
            ) : (
              <>
                {paginatedRows.map((row, idx) => (
                  <tr
                    key={`${row.row}-${idx}`}
                    className="border-b border-[#f0f0f0]"
                    style={{ 
                      backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9f9f9'
                    }}
                  >
                    <td 
                      className="px-2 py-1.5 text-[10px] text-[#333] border-r border-[#f0f0f0] font-medium"
                      style={{ backgroundColor: '#f5f5f5' }}
                      title={row.row}
                    >
                      {row.row}
                    </td>
                    {cols.map(col => {
                      const val = matrix.get(`${row.row}__${col}`) || 0;
                      const { bg, text } = getCellColor(val);
                      
                      return (
                        <td
                          key={col}
                          className="px-2 py-1.5 text-[10px] text-center border-r border-[#f0f0f0] font-bold"
                          style={{ backgroundColor: bg, color: text }}
                        >
                          {val > 0 ? val : '-'}
                        </td>
                      );
                    })}
                    <td 
                      className="px-2 py-1.5 text-[10px] text-center font-bold border-l-2 border-[#6b8e3d]"
                      style={{ backgroundColor: '#e8f5e9', color: '#333' }}
                    >
                      {row.total}
                    </td>
                  </tr>
                ))}
                {/* Grand total row */}
                <tr style={{ backgroundColor: '#e8f5e9' }}>
                  <td 
                    className="px-2 py-2 text-[10px] font-bold text-[#333] border-t-2 border-[#6b8e3d] border-r border-[#f0f0f0]"
                  >
                    Grand total
                  </td>
                  {cols.map(col => (
                    <td 
                      key={col}
                      className="px-2 py-2 text-[10px] text-center font-bold text-[#333] border-t-2 border-[#6b8e3d] border-r border-[#f0f0f0]"
                    >
                      {colTotals[col] || 0}
                    </td>
                  ))}
                  <td 
                    className="px-2 py-2 text-[10px] text-center font-bold text-[#333] border-t-2 border-[#6b8e3d] border-l-2 border-[#6b8e3d]"
                  >
                    {grandTotal}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {totalRows > pageSize && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-[#e0e0e0] bg-white">
          <span className="text-[9px] text-[#666]">
            Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalRows)} of {totalRows}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded hover:bg-[#f0f0f0] disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ color: GAPURA_GREEN }}
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-[9px] text-[#666]">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded hover:bg-[#f0f0f0] disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ color: GAPURA_GREEN }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
