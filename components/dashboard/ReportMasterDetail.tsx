'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Filter, MapPin, AlertCircle } from 'lucide-react';
import { ReportDetailView } from './ReportDetailView';
import { cn } from '@/lib/utils';
import { STATUS_CONFIG, type ReportStatus, SEVERITY_CONFIG } from '@/lib/constants/report-status';
import { type Report } from '@/types';

interface ReportMasterDetailProps {
    title: string;
    reports: Report[];
    loading: boolean;
    onStatusUpdate?: (id: string, status: string) => Promise<void>;
    onRefresh?: () => void;
    userRole?: string;
}

export function ReportMasterDetail({ title, reports, loading, onStatusUpdate, onRefresh, userRole = 'PARTNER_ADMIN' }: ReportMasterDetailProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const selectedId = searchParams.get('id');
    
    // Derived state
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<ReportStatus | 'ALL'>('ALL');

    // Filter reports
    const filteredReports = reports.filter(r => {
        const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              (r.flight_number && r.flight_number.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesFilter = activeFilter === 'ALL' || r.status === activeFilter;
        return matchesSearch && matchesFilter;
    });

    const selectedReport = reports.find(r => r.id === selectedId) || null;

    const handleSelectReport = (id: string) => {
        const params = new URLSearchParams(searchParams);
        params.set('id', id);
        router.replace(`?${params.toString()}`);
    };

    return (
        <div className="flex h-[calc(100vh-8rem)] gap-4"> {/* Added gap for separation */}
            {/* List Column (Left) */}
            <div className="w-[420px] flex flex-col rounded-2xl border border-white/20 bg-white/40 backdrop-blur-xl shadow-xl overflow-hidden">
                {/* Header & Filter */}
                <div className="p-6 border-b border-white/10 space-y-5 bg-white/40">
                    <h1 className="text-2xl font-display font-bold tracking-tight text-[var(--text-primary)]">
                        {title}
                    </h1>
                    
                    {/* Search Field */}
                    <div className="relative group">
                        <div className="absolute inset-0 bg-white/50 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--brand-primary)] transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Cari laporan..."
                            className="w-full bg-white/60 border border-white/40 rounded-xl pl-12 pr-4 h-12 text-sm font-medium placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)]/50 transition-all shadow-sm focus:shadow-md"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Filter Pills */}
                    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar mask-gradient-right">
                        <button
                            onClick={() => setActiveFilter('ALL')}
                            className={cn(
                                "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 ease-[var(--spring-snappy)]",
                                activeFilter === 'ALL' 
                                    ? "bg-[var(--text-primary)] text-white shadow-lg scale-105" 
                                    : "bg-white/50 text-[var(--text-secondary)] hover:bg-white hover:shadow-md hover:-translate-y-0.5"
                            )}
                        >
                            Semua
                        </button>
                        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                            <button
                                key={key}
                                onClick={() => setActiveFilter(key as ReportStatus)}
                                className={cn(
                                    "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 ease-[var(--spring-snappy)] border",
                                    activeFilter === key 
                                        ? "bg-white shadow-lg scale-105 border-transparent" 
                                        : "bg-transparent border-transparent text-[var(--text-secondary)] hover:bg-white/60 hover:shadow-sm"
                                )}
                                style={activeFilter === key ? { color: config.color } : undefined}
                            >
                                {config.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Report List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {loading ? (
                        <div className="p-8 text-center text-[var(--text-muted)] flex flex-col items-center justify-center h-full">
                            <div className="animate-spin w-8 h-8 border-2 border-[var(--brand-primary)] border-t-transparent rounded-full mb-4" />
                            <p className="text-sm font-medium animate-pulse">Memuat data laporan...</p>
                        </div>
                    ) : filteredReports.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center p-8 text-center opacity-60">
                             <div className="w-16 h-16 bg-[var(--surface-3)] rounded-full flex items-center justify-center mb-4">
                                <Filter size={24} className="text-[var(--text-muted)]" />
                             </div>
                            <p className="font-medium text-[var(--text-primary)]">Tidak ada laporan</p>
                            <p className="text-xs text-[var(--text-secondary)] mt-1">Coba sesuaikan filter pencarian Anda</p>
                        </div>
                    ) : (
                        <div className="space-y-2 pb-4">
                            {filteredReports.map((report) => {
                                const isSelected = report.id === selectedId;
                                const statusCfg = STATUS_CONFIG[report.status as ReportStatus];
                                // Fallback to medium if severity/priority not found, check both fields
                                const severityKey = report.severity || report.priority || 'medium';
                                const severityCfg = SEVERITY_CONFIG[severityKey as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.medium;
                                
                                return (
                                    <div
                                        key={report.id}
                                        onClick={() => handleSelectReport(report.id)}
                                        className={cn(
                                            "p-5 rounded-xl cursor-pointer transition-all duration-300 relative group border",
                                            isSelected 
                                                ? "bg-white border-[var(--brand-primary)]/20 shadow-[0_8px_30px_-4px_rgba(0,0,0,0.05)] scale-[1.02] z-10"
                                                : "bg-white/40 border-transparent hover:bg-white/80 hover:shadow-lg hover:scale-[1.01] hover:border-white/50"
                                        )}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <span 
                                                className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg uppercase tracking-wider backdrop-blur-md"
                                                style={{ 
                                                    background: statusCfg?.bgColor || '#eee', 
                                                    color: statusCfg?.color || '#666',
                                                    border: `1px solid ${statusCfg?.color}10`
                                                }}
                                            >
                                                {statusCfg?.label || report.status}
                                            </span>
                                            <span className="text-[10px] font-medium text-[var(--text-muted)] bg-white/50 px-2 py-0.5 rounded-full">
                                                {new Date(report.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                            </span>
                                        </div>
                                        
                                        <h3 className={cn(
                                            "font-bold text-sm mb-2 line-clamp-2 transition-colors", 
                                            isSelected ? "text-[var(--brand-primary)]" : "group-hover:text-[var(--text-primary)] text-[var(--text-primary)]/80"
                                        )}>
                                            {report.title}
                                        </h3>
                                        
                                        <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-4 leading-relaxed opacity-80">
                                            {report.description}
                                        </p>

                                        <div className="flex items-center gap-4 text-xs">
                                            {report.stations && (
                                                <span className="flex items-center gap-1.5 text-[var(--text-muted)] font-medium">
                                                    <MapPin size={12} className="opacity-70" />
                                                    {report.stations.code}
                                                </span>
                                            )}
                                            {(report.severity || report.priority) && (
                                                <span 
                                                    className="flex items-center gap-1.5 font-bold"
                                                    style={{ color: severityCfg?.color }}
                                                >
                                                    <AlertCircle size={12} />
                                                    {severityCfg?.label}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Detail Column (Right) */}
            <div className="flex-1 rounded-2xl overflow-hidden border border-white/20 bg-white/40 backdrop-blur-xl shadow-xl h-full">
                <ReportDetailView 
                    report={selectedReport} 
                    onUpdateStatus={onStatusUpdate}
                    onRefresh={onRefresh}
                    isModal={false}
                    userRole={userRole}
                />
            </div>
        </div>
    );
}
