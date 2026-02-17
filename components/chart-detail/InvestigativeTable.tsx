'use client';

import { useState, useMemo, Fragment, useEffect } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Search, 
  Filter, 
  Download, 
  Maximize2, 
  MoreHorizontal, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle,
  Clock,
  Link as LinkIcon,
  Sparkles,
  ChevronUp,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { QueryResult } from '@/types/builder';
import { formatDisplayValue } from '@/lib/chart-utils';


interface InvestigativeTableProps {
  data: QueryResult;
  title: string;
  className?: string;
  onViewDetail?: () => void;
}

type SortDir = 'asc' | 'desc';

// Helper to determine badge color based on category
const getCategoryBadgeStyle = (category: string) => {
  const cat = category.toLowerCase();
  if (cat.includes('complaint') || cat.includes('komplain')) {
    return 'bg-red-50 text-red-700 border-red-100 ring-red-500/10'; // Red for Complaint
  }
  if (cat.includes('irregularity') || cat.includes('irreg')) {
    return 'bg-orange-50 text-orange-700 border-orange-100 ring-orange-500/10'; // Orange for Irregularity
  }
  if (cat.includes('compliment') || cat.includes('apresiasi')) {
    return 'bg-green-50 text-green-700 border-green-100 ring-green-500/10'; // Green for Compliment
  }
  return 'bg-gray-50 text-gray-700 border-gray-100 ring-gray-500/10'; // Default Neutral
};

const getCategoryIcon = (category: string) => {
  const cat = category.toLowerCase();
  if (cat.includes('complaint')) return <AlertCircle size={12} />;
  if (cat.includes('irregularity')) return <HelpCircle size={12} />;
  if (cat.includes('compliment')) return <CheckCircle2 size={12} />;
  return <FileText size={12} />;
};

