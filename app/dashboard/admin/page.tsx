'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    FileText, Clock, CheckCircle, Users, RefreshCw, TrendingUp,
    MapPin, Calendar, ArrowRight, Eye, BarChart3, Activity, UserCheck,
    AlertCircle, Zap, AlertTriangle, Shield
} from 'lucide-react';

interface Stats {
    overview: {
        totalReports: number;
        pendingReports: number;
        reviewedReports: number;
        resolvedReports: number;
        pendingUsers: number;
        activeUsers: number;
        resolutionRate: number;
    };
    severity: {
        high: number;
        medium: number;
        low: number;
    };
    trends: {
        today: number;
        thisWeek: number;
        thisMonth: number;
    };
    recentReports: Array<{
        id: string;
        title: string;
        location: string;
        status: string;
        severity: string;
        created_at: string;
        users: { full_name: string };
        stations: { code: string } | null;
    }>;
    topLocations: Array<{
        location: string;
        count: number;
    }>;
}

const statusConfig = {
    pending: { label: 'Menunggu', color: 'bg-amber-500' },
    reviewed: { label: 'Ditinjau', color: 'bg-blue-500' },
    resolved: { label: 'Selesai', color: 'bg-emerald-500' },
};

const severityConfig = {
    high: { label: 'High', color: 'text-red-600 bg-red-100', icon: AlertTriangle },
    medium: { label: 'Medium', color: 'text-amber-600 bg-amber-100', icon: AlertCircle },
    low: { label: 'Low', color: 'text-emerald-600 bg-emerald-100', icon: Shield },
};

