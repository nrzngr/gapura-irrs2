import { useState } from 'react';
import { ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PivotDataResult } from './usePivotData';
import { Normalization } from '@/components/chart-detail/GlobalControlBar';
import { PivotCell } from './PivotCell';

interface PivotGridProps {
  data: PivotDataResult;
  sortCol: string;
  sortDesc: boolean;
  onSort: (col: string) => void;
  normalization: Normalization;
  compact?: boolean;
}

const PAGE_SIZE = 12;

export function PivotGrid({ 
  data, 
  sortCol, 
  sortDesc, 
  onSort, 
  normalization, 
  compact 
}: PivotGridProps) {
  
  const [currentPage, setCurrentPage] = useState(1);
  const { rows, cols, matrix, rowStats, colStats, grandTotal, rowField } = data;

  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const paginatedRows = rows.slice(startIdx, Math.min(startIdx + PAGE_SIZE, rows.length));

  const handleSort = (col: string) => {
      onSort(col);
      setCurrentPage(1); // Reset to page 1 on sort
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-white relative">
        <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full border-separate border-spacing-0 text-xs">
                {/* HEAD */}
                <thead className="sticky top-0 z-30 bg-white">
                    <tr>
                        {/* Corner */}
                        <th className="px-4 py-3 text-left bg-white border-b border-gray-100/80 shadow-sm sticky left-0 z-40 w-48 min-w-[200px] backdrop-blur-md bg-white/95">
                             <button 
                                onClick={() => handleSort('name')}
                                className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-emerald-700 transition-colors group"
                              >
                                <span>{rowField}</span>
                                <ArrowUpDown size={11} className={cn("transition-opacity", sortCol === 'name' ? 'opacity-100 text-emerald-600' : 'opacity-0 group-hover:opacity-50')} />
                              </button>
                        </th>
                        
                        {/* Columns */}
                        {cols.map(c => (
                            <th key={c} className="px-2 py-3 text-center bg-white border-b border-gray-100/80 shadow-sm min-w-[100px] backdrop-blur-md bg-white/95">
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
                         <th className="px-4 py-3 text-right bg-white border-b border-gray-100/80 border-l border-gray-50 shadow-sm sticky right-0 z-40 min-w-[120px] backdrop-blur-md bg-white/95">
                            <button 
                              onClick={() => handleSort('total')}
                              className="flex items-center justify-end gap-1 w-full text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-emerald-700 transition-colors group"
                            >
                              <span>Total</span>
                              <ArrowUpDown size={11} className={cn("transition-opacity", sortCol === 'total' ? 'opacity-100 text-emerald-600' : 'opacity-0 group-hover:opacity-50')} />
                            </button>
                        </th>
                    </tr>
                </thead>

                {/* BODY */}
                <tbody className="divide-y divide-gray-50/50">
                    {paginatedRows.map((r) => {
                        const rTotal = rowStats[r].total;
                        return (
                            <tr key={r} className="group transition-colors hover:bg-gray-50/30">
                                {/* Row Label */}
                                <td className="px-4 py-3 text-xs font-semibold text-gray-700 sticky left-0 bg-white group-hover:bg-gray-50/30 transition-colors border-r border-transparent z-20 w-48 truncate shadow-[2px_0_5px_-2px_rgba(0,0,0,0.02)]" title={r}>
                                    {r}
                                </td>

                                {/* Cells */}
                                {cols.map(c => {
                                    const val = matrix.get(`${r}__${c}`) || 0;
                                    
                                    // Context for Heatmap
                                    let contextMax = 0;
                                    if (normalization === 'row') contextMax = rTotal;
                                    else if (normalization === 'col') contextMax = colStats[c].max;
                                    else contextMax = colStats[cols[0]].max; // Global Logic (simplified)

                                    return (
                                        <PivotCell 
                                            key={`${r}-${c}`}
                                            value={val}
                                            rowLabel={r}
                                            colLabel={c}
                                            rowTotal={rTotal}
                                            colTotal={colStats[c].total}
                                            grandTotal={grandTotal}
                                            normalization={normalization}
                                            contextMax={contextMax}
                                        />
                                    );
                                })}

                                {/* Row Total */}
                                <td className="px-4 py-3 text-xs font-bold text-gray-800 text-right sticky right-0 bg-white/95 border-l border-gray-50/50 group-hover:bg-gray-50/30 transition-colors z-20 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.02)] tabular-nums">
                                    {rTotal.toLocaleString('id-ID')}
                                </td>
                            </tr>
                        );
                    })}

                    {/* Grand Total Row */}
                    <tr className="sticky bottom-0 z-30 bg-gray-50/90 backdrop-blur-sm border-t border-gray-200 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.05)]">
                        <td className="px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider sticky left-0 z-40 bg-gray-50/95 shadow-sm">
                            Grand Total
                        </td>
                        {cols.map(c => (
                           <td key={`total-${c}`} className="px-2 py-3 text-xs font-bold text-gray-700 text-center tabular-nums">
                               {colStats[c].total.toLocaleString('id-ID')}
                           </td> 
                        ))}
                        <td className="px-4 py-3 text-xs font-black text-gray-900 text-right sticky right-0 z-40 bg-gray-100/90 border-l border-gray-200 tabular-nums">
                            {grandTotal.toLocaleString('id-ID')}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        {/* PAGINATION */}
        {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 bg-white/95 backdrop-blur-sm z-30">
                <span className="text-[10px] text-gray-400 font-medium">
                    Page {currentPage} of {totalPages}
                </span>
                <div className="flex items-center gap-1">
                    <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                        disabled={currentPage === 1}
                        className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    >
                        <ChevronLeft size={14} />
                    </button>
                    <button 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                        disabled={currentPage === totalPages}
                        className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    >
                        <ChevronRight size={14} />
                    </button>
                </div>
            </div>
        )}
    </div>
  );
}
