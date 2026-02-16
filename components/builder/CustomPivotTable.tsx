'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ArrowUpDown, Info, SlidersHorizontal, ArrowDown, ArrowUp, LayoutGrid, ArrowRight } from 'lucide-react';
import type { QueryResult } from '@/types/builder';
import { motion } from 'framer-motion';
import { ViewMode, Normalization } from '@/components/chart-detail/GlobalControlBar';

interface CustomPivotTableProps {
  result: QueryResult;
  title?: string;
  subtitle?: string;
  viewMode?: ViewMode;
  normalization?: Normalization;
  compact?: boolean;
}

// ----------------------------------------------------------------------
// DESIGN TOKENS & COLOR SCALES
// ----------------------------------------------------------------------

// 5-Step Green Scale (WCAG Optimized)
const HEATMAP_SCALE = [
  { bg: '#E8F5E9', text: '#374151', min: 0.00, label: 'Very Low' },  // 50
  { bg: '#C8E6C9', text: '#1B5E20', min: 0.15, label: 'Low' },       // 100
  { bg: '#81C784', text: '#1B5E20', min: 0.40, label: 'Medium' },    // 300
  { bg: '#43A047', text: '#FFFFFF', min: 0.60, label: 'High' },      // 600
  { bg: '#1B5E20', text: '#FFFFFF', min: 0.80, label: 'Very High' }  // 900
];

const ZERO_STATE = { bg: 'transparent', text: '#9CA3AF' }; // Gray-400 for zeros

// Safe conversion helpers
function toSafeNumber(val: unknown): number {
  if (val === null || val === undefined) return 0;
  const num = Number(val);
  return isNaN(num) ? 0 : num;
}