export default function AdminDashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/stats');
            const data = await res.json();
            setStats(data);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-6" />
                    <p className="text-slate-500 font-medium">Memuat data analytics...</p>
                </div>
            </div>
        );
    }

    const maxLocationCount = Math.max(...(stats?.topLocations.map(l => l.count) || [1]));

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Analytics Dashboard</h1>
                    <p className="text-slate-500 mt-1">Ringkasan komprehensif operasional Gapura Angkasa</p>
                </div>
                <button
                    onClick={fetchData}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 font-medium hover:border-slate-300 hover:bg-slate-50 transition-all self-start"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Severity Alert Banner */}
            {stats?.severity.high && stats.severity.high > 0 && (
                <div className="bg-gradient-to-r from-red-500 to-rose-500 rounded-2xl p-4 text-white flex items-center gap-4 shadow-lg shadow-red-500/25">
                    <div className="p-3 bg-white/20 rounded-xl">
                        <AlertTriangle size={24} />
                    </div>
                    <div className="flex-1">
                        <p className="font-bold">{stats.severity.high} Laporan HIGH Priority</p>
                        <p className="text-red-100 text-sm">Membutuhkan penanganan segera</p>
                    </div>
                    <Link href="/dashboard/admin/reports?severity=high" className="px-4 py-2 bg-white text-red-600 rounded-xl font-medium text-sm hover:bg-red-50 transition-colors">
                        Lihat Sekarang
                    </Link>
                </div>
            )}

            {/* Primary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {/* Total Reports */}
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/25">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-blue-100 text-sm font-medium">Total Laporan</p>
                            <h3 className="text-4xl font-bold mt-2">{stats?.overview.totalReports}</h3>
                            <p className="text-blue-200 text-sm mt-2">Semua waktu</p>
                        </div>
                        <div className="bg-white/20 p-4 rounded-2xl">
                            <FileText size={28} />
                        </div>
                    </div>
                </div>

                {/* Pending */}
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-500 text-sm font-medium">Menunggu Review</p>
                            <h3 className="text-4xl font-bold text-slate-900 mt-2">{stats?.overview.pendingReports}</h3>
                            <p className="text-amber-600 text-sm mt-2 font-medium flex items-center gap-1">
                                <AlertCircle size={14} />
                                Perlu tindakan
                            </p>
                        </div>
                        <div className="bg-amber-100 p-4 rounded-2xl">
                            <Clock size={28} className="text-amber-600" />
                        </div>
                    </div>
                </div>

                {/* Resolved */}
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-500 text-sm font-medium">Selesai Ditangani</p>
                            <h3 className="text-4xl font-bold text-slate-900 mt-2">{stats?.overview.resolvedReports}</h3>
                            <p className="text-emerald-600 text-sm mt-2 font-medium flex items-center gap-1">
                                <TrendingUp size={14} />
                                {stats?.overview.resolutionRate}% resolution rate
                            </p>
                        </div>
                        <div className="bg-emerald-100 p-4 rounded-2xl">
                            <CheckCircle size={28} className="text-emerald-600" />
                        </div>
                    </div>
                </div>

                {/* User Pending */}
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-500 text-sm font-medium">User Menunggu</p>
                            <h3 className="text-4xl font-bold text-slate-900 mt-2">{stats?.overview.pendingUsers}</h3>
                            <p className="text-slate-400 text-sm mt-2">{stats?.overview.activeUsers} user aktif</p>
                        </div>
                        <div className="bg-purple-100 p-4 rounded-2xl">
                            <Users size={28} className="text-purple-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Severity & Trend Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Severity Breakdown */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-red-100 rounded-xl">
                            <AlertTriangle size={20} className="text-red-600" />
                        </div>
                        <h3 className="font-bold text-slate-900">Severity Breakdown</h3>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100">
                            <div className="flex items-center gap-3">
                                <AlertTriangle size={18} className="text-red-500" />
                                <span className="text-slate-700 font-medium">High (Accident)</span>
                            </div>
                            <span className="text-2xl font-bold text-red-600">{stats?.severity.high || 0}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl border border-amber-100">
                            <div className="flex items-center gap-3">
                                <AlertCircle size={18} className="text-amber-500" />
                                <span className="text-slate-700 font-medium">Medium (Incident)</span>
                            </div>
                            <span className="text-2xl font-bold text-amber-600">{stats?.severity.medium || 0}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                            <div className="flex items-center gap-3">
                                <Shield size={18} className="text-emerald-500" />
                                <span className="text-slate-700 font-medium">Low (Hazard)</span>
                            </div>
                            <span className="text-2xl font-bold text-emerald-600">{stats?.severity.low || 0}</span>
                        </div>
                    </div>
                </div>

                {/* Trend Cards */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-100 rounded-xl">
                            <Activity size={20} className="text-blue-600" />
                        </div>
                        <h3 className="font-bold text-slate-900">Tren Laporan</h3>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                            <div className="flex items-center gap-3">
                                <Zap size={18} className="text-amber-500" />
                                <span className="text-slate-600">Hari Ini</span>
                            </div>
                            <span className="text-2xl font-bold text-slate-900">{stats?.trends.today}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                            <div className="flex items-center gap-3">
                                <Calendar size={18} className="text-blue-500" />
                                <span className="text-slate-600">Minggu Ini</span>
                            </div>
                            <span className="text-2xl font-bold text-slate-900">{stats?.trends.thisWeek}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                            <div className="flex items-center gap-3">
                                <BarChart3 size={18} className="text-emerald-500" />
                                <span className="text-slate-600">Bulan Ini</span>
                            </div>
                            <span className="text-2xl font-bold text-slate-900">{stats?.trends.thisMonth}</span>
                        </div>
                    </div>
                </div>

                {/* Top Locations */}
                <div className="bg-white rounded-2xl border border-slate-100 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-rose-100 rounded-xl">
                            <MapPin size={20} className="text-rose-600" />
                        </div>
                        <h3 className="font-bold text-slate-900">Lokasi Terbanyak</h3>
                    </div>
                    <div className="space-y-4">
                        {stats?.topLocations.length === 0 ? (
                            <p className="text-slate-400 text-center py-8">Belum ada data</p>
                        ) : (
                            stats?.topLocations.map((loc, idx) => (
                                <div key={idx}>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-slate-600 truncate max-w-[150px]">{loc.location}</span>
                                        <span className="font-semibold text-slate-900">{loc.count}</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full transition-all duration-500"
                                            style={{ width: `${(loc.count / maxLocationCount) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-cyan-100 rounded-xl">
                            <FileText size={20} className="text-cyan-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">Laporan Terbaru</h3>
                            <p className="text-sm text-slate-500">5 laporan terakhir yang masuk</p>
                        </div>
                    </div>
                    <Link
                        href="/dashboard/admin/reports"
                        className="inline-flex items-center gap-2 text-blue-600 font-medium text-sm hover:text-blue-700"
                    >
                        Lihat Semua
                        <ArrowRight size={16} />
                    </Link>
                </div>
                <div className="divide-y divide-slate-100">
                    {stats?.recentReports.length === 0 ? (
                        <div className="p-12 text-center text-slate-400">
                            Belum ada laporan
                        </div>
                    ) : (
                        stats?.recentReports.map((report) => {
                            const SeverityIcon = severityConfig[report.severity as keyof typeof severityConfig]?.icon || Shield;
                            return (
                                <div key={report.id} className="p-4 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${severityConfig[report.severity as keyof typeof severityConfig]?.color || 'bg-slate-100 text-slate-600'}`}>
                                            <SeverityIcon size={20} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-slate-900 truncate">{report.title}</p>
                                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                                {report.stations && (
                                                    <span className="flex items-center gap-1">
                                                        <MapPin size={12} />
                                                        {report.stations.code}
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-1">
                                                    <UserCheck size={12} />
                                                    {report.users?.full_name}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`w-2 h-2 rounded-full ${statusConfig[report.status as keyof typeof statusConfig]?.color}`} />
                                            <span className="text-xs text-slate-400">
                                                {new Date(report.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link
                    href="/dashboard/admin/reports"
                    className="flex items-center gap-4 p-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl text-white hover:shadow-lg hover:shadow-blue-500/25 transition-all group"
                >
                    <div className="p-3 bg-white/20 rounded-xl">
                        <Eye size={24} />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold">Kelola Laporan</h4>
                        <p className="text-blue-100 text-sm">Tinjau dan proses semua laporan</p>
                    </div>
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                    href="/dashboard/admin/users"
                    className="flex items-center gap-4 p-6 bg-white rounded-2xl border-2 border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all group"
                >
                    <div className="p-3 bg-slate-100 rounded-xl group-hover:bg-slate-200 transition-colors">
                        <Users size={24} className="text-slate-600" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-slate-900">Kelola User</h4>
                        <p className="text-slate-500 text-sm">Manajemen pengguna sistem</p>
                    </div>
                    <ArrowRight size={20} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                </Link>
            </div>
        </div>
    );
}
