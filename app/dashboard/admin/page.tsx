'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    FileText, CheckCircle, Users, RefreshCw, TrendingUp,
    MapPin, ArrowRight, AlertTriangle, AlertCircle, Shield, Zap, Clock
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
        slaBreachCount: number;
    };
    severity: { high: number; medium: number; low: number };
    trends: { today: number; thisWeek: number; thisMonth: number };
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
    topLocations: Array<{ location: string; count: number }>;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/stats');
            setStats(await res.json());
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div 
                    className="w-12 h-12 rounded-full border-4 animate-spin"
                    style={{ 
                        borderColor: 'var(--surface-4)',
                        borderTopColor: 'var(--brand-primary)'
                    }}
                />
            </div>
        );
    }

    const maxLocation = Math.max(...(stats?.topLocations.map(l => l.count) || [1]));

    return (
        <div className="space-y-8 stagger-children">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-in-up">
                <div>
                    <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        Ringkasan
                    </h1>
                    <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>
                        Analitik operasional bandara Gapura Angkasa
                    </p>
                </div>
                <button onClick={fetchData} className="btn-secondary self-start">
                    <RefreshCw size={16} />
                    Perbarui Data
                </button>
            </div>

            {/* High Priority Alert */}
            {stats?.severity.high && stats.severity.high > 0 && (
                <div 
                    className="card-solid flex items-center gap-4 animate-fade-in-up"
                    style={{ 
                        background: 'oklch(0.60 0.22 25 / 0.08)',
                        border: '1px solid oklch(0.60 0.22 25 / 0.2)',
                        padding: 'var(--space-lg)'
                    }}
                >
                    <div 
                        className="p-3 rounded-xl"
                        style={{ background: 'oklch(0.60 0.22 25 / 0.15)' }}
                    >
                        <AlertTriangle size={24} style={{ color: 'oklch(0.50 0.20 25)' }} />
                    </div>
                    <div className="flex-1">
                        <p className="font-bold" style={{ color: 'oklch(0.40 0.18 25)' }}>
                            {stats.severity.high} Laporan Prioritas Tinggi
                        </p>
                        <p className="text-sm" style={{ color: 'oklch(0.55 0.15 25)' }}>
                            Membutuhkan penanganan segera
                        </p>
                    </div>
                    <Link 
                        href="/dashboard/admin/reports?severity=high"
                        className="btn-primary"
                        style={{ 
                            background: 'oklch(0.55 0.20 25)',
                            boxShadow: '0 4px 16px oklch(0.55 0.20 25 / 0.3)'
                        }}
                    >
                        Lihat
                        <ArrowRight size={16} />
                    </Link>
                </div>
            )}

            {/* Bento Grid — Primary Metrics */}
            <div className="bento-grid bento-4">
                {/* Resolution Rate — Hero Card */}
                <div 
                    className="card-solid bento-span-2 animate-fade-in-up"
                    style={{ 
                        background: 'linear-gradient(135deg, var(--brand-gradient-start), var(--brand-gradient-end))',
                        boxShadow: 'var(--shadow-brand)'
                    }}
                >
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium uppercase tracking-wider text-white/80">
                                Tingkat Resolusi
                            </p>
                            <p 
                                className="mt-2 font-bold text-white"
                                style={{ fontSize: 'clamp(3rem, 8vw, 5rem)', lineHeight: 1, letterSpacing: '-0.03em' }}
                            >
                                {stats?.overview.resolutionRate}%
                            </p>
                        </div>
                        <div className="p-3 rounded-xl bg-white/20">
                            <TrendingUp size={28} className="text-white" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                        <Zap size={16} className="text-white/80" />
                        <span className="text-sm font-medium text-white/90">Sesuai target operasional</span>
                    </div>
                </div>

                {/* Total Reports */}
                <div className="card-solid animate-fade-in-up" style={{ animationDelay: '80ms' }}>
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                Total Laporan
                            </p>
                            <p 
                                className="mt-2 font-bold"
                                style={{ fontSize: 'var(--text-4xl)', color: 'var(--text-primary)' }}
                            >
                                {stats?.overview.totalReports}
                            </p>
                            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                                Sepanjang waktu
                            </p>
                        </div>
                        <div className="p-3 rounded-xl" style={{ background: 'var(--surface-3)' }}>
                            <FileText size={22} style={{ color: 'var(--brand-primary)' }} />
                        </div>
                    </div>
                </div>

                {/* Pending */}
                <div className="card-solid animate-fade-in-up" style={{ animationDelay: '160ms' }}>
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                Menunggu Review
                            </p>
                            <p 
                                className="mt-2 font-bold"
                                style={{ fontSize: 'var(--text-4xl)', color: 'oklch(0.60 0.18 75)' }}
                            >
                                {stats?.overview.pendingReports}
                            </p>
                            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                                Perlu tindakan
                            </p>
                        </div>
                        <div className="p-3 rounded-xl" style={{ background: 'oklch(0.75 0.16 75 / 0.15)' }}>
                            <AlertCircle size={22} style={{ color: 'oklch(0.60 0.18 75)' }} />
                        </div>
                    </div>
                </div>

                {/* SLA Breach Counter */}
                <div 
                    className="card-solid animate-fade-in-up" 
                    style={{ 
                        animationDelay: '240ms',
                        background: stats?.overview.slaBreachCount && stats.overview.slaBreachCount > 0 
                            ? 'oklch(0.55 0.22 25 / 0.06)' 
                            : undefined,
                        border: stats?.overview.slaBreachCount && stats.overview.slaBreachCount > 0 
                            ? '1px solid oklch(0.55 0.22 25 / 0.15)' 
                            : undefined
                    }}
                >
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                SLA Breach
                            </p>
                            <p 
                                className="mt-2 font-bold"
                                style={{ 
                                    fontSize: 'var(--text-4xl)', 
                                    color: stats?.overview.slaBreachCount && stats.overview.slaBreachCount > 0 
                                        ? 'oklch(0.55 0.20 25)' 
                                        : 'var(--text-primary)' 
                                }}
                            >
                                {stats?.overview.slaBreachCount || 0}
                            </p>
                            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                                Melewati deadline
                            </p>
                        </div>
                        <div 
                            className="p-3 rounded-xl" 
                            style={{ 
                                background: stats?.overview.slaBreachCount && stats.overview.slaBreachCount > 0 
                                    ? 'oklch(0.55 0.22 25 / 0.12)' 
                                    : 'var(--surface-3)' 
                            }}
                        >
                            <Clock 
                                size={22} 
                                style={{ 
                                    color: stats?.overview.slaBreachCount && stats.overview.slaBreachCount > 0 
                                        ? 'oklch(0.55 0.20 25)' 
                                        : 'var(--text-muted)' 
                                }} 
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Secondary Row */}
            <div className="bento-grid bento-3">
                {/* Severity Breakdown */}
                <div className="card-solid animate-fade-in-up">
                    <p className="text-xs font-semibold uppercase tracking-wider mb-5" style={{ color: 'var(--text-muted)' }}>
                        Berdasarkan Severity
                    </p>
                    <div className="space-y-4">
                        {[
                            { label: 'High (Accident)', value: stats?.severity.high || 0, color: 'oklch(0.55 0.20 25)', icon: AlertTriangle },
                            { label: 'Medium (Incident)', value: stats?.severity.medium || 0, color: 'oklch(0.65 0.18 75)', icon: AlertCircle },
                            { label: 'Low (Hazard)', value: stats?.severity.low || 0, color: 'oklch(0.55 0.15 160)', icon: Shield },
                        ].map((item) => {
                            const Icon = item.icon;
                            return (
                                <div key={item.label} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div 
                                            className="p-2 rounded-lg"
                                            style={{ background: `${item.color} / 0.12)`.replace(')', '') }}
                                        >
                                            <Icon size={16} style={{ color: item.color }} />
                                        </div>
                                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                                    </div>
                                    <span className="text-xl font-bold" style={{ color: item.color }}>
                                        {item.value}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Activity Trends */}
                <div className="card-solid animate-fade-in-up" style={{ animationDelay: '80ms' }}>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-5" style={{ color: 'var(--text-muted)' }}>
                        Aktivitas
                    </p>
                    <div className="space-y-4">
                        {[
                            { label: 'Hari Ini', value: stats?.trends.today },
                            { label: 'Minggu Ini', value: stats?.trends.thisWeek },
                            { label: 'Bulan Ini', value: stats?.trends.thisMonth },
                        ].map((item) => (
                            <div key={item.label} className="flex items-center justify-between">
                                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                                <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Locations */}
                <div className="card-solid animate-fade-in-up" style={{ animationDelay: '160ms' }}>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-5" style={{ color: 'var(--text-muted)' }}>
                        Lokasi Terbanyak
                    </p>
                    <div className="space-y-4">
                        {stats?.topLocations.length === 0 ? (
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Belum ada data</p>
                        ) : (
                            stats?.topLocations.slice(0, 4).map((loc, idx) => (
                                <div key={idx}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm truncate max-w-[140px]" style={{ color: 'var(--text-secondary)' }}>
                                            {loc.location}
                                        </span>
                                        <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                                            {loc.count}
                                        </span>
                                    </div>
                                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-4)' }}>
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{ 
                                                width: `${(loc.count / maxLocation) * 100}%`,
                                                background: 'linear-gradient(90deg, var(--brand-gradient-start), var(--brand-gradient-end))'
                                            }}
                                        />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Reports */}
            <div className="card-solid animate-fade-in-up" style={{ padding: 0, overflow: 'hidden' }}>
                <div 
                    className="flex items-center justify-between"
                    style={{ padding: 'var(--space-xl)', borderBottom: '1px solid var(--surface-4)' }}
                >
                    <div>
                        <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Laporan Terbaru</h3>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>5 laporan terakhir</p>
                    </div>
                    <Link href="/dashboard/admin/reports" className="btn-secondary" style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                        Lihat Semua
                        <ArrowRight size={14} />
                    </Link>
                </div>

                {stats?.recentReports.length === 0 ? (
                    <div className="py-16 text-center">
                        <FileText size={40} style={{ color: 'var(--text-muted)' }} className="mx-auto mb-4 opacity-50" />
                        <p style={{ color: 'var(--text-muted)' }}>Belum ada laporan</p>
                    </div>
                ) : (
                    <div>
                        {stats?.recentReports.map((report, idx) => (
                            <div 
                                key={report.id}
                                className="flex items-center gap-4 transition-colors hover:bg-[var(--surface-3)]"
                                style={{ 
                                    padding: 'var(--space-lg) var(--space-xl)',
                                    borderBottom: idx < (stats?.recentReports.length || 0) - 1 ? '1px solid var(--surface-4)' : 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                <div 
                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                    style={{ 
                                        background: report.severity === 'high' ? 'oklch(0.55 0.20 25)' :
                                                   report.severity === 'medium' ? 'oklch(0.65 0.18 75)' :
                                                   'oklch(0.55 0.15 160)'
                                    }}
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                        {report.title}
                                    </p>
                                    <div className="flex items-center gap-3 mt-1">
                                        {report.stations && (
                                            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                                                <MapPin size={12} />
                                                {report.stations.code}
                                            </span>
                                        )}
                                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                            {report.users?.full_name}
                                        </span>
                                    </div>
                                </div>
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                    {new Date(report.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div className="bento-grid bento-2">
                <Link
                    href="/dashboard/admin/reports"
                    className="card-solid flex items-center gap-4 group animate-fade-in-up"
                >
                    <div 
                        className="p-4 rounded-xl transition-all group-hover:scale-105"
                        style={{ background: 'oklch(0.65 0.18 160 / 0.1)' }}
                    >
                        <FileText size={24} style={{ color: 'var(--brand-primary)' }} />
                    </div>
                    <div className="flex-1">
                        <p className="font-bold" style={{ color: 'var(--text-primary)' }}>Kelola Laporan</p>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Tinjau dan proses insiden</p>
                    </div>
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" style={{ color: 'var(--text-muted)' }} />
                </Link>

                <Link
                    href="/dashboard/admin/users"
                    className="card-solid flex items-center gap-4 group animate-fade-in-up"
                    style={{ animationDelay: '80ms' }}
                >
                    <div 
                        className="p-4 rounded-xl transition-all group-hover:scale-105"
                        style={{ background: 'oklch(0.60 0.15 250 / 0.1)' }}
                    >
                        <Users size={24} style={{ color: 'oklch(0.55 0.15 250)' }} />
                    </div>
                    <div className="flex-1">
                        <p className="font-bold" style={{ color: 'var(--text-primary)' }}>Kelola Pengguna</p>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Akses & persetujuan pengguna</p>
                    </div>
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" style={{ color: 'var(--text-muted)' }} />
                </Link>
            </div>
        </div>
    );
}
