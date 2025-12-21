'use client';

import { useEffect, useState } from 'react';
import {
    FileText, Search, Filter, ChevronDown, RefreshCw, Eye, X, Check,
    MapPin, Calendar, User, AlertTriangle, AlertCircle, Shield,
    Plane, Clock, Building2, Tag, CheckCircle2, Image
} from 'lucide-react';
import { STATUS_CONFIG, SEVERITY_CONFIG, ReportStatus } from '@/lib/constants/report-status';
import { Report } from '@/types';

export default function OSReportsPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [stationFilter, setStationFilter] = useState('all');
    const [filter, setFilter] = useState('all');
    const [severityFilter, setSeverityFilter] = useState('all');
    const [stations, setStations] = useState<Array<{ id: string; code: string; name: string }>>([]);
    const [search, setSearch] = useState('');
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);

    const fetchStations = async () => {
        try {
            const res = await fetch('/api/master-data?type=stations');
            const data = await res.json();
            if (Array.isArray(data)) setStations(data);
            else if (data.stations) setStations(data.stations);
        } catch (error) {
            console.error('Error fetching stations:', error);
        }
    };

    const fetchReports = async () => {
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
    };

    useEffect(() => { fetchReports(); }, [filter, stationFilter]);
    useEffect(() => { fetchStations(); }, []);

    // OS Admin is generally Read-Only for reports status, unless specified otherwise.
    // Assuming identical to OSC Lead/Admin but maybe without "Validate" buttons if strict.
    // For now, I will keep it read-only mostly, or just view.
    // User requested "menu semua laporan bisa di akses".

    const filteredReports = reports.filter(report => {
        const matchesSearch = report.title.toLowerCase().includes(search.toLowerCase()) ||
            report.location?.toLowerCase().includes(search.toLowerCase()) ||
            report.users?.full_name.toLowerCase().includes(search.toLowerCase()) ||
            report.stations?.name.toLowerCase().includes(search.toLowerCase());
        const matchesSeverity = severityFilter === 'all' || report.severity === severityFilter;
        return matchesSearch && matchesSeverity;
    });

    const stats = {
        total: reports.length,
        high: reports.filter(r => r.severity === 'high').length,
        pending: reports.filter(r => ['OPEN', 'ACKNOWLEDGED', 'ON_PROGRESS'].includes(r.status)).length,
        resolved: reports.filter(r => r.status === 'CLOSED').length,
    };

    return (
        <div className="space-y-8 stagger-children pb-24">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-in-up">
                <div>
                    <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Semua Laporan</h1>
                    <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Monitoring laporan seluruh station</p>
                </div>
                <button onClick={fetchReports} className="btn-secondary self-start">
                    <RefreshCw size={16} />
                    Perbarui
                </button>
            </div>

            {/* Stats — Bento Grid */}
             <div className="bento-grid bento-4 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
                <div className="card-solid flex items-center gap-4">
                    <div className="p-3 rounded-xl" style={{ background: 'var(--surface-3)' }}>
                        <FileText size={22} style={{ color: 'var(--text-primary)' }} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.total}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Laporan</p>
                    </div>
                </div>
                <div className="card-solid flex items-center gap-4" style={{ background: 'oklch(0.55 0.18 25 / 0.08)' }}>
                    <div className="p-3 rounded-xl" style={{ background: 'oklch(0.55 0.18 25 / 0.15)' }}>
                        <AlertTriangle size={22} style={{ color: 'oklch(0.50 0.16 25)' }} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold" style={{ color: 'oklch(0.45 0.16 25)' }}>{stats.high}</p>
                        <p className="text-xs" style={{ color: 'oklch(0.50 0.14 25)' }}>High Priority</p>
                    </div>
                </div>
                <div className="card-solid flex items-center gap-4" style={{ background: 'oklch(0.70 0.14 75 / 0.08)' }}>
                    <div className="p-3 rounded-xl" style={{ background: 'oklch(0.70 0.14 75 / 0.15)' }}>
                        <Clock size={22} style={{ color: 'oklch(0.55 0.14 75)' }} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold" style={{ color: 'oklch(0.45 0.14 75)' }}>{stats.pending}</p>
                        <p className="text-xs" style={{ color: 'oklch(0.55 0.12 75)' }}>Menunggu</p>
                    </div>
                </div>
                <div className="card-solid flex items-center gap-4" style={{ background: 'oklch(0.55 0.14 160 / 0.08)' }}>
                    <div className="p-3 rounded-xl" style={{ background: 'oklch(0.55 0.14 160 / 0.15)' }}>
                        <CheckCircle2 size={22} style={{ color: 'oklch(0.50 0.14 160)' }} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold" style={{ color: 'oklch(0.40 0.14 160)' }}>{stats.resolved}</p>
                        <p className="text-xs" style={{ color: 'oklch(0.50 0.12 160)' }}>Selesai</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Cari laporan, lokasi, pelapor, atau station..."
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
                            <option value="OPEN">Menunggu ACC</option>
                            <option value="ACKNOWLEDGED">Di-ACC</option>
                            <option value="ON_PROGRESS">Dikerjakan</option>
                            <option value="WAITING_VALIDATION">Menunggu Validasi</option>
                            <option value="CLOSED">Selesai</option>
                            <option value="RETURNED">Dikembalikan</option>
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
                                    <th className="text-left py-3 px-5 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)', width: '45%' }}>Laporan</th>
                                    <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Pelapor</th>
                                    <th className="text-center py-3 px-4 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Severity</th>
                                    <th className="text-center py-3 px-4 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Status</th>
                                    <th className="text-right py-3 px-5 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Tanggal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredReports.map((report, idx) => {
                                    const severity = SEVERITY_CONFIG[report.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.low;
                                    const status = STATUS_CONFIG[report.status as ReportStatus] || STATUS_CONFIG.OPEN;
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
                                                <div className="flex items-start gap-3">
                                                    <div className="p-2 rounded-lg flex-shrink-0" style={{ background: severity.bg }}>
                                                        <SevIcon size={16} style={{ color: severity.color }} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase" style={{ background: 'var(--surface-4)', color: 'var(--text-secondary)' }}>
                                                                {report.stations?.code || 'N/A'}
                                                            </span>
                                                            {report.flight_number && (
                                                                <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: 'oklch(0.50 0.12 250)' }}>
                                                                    <Plane size={10} />
                                                                    {report.flight_number}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="font-semibold truncate max-w-[280px]" style={{ color: 'var(--text-primary)' }}>{report.title}</p>
                                                        {report.location && (
                                                            <p className="text-xs flex items-center gap-1 mt-1 truncate max-w-[250px]" style={{ color: 'var(--text-muted)' }}>
                                                                <MapPin size={10} />
                                                                {report.location}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <p className="font-medium truncate max-w-[120px]" style={{ color: 'var(--text-primary)' }}>{report.users?.full_name || '-'}</p>
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                <span 
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-white"
                                                    style={{ background: severity.color }}
                                                >
                                                    {severity.label}
                                                </span>
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
                                                <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                                                    {new Date(report.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                </p>
                                                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                                    {new Date(report.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
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

            {selectedReport && (
                <>
                    <div 
                        className="fixed top-0 left-0 right-0 bottom-0 z-[9999]"
                        style={{ 
                            background: 'rgba(0, 0, 0, 0.7)', 
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)'
                        }} 
                        onClick={() => setSelectedReport(null)}
                    />
                    
                    <div 
                        className="fixed top-0 left-0 right-0 bottom-0 z-[10000] flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div 
                            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-scale-in pointer-events-auto"
                            style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div 
                                className="p-6 text-white relative"
                                style={{
                                    background: selectedReport.severity === 'high' 
                                        ? 'linear-gradient(135deg, #dc2626, #b91c1c)' 
                                        : selectedReport.severity === 'medium' 
                                        ? 'linear-gradient(135deg, #f59e0b, #d97706)' 
                                        : 'linear-gradient(135deg, #10b981, #059669)'
                                }}
                            >
                                <button 
                                    onClick={() => setSelectedReport(null)} 
                                    className="absolute top-4 right-4 p-2.5 hover:bg-white/20 rounded-xl transition-all duration-200"
                                >
                                    <X size={20} />
                                </button>
                                <div className="flex items-start gap-4">
                                    <div className="p-3.5 bg-white/20 rounded-2xl backdrop-blur-sm">
                                        {(() => { 
                                            const Icon = SEVERITY_CONFIG[selectedReport.severity as keyof typeof SEVERITY_CONFIG]?.icon || Shield; 
                                            return <Icon size={28} />; 
                                        })()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                            <span className="text-xs font-bold bg-white/25 px-2.5 py-1 rounded-lg backdrop-blur-sm">
                                                {selectedReport.stations?.code || 'N/A'} — {selectedReport.stations?.name || 'Unknown'}
                                            </span>
                                            <span className="text-xs font-bold bg-white/25 px-2.5 py-1 rounded-full uppercase tracking-wider">
                                                {SEVERITY_CONFIG[selectedReport.severity as keyof typeof SEVERITY_CONFIG]?.label || 'Unknown'} Priority
                                            </span>
                                        </div>
                                        <h2 className="text-xl font-bold leading-tight">{selectedReport.title}</h2>
                                        <p className="text-sm text-white/70 mt-1">ID: {selectedReport.id.slice(0, 8)}...</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 space-y-6 overflow-y-auto max-h-[55vh]" style={{ background: '#fafafa' }}>
                                <div className="bg-white p-5 rounded-xl border border-gray-100">
                                    <h4 className="text-xs font-bold uppercase tracking-wider mb-4 text-gray-400">Status & Aksi</h4>
                                    
                                    <div className="flex items-center gap-2 mb-4">
                                        {(() => {
                                            const cfg = STATUS_CONFIG[selectedReport.status as ReportStatus] || STATUS_CONFIG.OPEN;
                                            const Icon = cfg.icon;
                                            return (
                                                <span 
                                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
                                                    style={{ background: cfg.bgColor, color: cfg.color }}
                                                >
                                                    <Icon size={16} />
                                                    {cfg.label}
                                                </span>
                                            );
                                        })()}
                                        <span className="text-xs text-gray-400">{STATUS_CONFIG[selectedReport.status as ReportStatus]?.description}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white p-4 rounded-xl border border-gray-100">
                                        <div className="flex items-center gap-2 mb-2">
                                            <MapPin size={14} className="text-gray-400" />
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Lokasi</p>
                                        </div>
                                        <p className="font-semibold text-gray-900">{selectedReport.location || 'Tidak tersedia'}</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl border border-gray-100">
                                        <div className="flex items-center gap-2 mb-2">
                                            <User size={14} className="text-gray-400" />
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Pelapor</p>
                                        </div>
                                        <p className="font-semibold text-gray-900">{selectedReport.users?.full_name || '-'}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{selectedReport.users?.email}</p>
                                    </div>
                                    {selectedReport.incident_types && (
                                        <div className="bg-white p-4 rounded-xl border border-gray-100">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Tag size={14} className="text-gray-400" />
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Tipe Insiden</p>
                                            </div>
                                            <p className="font-semibold text-gray-900">{selectedReport.incident_types.name}</p>
                                        </div>
                                    )}
                                    <div className="bg-white p-4 rounded-xl border border-gray-100">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Calendar size={14} className="text-gray-400" />
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Waktu Laporan</p>
                                        </div>
                                        <p className="font-semibold text-gray-900">
                                            {new Date(selectedReport.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {new Date(selectedReport.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                                        </p>
                                    </div>
                                </div>

                                {(selectedReport.flight_number || selectedReport.aircraft_reg || selectedReport.gse_number) && (
                                    <div className="bg-white p-5 rounded-xl border border-gray-100">
                                        <h4 className="text-xs font-bold uppercase tracking-wider mb-4 text-gray-400">Konteks Penerbangan</h4>
                                        <div className="flex flex-wrap gap-3">
                                            {selectedReport.flight_number && (
                                                <div className="px-4 py-3 rounded-xl bg-blue-50 border border-blue-100">
                                                    <p className="text-[10px] font-bold uppercase text-blue-500">No. Penerbangan</p>
                                                    <p className="font-bold text-blue-700 flex items-center gap-2 mt-1">
                                                        <Plane size={16} />
                                                        {selectedReport.flight_number}
                                                    </p>
                                                </div>
                                            )}
                                            {selectedReport.aircraft_reg && (
                                                <div className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-100">
                                                    <p className="text-[10px] font-bold uppercase text-gray-500">Registrasi Pesawat</p>
                                                    <p className="font-bold text-gray-900 mt-1">{selectedReport.aircraft_reg}</p>
                                                </div>
                                            )}
                                            {selectedReport.gse_number && (
                                                <div className="px-4 py-3 rounded-xl bg-purple-50 border border-purple-100">
                                                    <p className="text-[10px] font-bold uppercase text-purple-500">No. GSE</p>
                                                    <p className="font-bold text-purple-700 mt-1">{selectedReport.gse_number}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="bg-white p-5 rounded-xl border border-gray-100">
                                    <h4 className="text-xs font-bold uppercase tracking-wider mb-3 text-gray-400">Deskripsi Kejadian</h4>
                                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedReport.description}</p>
                                </div>

                                {selectedReport.evidence_url && (
                                    <div className="bg-white p-5 rounded-xl border border-gray-100">
                                        <h4 className="text-xs font-bold uppercase tracking-wider mb-3 text-gray-400 flex items-center gap-2">
                                            <Image size={14} />
                                            Bukti Foto
                                        </h4>
                                        <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                                            <img
                                                src={selectedReport.evidence_url}
                                                alt="Bukti laporan"
                                                className="w-full max-h-72 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                                onClick={() => window.open(selectedReport.evidence_url!, '_blank')}
                                            />
                                        </div>
                                        <p className="text-xs text-gray-400 mt-2 text-center">Klik gambar untuk memperbesar</p>
                                    </div>
                                )}
                            </div>

                            <div className="p-5 flex justify-end gap-3 bg-white border-t border-gray-100">
                                <button 
                                    onClick={() => setSelectedReport(null)} 
                                    className="px-6 py-2.5 rounded-xl text-gray-600 font-semibold hover:bg-gray-100 transition-colors"
                                >
                                    Tutup
                                </button>
                                <button 
                                    onClick={() => window.location.href = `/dashboard/os/reports/${selectedReport.id}`} 
                                    className="px-6 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-colors flex items-center gap-2"
                                >
                                    <Eye size={18} />
                                    Lihat Detail
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
