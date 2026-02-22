'use client';

import { useState, useMemo, Fragment } from 'react';
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
  rowsPerPage?: number;
  maxRows?: number;
  isLoading?: boolean;
}

type SortDir = 'asc' | 'desc';

// Helper to determine badge color based on category
const getCategoryBadgeStyle = (category: string) => {
  const cat = category.toLowerCase();
  if (cat.includes('complaint') || cat.includes('komplain')) {
    return 'bg-rose-500/10 text-rose-600 border-rose-500/20 ring-rose-500/5'; // Rose for Complaint
  }
  if (cat.includes('irregularity') || cat.includes('irreg')) {
    return 'bg-amber-500/10 text-amber-600 border-amber-500/20 ring-amber-500/5'; // Amber for Irregularity
  }
  if (cat.includes('compliment') || cat.includes('apresiasi')) {
    return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 ring-emerald-500/5'; // Emerald for Compliment
  }
  return 'bg-slate-500/10 text-slate-600 border-slate-500/20 ring-slate-500/5'; // Default Neutral
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
  
    // Split by common delimiters: space, comma, newline, semicolon
    // We filter to ensure they look like URLs
    return str.split(/[\s,\n;]+/)
      .map(s => s.trim())
      .filter(s => s.startsWith('http') || s.includes('www.'));
  };

