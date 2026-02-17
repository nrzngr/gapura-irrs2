'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    FileText, Search, Filter, ChevronDown, RefreshCw,
    MapPin, AlertTriangle,
    Plane, Building2, Layers
} from 'lucide-react';
import { STATUS_CONFIG, SEVERITY_CONFIG, ReportStatus } from '@/lib/constants/report-status';
import { Report } from '@/types';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { ReportDetailModal } from '@/components/dashboard/ReportDetailModal';
import { type TimePeriod } from '@/components/dashboard/TimePeriodFilter';

export default function OSReportsPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [stationFilter, setStationFilter] = useState('all');
    const [filter, setFilter] = useState('all');
    const [severityFilter, setSeverityFilter] = useState('all');
    const [divisionFilter, setDivisionFilter] = useState('all');
    const [stations, setStations] = useState<Array<{ id: string; code: string; name: string }>>([]);
    const [search, setSearch] = useState('');
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [period, setPeriod] = useState<TimePeriod>(null);

    const fetchStations = useCallback(async () => {
        try {
            const res = await fetch('/api/master-data?type=stations');
            const data = await res.json();
            if (Array.isArray(data)) setStations(data);
            else if (data.stations) setStations(data.stations);
        } catch (error) {
            console.error('Error fetching stations:', error);
        }
    }, []);

    const fetchReports = useCallback(async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams();
            if (filter !== 'all') queryParams.append('status', filter);
            if (stationFilter !== 'all') queryParams.append('station', stationFilter);
            const res = await fetch(`/api/admin/reports?${queryParams.toString()}`);
            const data = await res.json();
            setReports(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    }, [filter, stationFilter]);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    useEffect(() => {
        fetchStations();
    }, [fetchStations]);

    const filteredReports = reports.filter(report => {
        const matchesSearch = report.title.toLowerCase().includes(search.toLowerCase()) ||
            report.location?.toLowerCase().includes(search.toLowerCase()) ||
            report.users?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
            report.stations?.name?.toLowerCase().includes(search.toLowerCase()) ||
            report.id?.toLowerCase().includes(search.toLowerCase()) ||
            report.reference_number?.toLowerCase().includes(search.toLowerCase()) ||
            report.flight_number?.toLowerCase().includes(search.toLowerCase());
        const matchesSeverity = severityFilter === 'all' || report.severity === severityFilter;
        const matchesDivision = divisionFilter === 'all' || report.target_division === divisionFilter;
        return matchesSearch && matchesSeverity && matchesDivision;
    });

    return (
        <div className="space-y-8 stagger-children pb-24">
            <DashboardHeader
                title="Semua Laporan"
                subtitle="Monitoring laporan seluruh station"
                totalReports={reports.length}
                pendingReports={reports.filter(r => r.status === 'MENUNGGU_FEEDBACK').length}
                resolvedReports={reports.filter(r => r.status === 'SELESAI').length}
                period={period}
                onPeriodChange={(p) => setPeriod(p)}
            />

            {/* Filters */}
            <div className="flex flex-col gap-4 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Cari laporan, lokasi, pelapor, nomor kasus, atau station..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="input-field"
                        style={{ paddingLeft: 'calc(var(--space-lg) + 1.5rem)' }}
                    />
                </div>
                <div className="flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-[160px]">
                        <select value={stationFilter} onChange={(e) => setStationFilter(e.target.value)} className="input-field pl-10 pr-10 cursor-pointer" style={{ background: 'var(--surface-2)' }}>
                            <option value="all">Semua Station</option>
                            {stations.map((s) => (<option key={s.id} value={s.id}>{s.code} - {s.name}</option>))}
                        </select>
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <div className="relative flex-1 min-w-[140px]">
                        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input-field pl-10 pr-10 cursor-pointer" style={{ background: 'var(--surface-2)' }}>
                            <option value="all">Semua Status</option>
                            <option value="MENUNGGU_FEEDBACK">Menunggu Feedback</option>
                            <option value="SUDAH_DIVERIFIKASI">Sudah Diverifikasi</option>
                            <option value="SELESAI">Selesai</option>
                        </select>
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <div className="relative flex-1 min-w-[140px]">
                        <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="input-field pl-10 pr-10 cursor-pointer" style={{ background: 'var(--surface-2)' }}>
                            <option value="all">Semua Severity</option>
                            <option value="high">🔴 High</option>
                            <option value="medium">🟡 Medium</option>
                            <option value="low">🟢 Low</option>
                        </select>
                        <AlertTriangle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <div className="relative flex-1 min-w-[140px]">
                        <select value={divisionFilter} onChange={(e) => setDivisionFilter(e.target.value)} className="input-field pl-10 pr-10 cursor-pointer" style={{ background: 'var(--surface-2)' }}>
                            <option value="all">Semua Divisi</option>
                            <option value="OT">🔧 OT - Teknik</option>
                            <option value="OP">✈️ OP - Operasi</option>
                            <option value="UQ">🛡️ UQ - Quality</option>
                        </select>
                        <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={fetchReports} className="btn-secondary">
                        <RefreshCw size={16} />
                        Perbarui
                    </button>
                </div>
            </div>

            {/* Reports Table */}
            <div className="card-solid animate-fade-in-up" style={{ padding: 0, overflow: 'hidden', animationDelay: '150ms' }}>
                <div
                    className="flex items-center justify-between"
                    style={{ padding: 'var(--space-lg) var(--space-xl)', borderBottom: '1px solid var(--surface-4)' }}
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl" style={{ background: 'oklch(0.55 0.14 160 / 0.12)' }}>
                            <FileText size={18} style={{ color: 'var(--brand-primary)' }} />
                        </div>
                        <div>
                            <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Daftar Laporan</h3>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{filteredReports.length} laporan</p>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-10 h-10 rounded-full border-4 animate-spin" style={{ borderColor: 'var(--surface-4)', borderTopColor: 'var(--brand-primary)' }} />
                    </div>
                ) : filteredReports.length === 0 ? (
                    <div className="py-16 text-center">
                        <FileText size={40} style={{ color: 'var(--text-muted)' }} className="mx-auto mb-4 opacity-50" />
                        <p style={{ color: 'var(--text-muted)' }}>Tidak ada laporan ditemukan</p>
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
                                            style={{
                                                borderBottom: '1px solid var(--surface-4)',
                                                borderLeft: `3px solid ${severity.color}`
                                            }}
                                            onClick={() => setSelectedReport(report)}
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
                                            <td className="py-4 px-4">
                                                <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{report.category || report.main_category || '-'}</p>
                                            </td>
                                            <td className="py-4 px-4">
                                                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{report.branch || report.station_code || '-'}</p>
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                <span
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                                                    style={{ background: status.bgColor, color: status.color }}
                                                >
                                                    <StatIcon size={12} />
                                                    {status.label}
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

            <ReportDetailModal
                report={selectedReport}
                onClose={() => setSelectedReport(null)}
                userRole="DIVISI_OS"
                onRefresh={fetchReports}
            />
        </div>
    );
}
