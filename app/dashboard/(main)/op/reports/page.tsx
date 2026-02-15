'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    FileText, Search, Filter, ChevronDown, RefreshCw, Eye, X,
    MapPin, AlertTriangle, Plane, Clock, 
    CheckCircle2, LucideIcon
} from 'lucide-react';
import { STATUS_CONFIG, SEVERITY_CONFIG, ReportStatus } from '@/lib/constants/report-status';
import { Report } from '@/types';

const DIVISION = { code: 'OP', name: 'Operasi', color: '#06b6d4' };

export default function OPReportsPage() {
    const router = useRouter();
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [severityFilter, setSeverityFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/reports');
            const data = await res.json();
            // Temporarily show all reports (no division filter)
            setReports(Array.isArray(data) ? data : []);
        } catch (error) { console.error('Error:', error); } 
        finally { setLoading(false); }
    };

    useEffect(() => { fetchReports(); }, []);

    const filteredReports = reports.filter(r => {
        const matchesSearch = r.title.toLowerCase().includes(search.toLowerCase()) || r.location?.toLowerCase().includes(search.toLowerCase());
        const matchesSeverity = severityFilter === 'all' || r.severity === severityFilter;
        const matchesStatus = filter === 'all' || r.status === filter;
        return matchesSearch && matchesSeverity && matchesStatus;
    });

    const stats = { total: reports.length, high: reports.filter(r => r.severity === 'high').length, pending: reports.filter(r => ['MENUNGGU_FEEDBACK', 'SUDAH_DIVERIFIKASI'].includes(r.status)).length, resolved: reports.filter(r => r.status === 'SELESAI').length };

    return (
        <div className="space-y-8 stagger-children pb-24">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-in-up">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Plane size={20} style={{ color: DIVISION.color }} />
                        <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full" style={{ background: `${DIVISION.color}20`, color: DIVISION.color }}>Divisi {DIVISION.code}</span>
                    </div>
                    <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Laporan {DIVISION.name}</h1>
                    <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Kelola laporan operasional penerbangan</p>
                </div>
                <button onClick={fetchReports} className="btn-secondary self-start"><RefreshCw size={16} /> Perbarui</button>
            </div>

            <div className="bento-grid bento-4 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
                <StatCard icon={FileText} value={stats.total} label="Total" />
                <StatCard icon={AlertTriangle} value={stats.high} label="High" color="#dc2626" />
                <StatCard icon={Clock} value={stats.pending} label="Pending" color="#f59e0b" />
                <StatCard icon={CheckCircle2} value={stats.resolved} label="Selesai" color="#10b981" />
            </div>

            <div className="flex flex-col gap-4 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                    <input type="text" placeholder="Cari laporan..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field" style={{ paddingLeft: 'calc(var(--space-lg) + 1.5rem)' }} />
                </div>
                <div className="flex flex-wrap gap-3">
                    <FilterSelect value={filter} onChange={setFilter} icon={Filter} options={[{ value: 'all', label: 'Semua Status' }, { value: 'MENUNGGU_FEEDBACK', label: 'Menunggu Feedback' }, { value: 'SUDAH_DIVERIFIKASI', label: 'Diverifikasi' }, { value: 'SELESAI', label: 'Selesai' }]} />
                    <FilterSelect value={severityFilter} onChange={setSeverityFilter} icon={AlertTriangle} options={[{ value: 'all', label: 'Semua' }, { value: 'high', label: '🔴 High' }, { value: 'medium', label: '🟡 Medium' }, { value: 'low', label: '🟢 Low' }]} />
                </div>
            </div>

            <div className="card-solid animate-fade-in-up" style={{ padding: 0, overflow: 'hidden', animationDelay: '150ms' }}>
                <div className="flex items-center justify-between" style={{ padding: 'var(--space-lg) var(--space-xl)', borderBottom: '1px solid var(--surface-4)' }}>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl" style={{ background: `${DIVISION.color}20` }}><Plane size={18} style={{ color: DIVISION.color }} /></div>
                        <div><h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Daftar Laporan</h3><p className="text-xs" style={{ color: 'var(--text-muted)' }}>{filteredReports.length} laporan</p></div>
                    </div>
                </div>

                {loading ? (<div className="flex items-center justify-center py-16"><div className="w-10 h-10 rounded-full border-4 animate-spin" style={{ borderColor: 'var(--surface-4)', borderTopColor: DIVISION.color }} /></div>
                ) : filteredReports.length === 0 ? (<div className="py-16 text-center"><FileText size={40} className="mx-auto mb-4 opacity-50" style={{ color: 'var(--text-muted)' }} /><p style={{ color: 'var(--text-muted)' }}>Tidak ada laporan</p></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr style={{ background: 'var(--surface-3)', borderBottom: '1px solid var(--surface-4)' }}>
                                <th className="text-left py-3 px-5 font-semibold text-xs uppercase" style={{ color: 'var(--text-muted)', width: '45%' }}>Laporan</th>
                                <th className="text-left py-3 px-4 font-semibold text-xs uppercase" style={{ color: 'var(--text-muted)' }}>Pelapor</th>
                                <th className="text-center py-3 px-4 font-semibold text-xs uppercase" style={{ color: 'var(--text-muted)' }}>Status</th>
                                <th className="text-right py-3 px-5 font-semibold text-xs uppercase" style={{ color: 'var(--text-muted)' }}>Tanggal</th>
                            </tr></thead>
                            <tbody>
                                {filteredReports.map((r) => {
                                    const sev = SEVERITY_CONFIG[r.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.low;
                                    const stat = STATUS_CONFIG[r.status as ReportStatus] || STATUS_CONFIG.MENUNGGU_FEEDBACK;
                                    const StatIcon = stat.icon;
                                    return (
                                        <tr key={r.id} className="cursor-pointer transition-colors" style={{ borderBottom: '1px solid var(--surface-4)', borderLeft: `3px solid ${sev.color}` }} onClick={() => router.push(`/dashboard/op/reports/${r.id}`)} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-3)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                            <td className="py-4 px-5"><p className="font-semibold truncate max-w-[280px]" style={{ color: 'var(--text-primary)' }}>{r.title}</p>{r.location && <p className="text-xs flex items-center gap-1 mt-1" style={{ color: 'var(--text-muted)' }}><MapPin size={10} /> {r.location}</p>}</td>
                                            <td className="py-4 px-4"><p className="font-medium" style={{ color: 'var(--text-primary)' }}>{r.users?.full_name || '-'}</p></td>
                                            <td className="py-4 px-4 text-center"><span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: stat.bgColor, color: stat.color }}><StatIcon size={12} /> {stat.label}</span></td>
                                            <td className="py-4 px-5 text-right"><p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{new Date(r.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {selectedReport && <QuickModal report={selectedReport} onClose={() => setSelectedReport(null)} color={DIVISION.color} path={`/dashboard/op/reports/${selectedReport.id}`} />}
        </div>
    );
}

function StatCard({ icon: Icon, value, label, color }: { icon: LucideIcon; value: number; label: string; color?: string }) {
    return (<div className="card-solid flex items-center gap-4" style={{ background: color ? `${color}10` : undefined }}><div className="p-3 rounded-xl" style={{ background: color ? `${color}20` : 'var(--surface-3)' }}><Icon size={22} style={{ color: color || 'var(--text-primary)' }} /></div><div><p className="text-2xl font-bold" style={{ color: color || 'var(--text-primary)' }}>{value}</p><p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p></div></div>);
}

function FilterSelect({ value, onChange, icon: Icon, options }: { value: string; onChange: (v: string) => void; icon: LucideIcon; options: { value: string; label: string }[] }) {
    return (<div className="relative flex-1 min-w-[140px]"><select value={value} onChange={(e) => onChange(e.target.value)} className="input-field pl-10 pr-10 cursor-pointer" style={{ background: 'var(--surface-2)' }}>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select><Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} /><ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} /></div>);
}

function QuickModal({ report, onClose, color, path }: { report: Report; onClose: () => void; color: string; path: string }) {
    const status = STATUS_CONFIG[report.status as ReportStatus] || STATUS_CONFIG.MENUNGGU_FEEDBACK;
    const StatusIcon = status.icon;
    return (<><div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm" onClick={onClose} /><div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-none"><div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden animate-scale-in pointer-events-auto"><div className="p-6 text-white" style={{ background: color }}><button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-xl"><X size={20} /></button><h2 className="text-xl font-bold">{report.title}</h2></div><div className="p-6 space-y-4 overflow-y-auto max-h-[50vh]"><span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold" style={{ background: status.bgColor, color: status.color }}><StatusIcon size={16} /> {status.label}</span><p className="text-gray-700">{report.description}</p></div><div className="p-5 flex justify-end gap-3 bg-gray-50 border-t"><button onClick={onClose} className="px-6 py-2.5 rounded-xl text-gray-600 font-semibold hover:bg-gray-100">Tutup</button><button onClick={() => window.location.href = path} className="px-6 py-2.5 rounded-xl text-white font-semibold flex items-center gap-2" style={{ background: color }}><Eye size={18} /> Detail</button></div></div></div></>);
}