export function InvestigativeTable({
  data,
  title,
  className = '',
  onViewDetail,
  rowsPerPage = 10,
  maxRows = 50,
  isLoading = false,
}: InvestigativeTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

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
      return !['id', 'count', 'description', 'detail', 'full_report', 'url', 'jumlah', 'total'].includes(lower) && !lower.includes('count');
    });
  }, [allColumns]);

  const prioritizedRows = useMemo(() => {
    const rows = data.rows as Record<string, unknown>[];
    if (rows.length === 0) return rows;

    const isNonEmpty = (value: unknown) => {
      const text = String(value ?? '').trim();
      return text.length > 0 && text !== '-';
    };

    const prioritized = rows.filter((row) => {
      const categoryValue = categoryCol ? String(row[categoryCol] ?? '').toLowerCase() : '';
      const isCriticalCategory = categoryValue.includes('irregularity') || categoryValue.includes('irreg') || categoryValue.includes('complaint');
      const hasInvestigativeContext = [rootCauseCol, actionTakenCol, evidenceCol]
        .filter((col): col is string => Boolean(col))
        .some((col) => isNonEmpty(row[col]));

      return isCriticalCategory || hasInvestigativeContext;
    });

    const candidateRows = prioritized.length > 0 ? prioritized : rows;
    const sortedRows = [...candidateRows];

    if (dateCol) {
      sortedRows.sort((a, b) => {
        const dateA = new Date(String(a[dateCol] ?? '')).getTime();
        const dateB = new Date(String(b[dateCol] ?? '')).getTime();
        const safeA = Number.isNaN(dateA) ? 0 : dateA;
        const safeB = Number.isNaN(dateB) ? 0 : dateB;
        return safeB - safeA;
      });
    }

    return sortedRows.slice(0, maxRows);
  }, [data.rows, categoryCol, reportCol, rootCauseCol, actionTakenCol, evidenceCol, dateCol, maxRows]);

  // ─── 2. DATA PROCESSING ─────────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    let rows = prioritizedRows as Record<string, any>[];
    
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
  }, [prioritizedRows, allColumns, searchTerm, sortCol, sortDir]);

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

  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedData = useMemo(() => {
    const start = (safeCurrentPage - 1) * rowsPerPage;
    return filteredData.slice(start, start + rowsPerPage);
  }, [filteredData, safeCurrentPage, rowsPerPage]);
  const tableViewportHeight = Math.min(560, Math.max(260, rowsPerPage * 56 + 72));


  // ─── HANDLERS ───────────────────────────────────────────────────────────────
  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
    setCurrentPage(1);
    setExpandedRowId(null);
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
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.19, 1, 0.22, 1] }}
      className={`flex flex-col h-full bg-[var(--surface-glass)] backdrop-blur-md rounded-2xl border border-[var(--surface-border)] shadow-xl overflow-hidden relative group/table ${className}`}
    >
      {/* Dynamic Glow Ornament */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-0 group-hover/table:opacity-100 transition-opacity duration-1000">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--brand-primary)]/5 blur-[100px] rounded-full" />
      </div>

      {/* ─── 1. HEADER STRIP ─────────────────────────────────────────────────── */}
      <div className="relative z-10 px-6 py-5 border-b border-[var(--surface-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--surface-0)]/50">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-bold text-[var(--surface-900)] tracking-tight font-display">{title}</h3>
        </div>

        <div className="flex flex-wrap items-center gap-4">
           {/* Summary Stats Pucks */}
           <div className="flex flex-wrap items-center gap-2">
             {stats.complaints > 0 && (
               <div className="px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-600 font-bold text-[10px] flex items-center gap-1.5 shadow-sm">
                 <AlertCircle size={12} strokeWidth={2.5} /> {stats.complaints} Cases
               </div>
             )}
             {stats.irregularities > 0 && (
               <div className="px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 font-bold text-[10px] flex items-center gap-1.5 shadow-sm">
                 <HelpCircle size={12} strokeWidth={2.5} /> {stats.irregularities} Events
               </div>
             )}
             {stats.compliments > 0 && (
               <div className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 font-bold text-[10px] flex items-center gap-1.5 shadow-sm">
                 <CheckCircle2 size={12} strokeWidth={2.5} /> {stats.compliments} Wins
               </div>
             )}
           </div>

           {/* Search & Actions */}
           <div className="flex items-center gap-2 sm:ml-4">
            <div className="relative group/search">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--surface-400)] group-focus-within/search:text-[var(--brand-primary)] transition-colors" />
              <input
                type="text"
                placeholder="Search matrix..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                  setExpandedRowId(null);
                }}
                className="pl-9 pr-4 py-2 text-xs bg-[var(--surface-50)]/50 border border-[var(--surface-border)] rounded-full focus:outline-none focus:ring-4 focus:ring-[var(--brand-primary)]/10 focus:border-[var(--brand-primary)] w-full sm:w-64 transition-all placeholder:text-[var(--surface-400)]"
              />
            </div>

            <button 
              onClick={handleExport}
              className="p-2 text-[var(--surface-500)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/5 rounded-full transition-all border border-[var(--surface-border)] hover:border-[var(--brand-primary)]/20" 
              title="Export CSV"
            >
              <Download size={16} />
            </button>

            {onViewDetail && (
              <button
                onClick={onViewDetail}
                className="flex items-center gap-2 px-4 py-2 text-[11px] font-bold text-white bg-[var(--brand-primary)] hover:brightness-110 rounded-full transition-all shadow-lg shadow-[var(--brand-primary)]/20 active:scale-95 whitespace-nowrap"
              >
                <Maximize2 size={12} strokeWidth={2.5} />
                <span>EXPAND VIEW</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── 2. TABLE BODY ────────────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar relative px-1 pb-1"
        style={{ maxHeight: `${tableViewportHeight}px` }}
      >
        <table className="w-full border-separate border-spacing-0">
          <thead className="sticky top-0 z-20 bg-[var(--surface-0)]/80 backdrop-blur-xl">
            <tr>
              <th className="px-4 py-4 text-left w-12" />
              {categoryCol && (
                <th onClick={() => handleSort(categoryCol)} className="px-4 py-4 text-left text-[10px] font-black text-[var(--surface-500)] uppercase tracking-[0.1em] cursor-pointer hover:text-[var(--brand-primary)] transition-colors group select-none">
                  <div className="flex items-center gap-2">{categoryCol} {sortCol === categoryCol && (sortDir === 'asc' ? '↑' : '↓')}</div>
                </th>
              )}
              {dateCol && (
                <th onClick={() => handleSort(dateCol)} className="px-4 py-4 text-left text-[10px] font-black text-[var(--surface-500)] uppercase tracking-[0.1em] cursor-pointer hover:text-[var(--brand-primary)] transition-colors select-none">
                  <div className="flex items-center gap-2">{dateCol} {sortCol === dateCol && (sortDir === 'asc' ? '↑' : '↓')}</div>
                </th>
              )}
              {primaryColumns.filter(c => c !== categoryCol && c !== dateCol && c !== reportCol).map(col => (
                <th key={col} onClick={() => handleSort(col)} className="px-4 py-4 text-left text-[10px] font-black text-[var(--surface-400)] uppercase tracking-[0.1em] cursor-pointer hover:text-[var(--brand-primary)] transition-colors select-none">
                  <div className="flex items-center gap-2">
                    {col.replace(/_/g, ' ')}
                    {sortCol === col && <span className="text-[var(--brand-primary)]">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                  </div>
                </th>
              ))}
              {reportCol && (
                <th className="px-4 py-4 text-left text-[10px] font-black text-[var(--surface-400)] uppercase tracking-[0.1em]">
                  PREVIEW
                </th>
              )}
            </tr>
          </thead>
          
          <tbody className="divide-y divide-[var(--surface-100)]">
            {isLoading ? (
              <tr>
                <td colSpan={100} className="px-6 py-24 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-[var(--brand-primary)]/20 blur-2xl rounded-full animate-pulse" />
                      <div className="relative w-12 h-12 border-2 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin" />
                    </div>
                    <span className="text-sm font-black text-[var(--surface-900)] tracking-widest uppercase">SYPHONING DATA...</span>
                  </div>
                </td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan={100} className="px-6 py-16 text-center text-[var(--surface-400)] text-sm font-medium italic">
                  No matches found in current query.
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => {
                const absoluteIdx = (safeCurrentPage - 1) * rowsPerPage + idx;
                const isExpanded = expandedRowId === absoluteIdx;
                const badges = categoryCol ? getCategoryBadgeStyle(String(row[categoryCol])) : '';
                const Icon = categoryCol ? getCategoryIcon(String(row[categoryCol])) : <FileText size={12} />;

                return (
                  <Fragment key={absoluteIdx}>
                    <motion.tr 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      onClick={() => toggleRow(absoluteIdx)}
                      className={`
                        group hover:bg-[var(--brand-primary)]/[0.02] cursor-pointer transition-colors duration-200
                        ${isExpanded ? 'bg-[var(--brand-primary)]/5' : ''}
                      `}
                    >
                      <td className="px-4 py-4 text-center w-12">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${isExpanded ? 'bg-[var(--brand-primary)] text-white rotate-90' : 'bg-[var(--surface-100)] text-[var(--surface-400)] group-hover:bg-[var(--surface-200)]'}`}>
                          <ChevronRight size={14} strokeWidth={3} />
                        </div>
                      </td>

                      {categoryCol && (
                        <td className="px-4 py-4">
                           <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider border shadow-sm ${badges}`}>
                             {Icon} {String(row[categoryCol]).toUpperCase()}
                           </span>
                        </td>
                      )}

                      {dateCol && (
                        <td className="px-4 py-4 text-xs font-medium text-[var(--surface-600)]">
                           <div className="flex items-center gap-2">
                             <Clock size={12} className="text-[var(--surface-300)]" />
                             {formatDisplayValue(row[dateCol], dateCol)}
                           </div>
                        </td>
                      )}

                      {primaryColumns.filter(c => c !== categoryCol && c !== dateCol && c !== reportCol).map(col => {
                        const isEvidence = evidenceCol === col || col.toLowerCase().includes('evidence') || col.toLowerCase() === 'link';
                        
                        if (isEvidence) {
                          const urls = parseEvidenceLinks(row[col]);
                          return (
                            <td key={col} className="px-4 py-4 text-xs font-semibold text-[var(--surface-700)]">
                              {urls.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {urls.map((url, i) => (
                                    <a 
                                      key={i} 
                                      href={url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 hover:underline transition-colors text-[10px] font-bold uppercase tracking-wider border border-blue-100"
                                    >
                                      <LinkIcon size={10} /> Link {urls.length > 1 ? i + 1 : ''}
                                    </a>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[var(--surface-400)]">-</span>
                              )}
                            </td>
                          );
                        }

                        return (
                          <td key={col} className="px-4 py-4 text-xs font-semibold text-[var(--surface-700)]">
                            <span dangerouslySetInnerHTML={{ __html: formatDisplayValue(row[col], col) }} />
                          </td>
                        );
                      })}

                      {reportCol && (
                        <td className="px-4 py-4 text-xs text-[var(--surface-500)] max-w-xs">
                          <div className="truncate font-normal italic opacity-60">
                            {String(row[reportCol])}
                          </div>
                        </td>
                      )}
                    </motion.tr>

                    {/* ─── EXPANDED DRAWER ─────────────────────────────────── */}
                    <AnimatePresence>
                      {isExpanded && (
                        <tr key={`${absoluteIdx}-expanded`}>
                          <td colSpan={100} className="p-0 border-0">
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: [0.19, 1, 0.22, 1] }}
                              className="overflow-hidden bg-[var(--surface-50)]/30 border-y border-[var(--surface-border)]"
                            >
                              <div className="p-8 lg:p-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
                                <div className="lg:col-span-4 space-y-8">
                                  <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-[var(--surface-400)] uppercase tracking-widest flex items-center gap-2">
                                       <FileText size={14} className="text-[var(--brand-primary)]" /> LOGISTICS METADATA
                                    </h4>
                                    <div className="grid grid-cols-2 gap-6 bg-white/50 p-6 rounded-2xl border border-[var(--surface-border)] shadow-sm">
                                      {allColumns.map(col => {
                                        if ([reportCol, rootCauseCol, actionTakenCol, 'evidence'].includes(col)) return null;
                                        return (
                                          <div key={col} className="space-y-1">
                                             <div className="text-[9px] font-black text-[var(--surface-400)] uppercase tracking-tight">{col.replace(/_/g, ' ')}</div>
                                             <div className="text-xs font-bold text-[var(--surface-900)]">{String(row[col] || '-')}</div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>

                                <div className="lg:col-span-8 space-y-8">
                                  {reportCol && (
                                    <div className="space-y-3">
                                      <h4 className="text-[10px] font-black text-[var(--brand-primary)] uppercase tracking-widest flex items-center gap-2">
                                        <FileText size={14} /> NARRATIVE RECORD
                                      </h4>
                                      <div className="bg-white p-6 rounded-2xl border border-[var(--surface-border)] shadow-sm text-sm text-[var(--surface-700)] leading-relaxed italic font-medium">
                                        "{String(row[reportCol])}"
                                      </div>
                                    </div>
                                  )}

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {rootCauseCol && row[rootCauseCol] && (
                                       <div className="space-y-3">
                                        <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
                                          <AlertCircle size={14} /> ROOT CAUSE ANALYSIS
                                        </h4>
                                        <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-500/10 text-xs font-bold text-amber-900 leading-relaxed ring-1 ring-amber-500/5">
                                          {String(row[rootCauseCol])}
                                        </div>
                                      </div>
                                    )}

                                    {actionTakenCol && row[actionTakenCol] && (
                                       <div className="space-y-3">
                                        <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                                          <CheckCircle2 size={14} /> REMEDIATION STEPS
                                        </h4>
                                        <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-500/10 text-xs font-bold text-emerald-900 leading-relaxed ring-1 ring-emerald-500/5">
                                          {String(row[actionTakenCol])}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Evidence Links */}
                                  {allColumns.filter(c => c.toLowerCase().includes('evidence') || c.toLowerCase().includes('link')).map(col => {
                                    const urls = parseEvidenceLinks(row[col]);
                                    if (urls.length === 0) return null;
                                    return (
                                      <div key={col} className="space-y-3">
                                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                                          <LinkIcon size={14} /> ATTACHED EVIDENCE
                                        </h4>
                                        <div className="flex flex-wrap gap-3">
                                          {urls.map((url, uIdx) => (
                                            <a key={uIdx} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-blue-500/10 text-blue-600 text-[10px] font-black rounded-full hover:bg-blue-500 hover:text-white transition-all shadow-sm ring-1 ring-blue-500/5">
                                              <Download size={12} /> EVIDENCE {urls.length > 1 ? uIdx + 1 : ''}
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
      <div className="relative z-10 px-6 py-4 border-t border-[var(--surface-border)] bg-[var(--surface-0)]/80 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-[10px] font-bold text-[var(--surface-400)] uppercase tracking-widest">
          {filteredData.length > 0
            ? `SYNCING ${((safeCurrentPage - 1) * rowsPerPage + 1)} — ${Math.min(safeCurrentPage * rowsPerPage, filteredData.length)} / ${filteredData.length} RECORDS`
            : 'NULL SET'}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={safeCurrentPage === 1}
            className="px-3 py-1.5 text-[10px] font-black border border-[var(--surface-border)] rounded-full disabled:opacity-20 hover:bg-[var(--surface-50)] transition-all uppercase tracking-tighter"
          >
            Start
          </button>
          <div className="flex items-center gap-1 bg-[var(--surface-50)] px-3 py-1.5 rounded-full border border-[var(--surface-border)]">
            <span className="text-[10px] font-black text-[var(--brand-primary)]">{safeCurrentPage}</span>
            <span className="text-[10px] font-black text-[var(--surface-300)]">/</span>
            <span className="text-[10px] font-black text-[var(--surface-400)]">{totalPages}</span>
          </div>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, safeCurrentPage + 1))}
            disabled={safeCurrentPage === totalPages}
            className="px-3 py-1.5 text-[10px] font-black border border-[var(--surface-border)] rounded-full disabled:opacity-20 hover:bg-[var(--surface-50)] transition-all uppercase tracking-tighter"
          >
            Next Phase
          </button>
        </div>
      </div>
    </motion.div>
  );
}