function toSafeString(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

export function CustomPivotTable({ 
  result, 
  title, 
  viewMode = 'values', 
  normalization = 'none',
  compact = false 
}: CustomPivotTableProps) {
  
  // State
  const [currentPage, setCurrentPage] = useState(1);
  const [sortCol, setSortCol] = useState<string>('total');
  const [sortDesc, setSortDesc] = useState(true);
  const [activeNormalization, setActiveNormalization] = useState<Normalization>(normalization);

  // Constants
  const PAGE_SIZE = 12; // Comfortable viewing
  
  // Data Processing (Memoized)
  const processedData = useMemo(() => {
    const columns = result.columns;
    const data = result.rows as Record<string, unknown>[];
    
    if (data.length === 0) return null;
    
    // 1. Detect Dimensions
    const sampleRow = data[0];
    const dimColumns: string[] = [];
    const measureColumns: string[] = [];
    columns.forEach(col => {
      const val = sampleRow[col];
      if (typeof val === 'number') measureColumns.push(col);
      else dimColumns.push(col);
    });
    
    // Heuristics for specific chart types (Apron, Cases, etc.)
    const isCaseReportByArea = title === 'Case Report by Area';
    const isDetailByBranch = title?.includes('by Branch');
    
    let rowField = dimColumns[0];
    let colField = dimColumns[1];
    let valueField = measureColumns[0];
    
    if (isCaseReportByArea) {
      rowField = dimColumns.find(c => c.toLowerCase().includes('branch')) || dimColumns[0];
      colField = dimColumns.find(c => c.toLowerCase().includes('area')) || dimColumns[2];
    } else if (isDetailByBranch) {
      rowField = dimColumns.find(c => c.toLowerCase().includes('category')) || dimColumns[0];
      colField = dimColumns.find(c => c.toLowerCase().includes('branch')) || dimColumns[1];
    } else if (title?.includes('by Airlines')) {
        rowField = dimColumns.find(c => c.toLowerCase().includes('airline')) || dimColumns[0];
        colField = dimColumns.find(c => c.toLowerCase().includes('area') || c.toLowerCase().includes('category') || c.toLowerCase().includes('criteria')) || dimColumns[1];
    }

    // 2. Build Matrix
    const matrix = new Map<string, number>();
    const rowSet = new Set<string>();
    const colSet = new Set<string>();
    let grandTotal = 0;

    data.forEach(row => {
      const r = toSafeString(row[rowField]);
      const c = toSafeString(row[colField]);
      const v = toSafeNumber(row[valueField]);
      if (r && c) {
        matrix.set(`${r}__${c}`, v);
        rowSet.add(r);
        colSet.add(c);
        grandTotal += v;
      }
    });

    const rows = Array.from(rowSet);
    const cols = Array.from(colSet);

    // 3. Calculate Stats (Row/Col Totals & Max)
    const rowStats: Record<string, { total: number; max: number }> = {};
    const colStats: Record<string, { total: number; max: number }> = {};

    rows.forEach(r => {
      let total = 0;
      let max = 0;
      cols.forEach(c => {
        const val = matrix.get(`${r}__${c}`) || 0;
        total += val;
        if (val > max) max = val;
      });
      rowStats[r] = { total, max };
    });

    cols.forEach(c => {
      let total = 0;
      let max = 0;
      rows.forEach(r => {
        const val = matrix.get(`${r}__${c}`) || 0;
        total += val;
        if (val > max) max = val;
      });
      colStats[c] = { total, max };
    });

    // 4. Default Sorting (Total Descending)
    cols.sort((a, b) => colStats[b].total - colStats[a].total);

    rows.sort((a, b) => {
        if (sortCol === 'total') return sortDesc ? rowStats[b].total - rowStats[a].total : rowStats[a].total - rowStats[b].total;
        if (sortCol === 'name') return sortDesc ? a.localeCompare(b) : b.localeCompare(a); // Alpha sort is usually ASC default
        return 0;
    });

    return { rows, cols, matrix, rowStats, colStats, grandTotal, rowField, colField };
  }, [result, title, sortCol, sortDesc]);

  if (!processedData) return null;
  
  const { rows, cols, matrix, rowStats, colStats, grandTotal, rowField } = processedData;
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const paginatedRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // --- Visual Helpers ---

  const getIntensity = (val: number, contextMax: number) => {
    if (val === 0) return ZERO_STATE;
    const ratio = val / (contextMax || 1);
    
    for (let i = HEATMAP_SCALE.length - 1; i >= 0; i--) {
        if (ratio >= HEATMAP_SCALE[i].min) return HEATMAP_SCALE[i];
    }
    return HEATMAP_SCALE[0];
  };

  const formatValue = (val: number, r: string, c: string) => {
     if (val === 0) return '-';
     // If user specific explicitly % view mode
     if (viewMode === 'percentage') {
         // This usually implies % of Grand Total unless normalized
         const base = activeNormalization === 'row' ? rowStats[r].total :
                      activeNormalization === 'col' ? colStats[c].total :
                      grandTotal;
         return ((val / base) * 100).toFixed(1) + '%';
     }
     return val.toLocaleString('id-ID');
  };

  return (
    <div className="flex flex-col h-full bg-white font-sans rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      
      {/* 1. HEADER & CONTROLS */}
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-white z-20">
        
        {/* Left: View Toggles */}
        <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-100/50">
            {[
                { id: 'none', label: 'All', icon: LayoutGrid },
                { id: 'row', label: 'Row %', icon: ArrowRightIcon },
                { id: 'col', label: 'Col %', icon: ArrowDownIcon },
            ].map(m => (
                <button
                    key={m.id}
                    onClick={() => setActiveNormalization(m.id as Normalization)}
                    className={`
                        flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-bold transition-all
                        ${activeNormalization === m.id 
                            ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-black/5' 
                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100/50'}
                    `}
                >
                    {m.id === 'none' && <LayoutGrid size={12} />}
                    {m.id === 'row' && <ArrowRight size={12} />}
                    {m.id === 'col' && <ArrowDown size={12} />}
                    <span className="hidden sm:inline">{m.label}</span>
                </button>
            ))}
        </div>

        {/* Right: Legend */}
        <div className="flex items-center gap-3">
             <div className="flex items-center gap-1 pr-4 border-r border-gray-100">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mr-1">Intensity</span>
                <div className="flex gap-0.5">
                    {HEATMAP_SCALE.map((step, i) => (
                        <div 
                            key={i} 
                            className="w-2.5 h-2.5 rounded-[2px]" 
                            style={{ backgroundColor: step.bg }} 
                            title={`${step.label} (>${step.min * 100}%)`}
                        />
                    ))}
                </div>
             </div>
             
             {/* Total Cases Indicator */}
             <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                 <span>{grandTotal.toLocaleString('id-ID')} Cases</span>
             </div>
        </div>
      </div>

      {/* 2. TABLE BODY */}
      <div className="flex-1 overflow-auto relative custom-scrollbar bg-white">
        <table className="w-full border-separate border-spacing-0">
           
           {/* Sticky Header */}
           <thead className="sticky top-0 z-20 bg-white">
             <tr>
               {/* Corner / Row Label */}
               <th className="px-4 py-3 text-left bg-white border-b border-gray-100 shadow-[0_2px_10px_-5px_rgba(0,0,0,0.05)] sticky left-0 z-30 w-48 min-w-[180px]">
                  <button 
                    onClick={() => { setSortCol('name'); setSortDesc(!sortDesc); }}
                    className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-emerald-700 transition-colors group"
                  >
                    <span>{rowField}</span>
                    <ArrowUpDown size={11} className={`transition-opacity ${sortCol === 'name' ? 'opacity-100 text-emerald-600' : 'opacity-0 group-hover:opacity-50'}`} />
                  </button>
               </th>

               {/* Column Headers */}
               {cols.map(c => (
                   <th key={c} className="px-2 py-3 text-center bg-white border-b border-gray-100 shadow-[0_2px_10px_-5px_rgba(0,0,0,0.05)] min-w-[90px]">
                       <div className="flex flex-col items-center justify-center gap-0.5 group cursor-default">
                           <span className="text-[10px] font-bold text-gray-500 group-hover:text-gray-800 transition-colors line-clamp-1" title={c}>
                               {c}
                           </span>
                           <span className="text-[9px] text-gray-300 font-medium group-hover:text-emerald-500 transition-colors">
                               {colStats[c].total.toLocaleString()}
                           </span>
                       </div>
                   </th>
               ))}

               {/* Total Header */}
               <th className="px-4 py-3 text-right bg-white border-b border-gray-100 border-l border-gray-50 shadow-[0_2px_10px_-5px_rgba(0,0,0,0.05)] sticky right-0 z-30 min-w-[100px]">
                   <button 
                     onClick={() => { setSortCol('total'); setSortDesc(!sortDesc); }}
                     className="flex items-center justify-end gap-1 w-full text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-emerald-700 transition-colors group"
                   >
                     <span>Total</span>
                     <ArrowUpDown size={11} className={`transition-opacity ${sortCol === 'total' ? 'opacity-100 text-emerald-600' : 'opacity-0 group-hover:opacity-50'}`} />
                   </button>
               </th>
             </tr>
           </thead>

           {/* Body */}
           <tbody className="divide-y divide-gray-50">
              {paginatedRows.map((r, i) => {
                  const rTotal = rowStats[r].total;
                  return (
                      <tr key={r} className="group hover:bg-gray-50/50 transition-colors">
                          {/* Row Label (Sticky) */}
                          <td className="px-4 py-3.5 text-xs font-semibold text-gray-700 sticky left-0 bg-white group-hover:bg-gray-50 transition-colors border-r border-transparent z-10 w-48 truncate" title={r}>
                              {r}
                          </td>

                          {/* Data Cells */}
                          {cols.map(c => {
                              const val = matrix.get(`${r}__${c}`) || 0;
                              
                              // Determine Context for Coloring
                              let contextMax = 0;
                              if (activeNormalization === 'row') contextMax = rTotal;
                              else if (activeNormalization === 'col') contextMax = colStats[c].max; // Normalize vs col max for distribution
                              else contextMax = colStats[cols[0]].max; // Global Max usually (approx)

                              const style = getIntensity(val, contextMax);
                              
                              return (
                                  <td key={c} className="p-1 text-center align-middle">
                                      <div 
                                        className="w-full h-9 flex items-center justify-center rounded-[6px] text-[10px] font-medium transition-transform hover:scale-105 hover:shadow-sm cursor-default"
                                        style={{ 
                                            backgroundColor: style.bg, 
                                            color: style.text 
                                        }}
                                        title={`${r} • ${c}: ${val} (${((val/rTotal)*100).toFixed(1)}%)`}
                                      >
                                          {formatValue(val, r, c)}
                                      </div>
                                  </td>
                              );
                          })}

                          {/* Row Total (Sticky) */}
                          <td className="px-4 py-3.5 text-xs font-bold text-gray-800 text-right sticky right-0 bg-white border-l border-gray-50 group-hover:bg-gray-50 transition-colors z-10">
                              {rTotal.toLocaleString('id-ID')}
                          </td>
                      </tr>
                  );
              })}

              {/* Grand Total Row (Sticky Bottom) */}
              <tr className="sticky bottom-0 z-20">
                  <td className="px-4 py-4 bg-gray-50 border-t border-gray-200 text-xs font-bold text-gray-600 uppercase tracking-wider sticky left-0 z-30 shadow-[0_-4px_10px_-4px_rgba(0,0,0,0.05)]">
                      Grand Total
                  </td>
                  {cols.map(c => (
                      <td key={c} className="px-2 py-4 bg-gray-50 border-t border-gray-200 text-xs font-bold text-gray-700 text-center shadow-[0_-4px_10px_-4px_rgba(0,0,0,0.05)]">
                          {colStats[c].total.toLocaleString('id-ID')}
                      </td>
                  ))}
                  <td className="px-4 py-4 bg-gray-100 border-t border-gray-200 text-xs font-black text-gray-800 text-right sticky right-0 border-l border-gray-200 z-30 shadow-[0_-4px_10px_-4px_rgba(0,0,0,0.05)]">
                      {grandTotal.toLocaleString('id-ID')}
                  </td>
              </tr>
           </tbody>

        </table>
      </div>

      {/* 3. PAGINATION (Compact) */}
      {totalPages > 1 && (
        <div className="px-4 py-2 border-t border-gray-100 bg-white flex items-center justify-between z-20">
            <span className="text-[10px] text-gray-400 font-medium">
                Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
                <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                    disabled={currentPage === 1}
                    className="p-1 rounded-md hover:bg-gray-100 text-gray-500 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                >
                    <ChevronLeft size={14} />
                </button>
                <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                    disabled={currentPage === totalPages}
                    className="p-1 rounded-md hover:bg-gray-100 text-gray-500 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                >
                    <ChevronRight size={14} />
                </button>
            </div>
        </div>
      )}

    </div>
  );
}

// Icons for Buttons (Small helper components to avoid Lucid import clutter if needed, but imported above)
function ArrowRightIcon() { return <ArrowUpDown className="rotate-90" size={12} />; }
function ArrowDownIcon() { return <ArrowUpDown size={12} />; }