// Helper to parse evidence links (splits space, comma, newline separated or postgres arrays)
const parseEvidenceLinks = (val: any): string[] => {
  if (!val) return [];
  const str = String(val).trim();
  if (!str) return [];

  // Handle Postgres array format {url1,url2}
  if (str.startsWith('{') && str.endsWith('}')) {
    return str.slice(1, -1).split(',').map(s => s.trim().replace(/"/g, '')).filter(Boolean);
  }

  // Split by common delimiters: space, comma, newline
  // We filter to ensure they look like URLs
  return str.split(/[\s,\n]+/)
    .map(s => s.trim())
    .filter(s => s.startsWith('http') || s.includes('www.'));
};

export function InvestigativeTable({ data, title, className = '', onViewDetail }: InvestigativeTableProps) {
  const [isClient, setIsClient] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);


  // Hydration sync
  useEffect(() => {
    setIsClient(true);
  }, []);

  // ─── 1. COLUMN DEFINITION ───────────────────────────────────────────────────
  const allColumns = data.columns;

  // Identify special columns
  const categoryCol = allColumns.find(c => [
    'category', 
    'kategori', 
    'main_category', 
    'report_category', 
    'kategori_laporan', 
    'irregularity_complain_category',
    'complaint_category',
    'jenis_laporan',
    'category_detail',
    'report category'
  ].includes(c.toLowerCase()));
  const dateCol = allColumns.find(c => ['date', 'tanggal', 'created_at', 'flight_date'].includes(c.toLowerCase()));
  const reportCol = allColumns.find(c => ['report', 'laporan', 'description', 'remark', 'remarks', 'short_report'].includes(c.toLowerCase()));
  const rootCauseCol = allColumns.find(c => ['root_cause', 'root cause', 'root caused', 'akar_masalah', 'penyebab'].includes(c.toLowerCase()));
  const actionTakenCol = allColumns.find(c => ['action_taken', 'action taken', 'tindakan', 'action', 'corrective_action'].includes(c.toLowerCase()));
  const evidenceCol = allColumns.find(c => {
    const l = c.toLowerCase();
    return l.includes('evidence') || l === 'link' || l === 'url' || l.includes('evidence_link');
  });

  const primaryColumns = useMemo(() => {
    return allColumns.filter(c => {
      const lower = c.toLowerCase();
      // We want root cause and action taken in primary columns if they exist as separate columns in the source
      // but we filter out purely metadata/id/count
      return !['id', 'count', 'description', 'detail', 'full_report', 'url'].includes(lower);
    });
  }, [allColumns]);

  // ─── 2. DATA PROCESSING ─────────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    let rows = data.rows as Record<string, any>[];
    
    // Search
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      rows = rows.filter(row => 
        allColumns.some(col => String(row[col]).toLowerCase().includes(lowerTerm))
      );
    }
    
    // Sort
    if (sortCol) {
      rows = [...rows].sort((a, b) => {
        const valA = a[sortCol];
        const valB = b[sortCol];
        
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDir === 'asc' ? valA - valB : valB - valA;
        }
        return sortDir === 'asc' 
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return rows;
  }, [data.rows, allColumns, searchTerm, sortCol, sortDir]);

  // Statistics for Summary Strip
  const stats = useMemo(() => {
    const metricCol = allColumns.find(c => ['count', 'jumlah', 'total', 'record_count', 'frequency'].includes(c.toLowerCase()));
    
    // Helper to sum metric or count rows
    const sumMetric = (items: Record<string, any>[]) => {
      if (!metricCol) return items.length;
      return items.reduce((sum, item) => sum + (Number(item[metricCol]) || 0), 0);
    };

    const total = sumMetric(filteredData);
    const complaints = categoryCol ? sumMetric(filteredData.filter(r => String(r[categoryCol]).toLowerCase().includes('complaint'))) : 0;
    const irregularities = categoryCol ? sumMetric(filteredData.filter(r => String(r[categoryCol]).toLowerCase().includes('irregularity'))) : 0;
    const compliments = categoryCol ? sumMetric(filteredData.filter(r => String(r[categoryCol]).toLowerCase().includes('compliment'))) : 0;
    
    return { total, complaints, irregularities, compliments };
  }, [filteredData, categoryCol, allColumns]);



  // ─── HANDLERS ───────────────────────────────────────────────────────────────
  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const toggleRow = (idx: number) => {
    setExpandedRowId(curr => curr === idx ? null : idx);
  };

  const handleExport = () => {
    // Basic CSV export logic would go here
    const headers = allColumns.join(',');
    const csvContent = filteredData.map(row => 
      allColumns.map(c => `"${String(row[c] || '').replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    const blob = new Blob([`${headers}\n${csvContent}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}_export.csv`;
    a.click();
  };

  return (
    <div className={`flex flex-col h-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
      {/* ─── 1. HEADER STRIP ─────────────────────────────────────────────────── */}
      <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4 bg-white sticky top-0 z-30">


        <div className="flex items-center gap-2">
           {/* Summary Stats Pucks */}
           <div className="hidden md:flex items-center gap-2 mr-4 text-xs font-medium">
             {stats.complaints > 0 && (
               <span className="px-2 py-1 rounded-md bg-red-50 text-red-700 border border-red-100 flex items-center gap-1">
                 <AlertCircle size={12} /> {stats.complaints}
               </span>
             )}
             {stats.irregularities > 0 && (
               <span className="px-2 py-1 rounded-md bg-orange-50 text-orange-700 border border-orange-100 flex items-center gap-1">
                 <HelpCircle size={12} /> {stats.irregularities}
               </span>
             )}
             {stats.compliments > 0 && (
               <span className="px-2 py-1 rounded-md bg-green-50 text-green-700 border border-green-100 flex items-center gap-1">
                 <CheckCircle2 size={12} /> {stats.compliments}
               </span>
             )}
           </div>

           {/* Search */}
           <div className="relative group">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              placeholder="Search data..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-40 md:w-64 transition-all"
            />
          </div>



          <button 
            onClick={handleExport}
            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" 
            title="Export CSV"
          >
            <Download size={16} />
          </button>

          {onViewDetail && (
            <button
              onClick={onViewDetail}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-white bg-[#6b8e3d] hover:bg-[#5a7a3a] rounded transition-all shadow-sm active:scale-95 ml-1"
              title="View Table Detail"
            >
              <Maximize2 size={12} />
              <span>Detail</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── ANALYTICS PANEL ───────────────────────────────────────────────── */}


      {/* ─── 2. TABLE BODY ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto custom-scrollbar relative">
        <table className="w-full border-collapse table-fixed">
          <thead className="sticky top-0 z-20 bg-gray-50/95 backdrop-blur-sm shadow-sm">
            <tr>
              <th className="px-3 py-3 text-left w-10" />
              <th className="px-2 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider w-10 text-center">#</th>
              {categoryCol && (
                <th onClick={() => handleSort(categoryCol)} className="px-3 py-3 text-left text-[11px] font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group select-none w-32">
                  <div className="flex items-center gap-1">{categoryCol} {sortCol === categoryCol && (sortDir === 'asc' ? '▲' : '▼')}</div>
                </th>
              )}
              {dateCol && (
                <th onClick={() => handleSort(dateCol)} className="px-3 py-3 text-left text-[11px] font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group select-none w-28">
                  <div className="flex items-center gap-1">{dateCol} {sortCol === dateCol && (sortDir === 'asc' ? '▲' : '▼')}</div>
                </th>
              )}
              {primaryColumns.filter(c => c !== categoryCol && c !== dateCol && c !== reportCol).map(col => {
                const isLongText = ['root_cause', 'root caused', 'root cause', 'action_taken', 'action taken', 'action', 'corrective_action'].includes(col.toLowerCase());
                return (
                  <th key={col} onClick={() => handleSort(col)} className={`px-3 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none ${isLongText ? 'w-48' : 'w-24'} break-words`}>
                    <div className="flex items-center gap-1">
                      {col.replace(/_/g, ' ')}
                      {sortCol === col && <span className="text-indigo-500">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                    </div>
                  </th>
                );
              })}
              {reportCol && (
                <th className="px-3 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider w-64">
                  Report Preview
                </th>
              )}
            </tr>
          </thead>
          
          <tbody className="divide-y divide-gray-50 bg-white">
            {filteredData.length === 0 ? (
               <tr>
                 <td colSpan={100} className="px-6 py-12 text-center text-gray-400 text-sm italic">
                   No data found matching your search.
                 </td>
               </tr>
            ) : (
              filteredData.map((row, idx) => {
                const isExpanded = expandedRowId === idx;
                const badges = categoryCol ? getCategoryBadgeStyle(String(row[categoryCol])) : 'bg-gray-100 text-gray-600';
                const Icon = categoryCol ? getCategoryIcon(String(row[categoryCol])) : <FileText size={12} />;

                return (
                  <Fragment key={idx}>
                    <tr 
                      key={idx} 
                      onClick={() => toggleRow(idx)}
                      className={`
                        group transition-all duration-200 cursor-pointer
                        ${isExpanded ? 'bg-indigo-50/30' : 'hover:bg-gray-50'}
                      `}
                    >
                      {/* Toggle & Number */}
                      <td className="px-3 py-3 text-center align-top">
                        <button className={`p-1 rounded-full transition-colors ${isExpanded ? 'bg-indigo-100 text-indigo-600' : 'text-gray-300 group-hover:text-gray-500'}`}>
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      </td>
                      <td className="px-2 py-3 text-center text-xs font-mono text-gray-400 group-hover:text-gray-600 align-top">
                        {idx + 1}
                      </td>

                      {/* Category Badge */}
                      {categoryCol && (
                        <td className="px-3 py-3 align-top">
                           <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold border shadow-sm ring-1 ring-inset w-fit whitespace-normal break-words leading-tight ${badges}`}>
                             <span className="shrink-0">{Icon}</span>
                             <span>{String(row[categoryCol])}</span>
                           </span>
                        </td>
                      )}

                      {/* Date */}
                      {dateCol && (
                        <td className="px-3 py-3 text-xs text-gray-500 align-top">
                           <div className="flex items-center gap-2">
                             <Clock size={12} className="text-gray-300 shrink-0" />
                             <span className="whitespace-nowrap">{formatDisplayValue(row[dateCol], dateCol)}</span>
                           </div>
                        </td>
                      )}

                      {/* Other Columns */}
                      {primaryColumns.filter(c => c !== categoryCol && c !== dateCol && c !== reportCol).map(col => {
                        const isEvidence = col === evidenceCol;
                        const isLongText = ['root_cause', 'root caused', 'root cause', 'action_taken', 'action taken', 'action', 'corrective_action'].includes(col.toLowerCase());
                        
                        if (isEvidence) {
                          const urls = parseEvidenceLinks(row[col]);
                          return (
                            <td key={col} className="px-3 py-3 text-xs align-top">
                              <div className="flex flex-wrap gap-2">
                                {urls.map((url, uIdx) => (
                                  <a 
                                    key={uIdx} 
                                    href={url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 underline decoration-blue-200 hover:decoration-blue-500 transition-all font-medium whitespace-nowrap"
                                  >
                                    Evidence {urls.length > 1 ? uIdx + 1 : ''}
                                  </a>
                                ))}
                                {urls.length === 0 && <span className="text-gray-300">-</span>}
                              </div>
                            </td>
                          );
                        }

                        return (
                          <td key={col} className={`px-3 py-3 text-xs text-gray-700 align-top break-words ${isLongText ? 'font-normal' : 'font-medium'}`}>
                            {col === 'flight' || col === 'airlines' ? (
                              <span className="font-mono">{formatDisplayValue(row[col], col)}</span>
                            ) : (
                              formatDisplayValue(row[col], col)
                            )}
                          </td>
                        );
                      })}

                      {/* Report Preview (Truncated) */}
                      {reportCol && (
                        <td className="px-3 py-3 text-xs text-gray-600 align-top">
                          <div className="line-clamp-2 leading-relaxed break-words">
                            {String(row[reportCol])}
                          </div>
                          <span className="text-[10px] text-indigo-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                            View Details
                          </span>
                        </td>
                      )}
                    </tr>

                    {/* ─── EXPANDED DRAWER ─────────────────────────────────── */}
                    <AnimatePresence>
                      {isExpanded && (
                        <tr key={`${idx}-expanded`}>
                          <td colSpan={100} className="p-0 border-0">
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2, ease: 'easeInOut' }}
                              className="overflow-hidden bg-gray-50/50 box-border"
                            >
                              <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 border-b border-gray-100 shadow-inner">
                                
                                {/* Left: Metadata Grid */}
                                <div className="lg:col-span-3 space-y-6 border-r border-gray-200/50 pr-6">
                                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                     <FileText size={14} /> Metadata
                                  </h4>
                                  <div className="flex flex-col gap-4">
                                    {allColumns.map(col => {
                                      if ([reportCol, rootCauseCol, actionTakenCol, 'evidence'].includes(col)) return null;
                                      return (
                                        <div key={col} className="w-full">
                                           <div className="text-[10px] uppercase text-gray-400 font-semibold mb-0.5">{col.replace(/_/g, ' ')}</div>
                                           <div className="text-sm font-medium text-gray-800 break-words">{String(row[col] || '-')}</div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Right: Long Text Content */}
                                <div className="lg:col-span-9 space-y-6 pl-2">
                                  {/* Report Section */}
                                  {reportCol && (
                                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                      <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <FileText size={14} /> Full Report
                                      </h4>
                                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                        {String(row[reportCol])}
                                      </p>
                                    </div>
                                  )}

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Root Cause Section (if available) */}
                                    {rootCauseCol && row[rootCauseCol] && (
                                       <div className="bg-orange-50/50 p-5 rounded-xl border border-orange-100/50 h-full">
                                        <h4 className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                                          <AlertCircle size={14} /> Root Cause
                                        </h4>
                                        <p className="text-sm text-gray-800 leading-relaxed font-medium">
                                          {String(row[rootCauseCol])}
                                        </p>
                                      </div>
                                    )}

                                    {/* Action Taken Section (if available) */}
                                    {actionTakenCol && row[actionTakenCol] && (
                                       <div className="bg-green-50/50 p-5 rounded-xl border border-green-100/50 h-full">
                                        <h4 className="text-xs font-bold text-green-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                                          <CheckCircle2 size={14} /> Action Taken
                                        </h4>
                                        <p className="text-sm text-gray-800 leading-relaxed font-medium">
                                          {String(row[actionTakenCol])}
                                        </p>
                                      </div>
                                    )}
                                  </div>

                                  {/* Evidence Section (if available) - checking specifically for evidence columns */}
                                  {allColumns.filter(c => c.toLowerCase().includes('evidence') || c.toLowerCase().includes('link')).map(col => {
                                    const urls = parseEvidenceLinks(row[col]);
                                    if (urls.length === 0) return null;

                                    return (
                                      <div key={col} className="mt-4 bg-blue-50/30 p-4 rounded-xl border border-blue-100/50">
                                        <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                                          <Download size={14} /> Evidence / Links
                                        </h4>
                                        <div className="flex flex-wrap gap-4">
                                          {urls.map((url, uIdx) => (
                                            <a 
                                              key={uIdx}
                                              href={url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-blue-200 text-blue-600 text-xs font-semibold rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-all shadow-sm"
                                            >
                                              <LinkIcon size={12} />
                                              Evidence {urls.length > 1 ? uIdx + 1 : ''}
                                            </a>
                                          ))}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>

                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

       {/* ─── 3. FOOTER (PAGINATION) ────────────────────────────────────────── */}
       {/* Use simple scroll for now, or add pagination controls if needed later. 
           For "Investigative" tables, infinite scroll or "Load More" is often better, 
           but here we stick to the scrollable container. 
       */}
    </div>
  );
}
