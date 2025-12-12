'use client';

import { useEffect, useState } from 'react';
import {
    FileText, Search, Filter, ChevronDown, RefreshCw, Eye, X, Check,
    MapPin, Calendar, User, AlertTriangle, AlertCircle, Shield,
    Plane, Clock, Building2, Tag, MessageSquare, CheckCircle2, Image
} from 'lucide-react';

interface Report {
    id: string;
    title: string;
    description: string;
    location: string;
    status: string;
    severity: string;
    flight_number: string | null;
    aircraft_reg: string | null;
    gse_number: string | null;
    evidence_url: string | null;
    created_at: string;
    investigator_notes: string | null;
    users: { full_name: string; email: string } | null;
    stations: { code: string; name: string } | null;
    incident_types: { name: string } | null;
}

const statusConfig = {
    pending: { label: 'Menunggu', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
    reviewed: { label: 'Ditinjau', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Eye },
    resolved: { label: 'Selesai', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
};

const severityConfig = {
    high: { label: 'High', color: 'bg-red-500 text-white', bgLight: 'bg-red-50 border-red-200', icon: AlertTriangle, textColor: 'text-red-600' },
    medium: { label: 'Medium', color: 'bg-amber-500 text-white', bgLight: 'bg-amber-50 border-amber-200', icon: AlertCircle, textColor: 'text-amber-600' },
    low: { label: 'Low', color: 'bg-emerald-500 text-white', bgLight: 'bg-emerald-50 border-emerald-200', icon: Shield, textColor: 'text-emerald-600' },
};

export default function AdminReportsPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [stationFilter, setStationFilter] = useState('all');
    const [filter, setFilter] = useState('all');
    const [severityFilter, setSeverityFilter] = useState('all');
    const [stations, setStations] = useState<Array<{ id: string; code: string; name: string }>>([]);


    const [search, setSearch] = useState('');
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchStations = async () => {
        try {
            const res = await fetch('/api/master-data?type=stations');
            const data = await res.json();
            if (Array.isArray(data)) {
                setStations(data);
            } else if (data.stations) {
                setStations(data.stations);
            }
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

    useEffect(() => {
        fetchReports();
    }, [filter, stationFilter]);

    useEffect(() => {
        fetchStations();
    }, []);

    const updateStatus = async (reportId: string, status: string) => {
        setActionLoading(true);
        try {
            await fetch('/api/admin/reports', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reportId, status }),
            });
            fetchReports();
            if (selectedReport?.id === reportId) {
                setSelectedReport({ ...selectedReport, status });
            }
        } catch (error) {
            alert('Gagal mengubah status');
        } finally {
            setActionLoading(false);
        }
    };

    const filteredReports = reports.filter(report => {
        const matchesSearch = report.title.toLowerCase().includes(search.toLowerCase()) ||
            report.location?.toLowerCase().includes(search.toLowerCase()) ||
            report.users?.full_name.toLowerCase().includes(search.toLowerCase()) ||
            report.stations?.name.toLowerCase().includes(search.toLowerCase());
        const matchesSeverity = severityFilter === 'all' || report.severity === severityFilter;
        return matchesSearch && matchesSeverity;
    });

    const SeverityIcon = (severity: string) => severityConfig[severity as keyof typeof severityConfig]?.icon || Shield;
    const StatusIcon = (status: string) => statusConfig[status as keyof typeof statusConfig]?.icon || Clock;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Kelola Laporan</h1>
                    <p className="text-slate-500 mt-1 text-sm sm:text-base">Kelola dan tindaklanjuti semua laporan masuk</p>
                </div>
                <button
                    onClick={fetchReports}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors text-sm font-medium flex-shrink-0"
                >
                    <RefreshCw className="w-4 h-4" />
                    <span className="hidden sm:inline">Refresh</span>
                </button>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-slate-100 p-4 flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg">
                        <FileText size={20} className="text-slate-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-slate-900">{reports.length}</p>
                        <p className="text-xs text-slate-500">Total Laporan</p>
                    </div>
                </div>
                <div className="bg-red-50 rounded-xl border border-red-100 p-4 flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                        <AlertTriangle size={20} className="text-red-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-red-600">{reports.filter(r => r.severity === 'high').length}</p>
                        <p className="text-xs text-red-500">High Priority</p>
                    </div>
                </div>
                <div className="bg-amber-50 rounded-xl border border-amber-100 p-4 flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                        <Clock size={20} className="text-amber-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-amber-600">{reports.filter(r => r.status === 'pending').length}</p>
                        <p className="text-xs text-amber-500">Menunggu</p>
                    </div>
                </div>
                <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4 flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                        <CheckCircle2 size={20} className="text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-emerald-600">{reports.filter(r => r.status === 'resolved').length}</p>
                        <p className="text-xs text-emerald-500">Selesai</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Cari laporan, lokasi, pelapor, atau station..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-200 bg-white focus:border-blue-500 focus:outline-none transition-colors text-sm"
                    />
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Station Filter */}
                    <div className="relative flex-1 sm:flex-none sm:min-w-[160px]">
                        <select
                            value={stationFilter}
                            onChange={(e) => setStationFilter(e.target.value)}
                            className="w-full appearance-none pl-10 pr-10 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-700 font-medium focus:border-blue-500 focus:outline-none cursor-pointer text-sm"
                        >
                            <option value="all">Semua Station</option>
                            {stations.map((s) => (
                                <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                            ))}
                        </select>
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    </div>

                    <div className="flex gap-3">
                        <div className="relative flex-1 sm:flex-none">
                            <select
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="w-full appearance-none pl-10 pr-10 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-700 font-medium focus:border-blue-500 focus:outline-none cursor-pointer text-sm"
                            >
                                <option value="all">Semua Status</option>
                                <option value="pending">Menunggu</option>
                                <option value="reviewed">Ditinjau</option>
                                <option value="resolved">Selesai</option>
                            </select>
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        </div>
                        <div className="relative flex-1 sm:flex-none">
                            <select
                                value={severityFilter}
                                onChange={(e) => setSeverityFilter(e.target.value)}
                                className="w-full appearance-none pl-10 pr-10 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-700 font-medium focus:border-blue-500 focus:outline-none cursor-pointer text-sm"
                            >
                                <option value="all">Semua Severity</option>
                                <option value="high">🔴 High</option>
                                <option value="medium">🟡 Medium</option>
                                <option value="low">🟢 Low</option>
                            </select>
                            <AlertTriangle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Reports List */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center">
                        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
                    </div>
                ) : filteredReports.length === 0 ? (
                    <div className="p-12 text-center">
                        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">Tidak ada laporan ditemukan</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filteredReports.map((report) => {
                            const severity = severityConfig[report.severity as keyof typeof severityConfig] || severityConfig.low;
                            const status = statusConfig[report.status as keyof typeof statusConfig] || statusConfig.pending;
                            const SevIcon = severity.icon;
                            const StatIcon = status.icon;
                            const stationName = report.stations ? `${report.stations.code} - ${report.stations.name}` : 'Unknown Station';

                            return (
                                <div
                                    key={report.id}
                                    className={`p-4 sm:p-5 hover:bg-slate-50 transition-colors cursor-pointer border-l-4 ${report.severity === 'high' ? 'border-l-red-500' :
                                        report.severity === 'medium' ? 'border-l-amber-500' : 'border-l-emerald-500'
                                        }`}
                                    onClick={() => setSelectedReport(report)}
                                >
                                    <div className="flex items-start gap-3 sm:gap-4">
                                        {/* Severity Icon */}
                                        <div className={`p-2 sm:p-3 rounded-xl ${severity.bgLight} border flex-shrink-0`}>
                                            <SevIcon size={20} className={severity.textColor} />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            {/* Mobile: Stack header and badges vertically */}
                                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                                                <div className="flex-1 min-w-0">
                                                    {/* Station and Date Row */}
                                                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 uppercase tracking-wide max-w-[150px] sm:max-w-none truncate">
                                                            {stationName}
                                                        </span>
                                                        <span className="hidden sm:inline text-xs text-slate-400">•</span>
                                                        <span className="text-[10px] sm:text-xs text-slate-400">
                                                            {new Date(report.created_at).toLocaleString('id-ID', {
                                                                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                                            })}
                                                        </span>
                                                    </div>
                                                    <h3 className="font-semibold text-slate-900 text-base sm:text-lg leading-snug">{report.title}</h3>
                                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs sm:text-sm text-slate-500">
                                                        {report.location && (
                                                            <span className="flex items-center gap-1">
                                                                <MapPin size={12} className="text-slate-400 flex-shrink-0" />
                                                                <span className="truncate max-w-[120px] sm:max-w-none">{report.location}</span>
                                                            </span>
                                                        )}
                                                        <span className="flex items-center gap-1">
                                                            <User size={12} className="text-slate-400 flex-shrink-0" />
                                                            {report.users?.full_name}
                                                        </span>
                                                    </div>
                                                    {/* Flight Info */}
                                                    {(report.flight_number || report.aircraft_reg || report.gse_number) && (
                                                        <div className="flex flex-wrap items-center gap-2 mt-2">
                                                            {report.flight_number && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-[10px] sm:text-xs font-medium">
                                                                    <Plane size={10} />
                                                                    {report.flight_number}
                                                                </span>
                                                            )}
                                                            {report.aircraft_reg && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[10px] sm:text-xs font-medium">
                                                                    {report.aircraft_reg}
                                                                </span>
                                                            )}
                                                            {report.gse_number && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-50 text-purple-700 text-[10px] sm:text-xs font-medium">
                                                                    GSE: {report.gse_number}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                {/* Status and Severity Badges - Row on mobile, column on desktop */}
                                                <div className="flex sm:flex-col items-center sm:items-end gap-2 flex-shrink-0 mt-2 sm:mt-0">
                                                    <span className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-semibold border ${status.color}`}>
                                                        <StatIcon size={12} />
                                                        {status.label}
                                                    </span>
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-bold ${severity.color}`}>
                                                        {severity.label}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedReport && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedReport(null)}>
                    <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className={`p-6 ${selectedReport.severity === 'high' ? 'bg-gradient-to-r from-red-500 to-rose-500' :
                            selectedReport.severity === 'medium' ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                                'bg-gradient-to-r from-emerald-500 to-teal-500'
                            } text-white relative`}>
                            <button
                                onClick={() => setSelectedReport(null)}
                                className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-xl transition-colors"
                            >
                                <X size={20} />
                            </button>
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-white/20 rounded-xl">
                                    {(() => { const Icon = SeverityIcon(selectedReport.severity); return <Icon size={28} />; })()}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-lg text-white/90">
                                            {selectedReport.stations ? `${selectedReport.stations.code} - ${selectedReport.stations.name}` : 'Unknown Station'}
                                        </span>
                                        <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full uppercase tracking-wider">
                                            {severityConfig[selectedReport.severity as keyof typeof severityConfig]?.label} Priority
                                        </span>
                                    </div>
                                    <h2 className="text-xl font-bold">{selectedReport.title}</h2>
                                    <p className="text-white/80 text-sm mt-1">ID: {selectedReport.id.slice(0, 8)}...</p>
                                </div>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
                            {/* Status Actions */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Update Status</h4>
                                <div className="flex flex-wrap gap-2">
                                    {['pending', 'reviewed', 'resolved'].map((s) => {
                                        const cfg = statusConfig[s as keyof typeof statusConfig];
                                        const Icon = cfg.icon;
                                        return (
                                            <button
                                                key={s}
                                                onClick={() => updateStatus(selectedReport.id, s)}
                                                disabled={actionLoading}
                                                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${selectedReport.status === s
                                                    ? cfg.color + ' border-2 border-current shadow-md'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-2 border-transparent'
                                                    }`}
                                            >
                                                <Icon size={16} />
                                                {cfg.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 rounded-xl">
                                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Lokasi / Station</p>
                                    <p className="font-semibold text-slate-900 mt-1 flex flex-col">
                                        <span className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                                            <Building2 size={14} />
                                            {selectedReport.stations?.code} - {selectedReport.stations?.name}
                                        </span>
                                        <span className="flex items-center gap-2">
                                            <MapPin size={16} className="text-slate-400" />
                                            {selectedReport.location || 'N/A'}
                                        </span>
                                    </p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-xl">
                                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Pelapor</p>
                                    <p className="font-semibold text-slate-900 mt-1">{selectedReport.users?.full_name}</p>
                                    <p className="text-xs text-slate-500">{selectedReport.users?.email}</p>
                                </div>
                                {selectedReport.incident_types && (
                                    <div className="p-4 bg-slate-50 rounded-xl">
                                        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Tipe Insiden</p>
                                        <p className="font-semibold text-slate-900 mt-1 flex items-center gap-2">
                                            <Tag size={16} className="text-slate-400" />
                                            {selectedReport.incident_types.name}
                                        </p>
                                    </div>
                                )}
                                <div className="p-4 bg-slate-50 rounded-xl">
                                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Waktu Laporan</p>
                                    <p className="font-semibold text-slate-900 mt-1">
                                        {new Date(selectedReport.created_at).toLocaleString('id-ID', {
                                            day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                            </div>


                            {/* Flight Context */}
                            {(selectedReport.flight_number || selectedReport.aircraft_reg || selectedReport.gse_number) && (
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Konteks Penerbangan</h4>
                                    <div className="flex flex-wrap gap-3">
                                        {selectedReport.flight_number && (
                                            <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
                                                <p className="text-xs text-blue-600 font-medium">No. Penerbangan</p>
                                                <p className="font-bold text-blue-900 flex items-center gap-2 mt-0.5">
                                                    <Plane size={16} />
                                                    {selectedReport.flight_number}
                                                </p>
                                            </div>
                                        )}
                                        {selectedReport.aircraft_reg && (
                                            <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                                                <p className="text-xs text-slate-600 font-medium">Registrasi Pesawat</p>
                                                <p className="font-bold text-slate-900 mt-0.5">{selectedReport.aircraft_reg}</p>
                                            </div>
                                        )}
                                        {selectedReport.gse_number && (
                                            <div className="px-4 py-3 bg-purple-50 border border-purple-200 rounded-xl">
                                                <p className="text-xs text-purple-600 font-medium">No. GSE / Alat</p>
                                                <p className="font-bold text-purple-900 mt-0.5">{selectedReport.gse_number}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Description */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Deskripsi Kejadian</h4>
                                <div className="p-4 bg-slate-50 rounded-xl">
                                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedReport.description}</p>
                                </div>
                            </div>

                            {/* Investigator Notes */}
                            {selectedReport.investigator_notes && (
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <MessageSquare size={14} />
                                        Catatan Investigator
                                    </h4>
                                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                                        <p className="text-blue-800 leading-relaxed">{selectedReport.investigator_notes}</p>
                                    </div>
                                </div>
                            )}

                            {/* Evidence Photo */}
                            {selectedReport.evidence_url && (
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <Image size={14} />
                                        Bukti Foto
                                    </h4>
                                    <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                                        <img
                                            src={selectedReport.evidence_url}
                                            alt="Bukti laporan"
                                            className="w-full max-h-96 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                            onClick={() => window.open(selectedReport.evidence_url!, '_blank')}
                                        />
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2 text-center">Klik gambar untuk memperbesar</p>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                onClick={() => setSelectedReport(null)}
                                className="px-5 py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-200 transition-colors"
                            >
                                Tutup
                            </button>
                            {selectedReport.status !== 'resolved' && (
                                <button
                                    onClick={() => updateStatus(selectedReport.id, 'resolved')}
                                    disabled={actionLoading}
                                    className="px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    <Check size={18} />
                                    Selesaikan Laporan
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
