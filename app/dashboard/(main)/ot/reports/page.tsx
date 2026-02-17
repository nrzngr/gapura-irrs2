'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    FileText, Search, Filter, ChevronDown, RefreshCw,
    MapPin, AlertTriangle, Wrench, Clock, CheckCircle2,
    LucideIcon
} from 'lucide-react';
import { STATUS_CONFIG, SEVERITY_CONFIG, ReportStatus } from '@/lib/constants/report-status';
import { Report } from '@/types';

// Division Configuration
const DIVISION = {
    code: 'OT',
    name: 'Teknik (GSE)',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
};

export default function OTReportsPage() {
    const router = useRouter();
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [severityFilter, setSeverityFilter] = useState('all');
    const [search, setSearch] = useState('');

    const fetchReports = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/reports?target_division=OT');
            const data = await res.json();
            // Temporarily show all reports (no division filter)
            setReports(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchReports(); }, [fetchReports]);

    const filteredReports = reports.filter(report => {
        const matchesSearch = report.title.toLowerCase().includes(search.toLowerCase()) ||
            report.location?.toLowerCase().includes(search.toLowerCase()) ||
            report.users?.full_name?.toLowerCase().includes(search.toLowerCase());
        const matchesSeverity = severityFilter === 'all' || report.severity === severityFilter;
        const matchesStatus = filter === 'all' || report.status === filter;
        return matchesSearch && matchesSeverity && matchesStatus;
    });

    const stats = {
        total: reports.length,
        high: reports.filter(r => r.severity === 'high').length,
        pending: reports.filter(r => ['MENUNGGU_FEEDBACK', 'SUDAH_DIVERIFIKASI'].includes(r.status)).length,
        resolved: reports.filter(r => r.status === 'SELESAI').length,
    };

    return (
        <div className="space-y-8 stagger-children pb-24">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-in-up">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Wrench size={20} style={{ color: DIVISION.color }} />
                        <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full" style={{ background: `${DIVISION.color}20`, color: DIVISION.color }}>
                            Divisi {DIVISION.code}
                        </span>
                    </div>
                    <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Laporan {DIVISION.name}</h1>
                    <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Kelola laporan teknik dan GSE</p>
                </div>
                <button onClick={fetchReports} className="btn-secondary self-start">
                    <RefreshCw size={16} />
                    Perbarui
                </button>
            </div>

            {/* Stats */}
            <div className="bento-grid bento-4 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
                <StatCard icon={FileText} value={stats.total} label="Total Laporan" />
                <StatCard icon={AlertTriangle} value={stats.high} label="High Priority" color="#dc2626" />
                <StatCard icon={Clock} value={stats.pending} label="Menunggu" color="#f59e0b" />
                <StatCard icon={CheckCircle2} value={stats.resolved} label="Selesai" color="#10b981" />
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Cari laporan..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="input-field"
                        style={{ paddingLeft: 'calc(var(--space-lg) + 1.5rem)' }}
                    />
                </div>
                <div className="flex flex-wrap gap-3">
                    <FilterSelect value={filter} onChange={setFilter} icon={Filter} options={[
                        { value: 'all', label: 'Semua Status' },
                        { value: 'MENUNGGU_FEEDBACK', label: 'Menunggu Feedback' },
                        { value: 'SUDAH_DIVERIFIKASI', label: 'Sudah Diverifikasi' },
                        { value: 'SELESAI', label: 'Selesai' },
                    ]} />
                    <FilterSelect value={severityFilter} onChange={setSeverityFilter} icon={AlertTriangle} options={[
                        { value: 'all', label: 'Semua Severity' },
                        { value: 'high', label: '🔴 High' },
                        { value: 'medium', label: '🟡 Medium' },
                        { value: 'low', label: '🟢 Low' },
                    ]} />
                </div>
            </div>

            {/* Reports Table */}
            <div className="card-solid animate-fade-in-up" style={{ padding: 0, overflow: 'hidden', animationDelay: '150ms' }}>
                <div className="flex items-center justify-between" style={{ padding: 'var(--space-lg) var(--space-xl)', borderBottom: '1px solid var(--surface-4)' }}>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl" style={{ background: `${DIVISION.color}20` }}>
                            <Wrench size={18} style={{ color: DIVISION.color }} />
                        </div>
                        <div>
                            <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Daftar Laporan</h3>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{filteredReports.length} laporan</p>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-10 h-10 rounded-full border-4 animate-spin" style={{ borderColor: 'var(--surface-4)', borderTopColor: DIVISION.color }} />
                    </div>
                ) : filteredReports.length === 0 ? (
                    <div className="py-16 text-center">
                        <FileText size={40} style={{ color: 'var(--text-muted)' }} className="mx-auto mb-4 opacity-50" />
                        <p style={{ color: 'var(--text-muted)' }}>Tidak ada laporan untuk Divisi {DIVISION.code}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr style={{ background: 'var(--surface-3)', borderBottom: '1px solid var(--surface-4)' }}>
                                    <th className="text-left py-3 px-5 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)', width: '35%' }}>Laporan / Flight</th>
                                    <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Kategori</th>
                                    <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Cabang</th>
                                    <th className="text-center py-3 px-4 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Status</th>
                                    <th className="text-right py-3 px-5 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Tanggal Kejadian</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredReports.map((report) => {
                                    const severity = SEVERITY_CONFIG[report.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.low;
                                    const status = STATUS_CONFIG[report.status as ReportStatus] || STATUS_CONFIG.MENUNGGU_FEEDBACK;
                                    const SevIcon = severity.icon;
                                    const StatIcon = status.icon;

                                    return (
                                        <tr
                                            key={report.id}
                                            className="cursor-pointer transition-colors"
                                            style={{ borderBottom: '1px solid var(--surface-4)', borderLeft: `3px solid ${severity.color}` }}
                                            onClick={() => router.push(`/dashboard/ot/reports/${report.id}`)}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-3)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <td className="py-4 px-5">
                                                <div className="flex items-center gap-2 mb-1">
                                                    {report.primary_tag === 'CGO' ? (
                                                        <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase">CGO</span>
                                                    ) : (
                                                        <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200 uppercase">L&A</span>
                                                    )}
                                                    <span className="text-[10px] bg-[var(--surface-4)] px-1.5 py-0.5 rounded font-mono text-[var(--text-secondary)] uppercase">{report.airlines || 'Unknown Airline'}</span>
                                                </div>
                                                <p className="font-semibold truncate max-w-[280px]" style={{ color: 'var(--text-primary)' }}>{report.report || report.title || '(Tanpa Judul)'}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {report.flight_number && <span className="text-[10px] text-[var(--text-muted)] font-mono">{report.flight_number}</span>}
                                                </div>
                                            </td>
                                            <td className="py-4 px-4"><p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{report.category || report.main_category || '-'}</p></td>
                                            <td className="py-4 px-4"><p className="font-medium" style={{ color: 'var(--text-primary)' }}>{report.branch || report.station_code || '-'}</p></td>
                                            <td className="py-4 px-4 text-center">
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: status.bgColor, color: status.color }}>
                                                    <StatIcon size={12} /> {status.label}
                                                </span>
                                            </td>
                                            <td className="py-4 px-5 text-right">
                                                <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                                                    {report.date_of_event ? new Date(report.date_of_event).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                                                </p>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>


        </div>
    );
}

// --- Reusable Components ---
function StatCard({ icon: Icon, value, label, color }: { icon: LucideIcon; value: number; label: string; color?: string }) {
    return (
        <div className="card-solid flex items-center gap-4" style={{ background: color ? `${color}10` : undefined }}>
            <div className="p-3 rounded-xl" style={{ background: color ? `${color}20` : 'var(--surface-3)' }}>
                <Icon size={22} style={{ color: color || 'var(--text-primary)' }} />
            </div>
            <div>
                <p className="text-2xl font-bold" style={{ color: color || 'var(--text-primary)' }}>{value}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
            </div>
        </div>
    );
}

function FilterSelect({ value, onChange, icon: Icon, options }: { value: string; onChange: (v: string) => void; icon: LucideIcon; options: { value: string; label: string }[] }) {
    return (
        <div className="relative flex-1 min-w-[140px]">
            <select value={value} onChange={(e) => onChange(e.target.value)} className="input-field pl-10 pr-10 cursor-pointer" style={{ background: 'var(--surface-2)' }}>
                {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        </div>
    );
}


