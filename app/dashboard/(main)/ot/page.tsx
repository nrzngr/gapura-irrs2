'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Clock, CheckCircle2, FileText, RefreshCw, Loader2, 
    Wrench, ClipboardList
} from 'lucide-react';
import { STATUS_CONFIG, type ReportStatus } from '@/lib/constants/report-status';
import { NoiseTexture } from '@/components/ui/NoiseTexture';
import { cn } from '@/lib/utils';
import { Report } from '@/types';
import { ReportDetailModal } from '@/components/dashboard/ReportDetailModal';

// Division Configuration
const DIVISION_CONFIG = {
    code: 'OT',
    name: 'Teknik (GSE)',
    color: '#f59e0b', // Amber
    gradient: 'from-amber-500 via-amber-600 to-orange-600',
    bgLight: 'bg-amber-50',
    textColor: 'text-amber-600',
    borderColor: 'border-amber-200',
};

export default function OTDashboard() {
    const [reports, setReports] = useState<Report[]>([]);
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/reports');
            if (res.ok) {
                const data = await res.json();
                // Temporarily show all reports (no division filter)
                setReports(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error('Failed to fetch data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Derived stats
    const pendingCount = reports.filter(r => r.status === 'MENUNGGU_FEEDBACK').length;
    const resolvedCount = reports.filter(r => r.status === 'SELESAI').length;
    const totalCount = reports.length;

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
                <div className="relative">
                    <div className={`absolute inset-0 ${DIVISION_CONFIG.bgLight} rounded-full blur-xl animate-pulse`} />
                    <Loader2 className={`w-12 h-12 animate-spin ${DIVISION_CONFIG.textColor} relative`} />
                </div>
                <p className="text-[var(--text-secondary)] tracking-widest uppercase text-xs font-bold">
                    Loading {DIVISION_CONFIG.name}...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-24 stagger-children">
            {/* Hero Header */}
            <header className={`relative overflow-hidden rounded-3xl p-8 lg:p-10 animate-fade-in-up bg-gradient-to-br ${DIVISION_CONFIG.gradient}`}>
                <NoiseTexture />
                
                <div className="absolute -top-20 -right-20 w-60 h-60 bg-white/10 rounded-full blur-2xl" />
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-orange-300/20 rounded-full blur-2xl" />
                
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 border border-white/30">
                                <Wrench size={14} className="text-white" />
                                <span className="text-white text-xs font-bold uppercase tracking-wider">{DIVISION_CONFIG.code}</span>
                            </span>
                            <span className="text-white/70 text-sm font-mono">
                                {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-white mb-2">
                            Dashboard {DIVISION_CONFIG.name}
                        </h1>
                        <p className="text-white/80 text-sm">
                            Kelola laporan terkait peralatan GSE dan teknik
                        </p>
                    </div>

                    <button 
                        onClick={fetchData}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all bg-white/20 hover:bg-white/30 text-white border border-white/30"
                    >
                        <RefreshCw size={16} />
                        Refresh
                    </button>
                </div>

                {/* Stats Row */}
                <div className="relative z-10 grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-white/20">
                    <MiniStat icon={FileText} label="Total" value={totalCount} />
                    <MiniStat icon={Clock} label="Pending" value={pendingCount} highlight />
                    <MiniStat icon={CheckCircle2} label="Selesai" value={resolvedCount} />
                </div>
            </header>

            {/* Reports Table */}
            <div className="card-solid p-0 overflow-hidden animate-fade-in-up">
                <div className={`p-6 border-b border-[var(--surface-4)] ${DIVISION_CONFIG.bgLight}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <ClipboardList size={20} className={DIVISION_CONFIG.textColor} />
                            <div>
                                <h3 className="font-bold text-lg text-[var(--text-primary)]">Laporan Divisi {DIVISION_CONFIG.code}</h3>
                                <p className="text-xs text-[var(--text-muted)]">{totalCount} laporan total</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-[var(--surface-4)]">
                                <th className="text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] p-4">ID</th>
                                <th className="text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] p-4">Judul</th>
                                <th className="text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] p-4">Status</th>
                                <th className="text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] p-4">Stasiun</th>
                                <th className="text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] p-4">Tanggal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reports.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-[var(--text-muted)]">
                                        Tidak ada laporan untuk divisi {DIVISION_CONFIG.name}
                                    </td>
                                </tr>
                            ) : (
                                reports.map((r) => (
                                    <tr 
                                        key={r.id} 
                                        className="border-b border-[var(--surface-4)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
                                        onClick={() => setSelectedReport(r)}
                                    >
                                        <td className="p-4 font-mono text-sm">{r.id.slice(0, 8)}</td>
                                        <td className="p-4 text-sm font-medium text-[var(--text-primary)] max-w-[300px] truncate">{r.title}</td>
                                        <td className="p-4">
                                            <span
                                                className="px-2 py-1 rounded-full text-[10px] font-bold uppercase"
                                                style={{
                                                    color: STATUS_CONFIG[r.status as ReportStatus]?.color,
                                                    backgroundColor: STATUS_CONFIG[r.status as ReportStatus]?.bgColor
                                                }}
                                            >
                                                {STATUS_CONFIG[r.status as ReportStatus]?.label || r.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-[var(--text-secondary)]">{r.stations?.code || r.branch || '-'}</td>
                                        <td className="p-4 text-sm text-[var(--text-muted)]">{new Date(r.created_at).toLocaleDateString('id-ID')}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <ReportDetailModal
                isOpen={!!selectedReport}
                onClose={() => setSelectedReport(null)}
                report={selectedReport}
            />
        </div>
    );
}

function MiniStat({ icon: Icon, label, value, highlight }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: string | number; highlight?: boolean }) {
    return (
        <div className="flex items-center gap-3">
            <div className={cn("p-2.5 rounded-xl", highlight ? "bg-white/30" : "bg-white/20")}>
                <Icon size={18} className="text-white" />
            </div>
            <div>
                <p className="text-white/70 text-[10px] uppercase tracking-wider font-medium">{label}</p>
                <p className="text-white text-xl font-bold">{value}</p>
            </div>
        </div>
    );
}
