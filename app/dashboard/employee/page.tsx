'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
    Plus, MapPin, Clock, FileText, RefreshCw, 
    ArrowUpRight, CheckCircle2, AlertCircle, 
    Search, ChevronRight, LayoutDashboard, History
} from 'lucide-react';

import { PrismButton } from '@/components/ui/PrismButton';
import { cn } from '@/lib/utils';
import { STATUS_CONFIG, type ReportStatus } from '@/lib/constants/report-status';
import { CreateReportModal } from '../../../components/dashboard/CreateReportModal';
import { ReportDetailModal } from '@/components/dashboard/ReportDetailModal';
import { Report } from '@/types';

export default function EmployeeDashboard() {
    const router = useRouter();
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [greeting, setGreeting] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Selamat Pagi');
        else if (hour < 15) setGreeting('Selamat Siang');
        else if (hour < 18) setGreeting('Selamat Sore');
        else setGreeting('Selamat Malam');

        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/reports');
            if (res.ok) {
                const data = await res.json();
                setReports(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error('Error:', error);
            setReports([]);
        } finally {
            setLoading(false);
        }
    };
    
    const fetchStats = async () => {
        // re-fetch to update stats
        await fetchReports();
    }

    const handleReportClick = (report: Report) => {
        setSelectedReport(report);
    }

    // Derived Stats
    const stats = {
        total: reports.length,
        inProgress: reports.filter(r => ['MENUNGGU_FEEDBACK', 'SUDAH_DIVERIFIKASI'].includes(r.status)).length,
        resolved: reports.filter(r => r.status === 'SELESAI').length,
    };

    return (
        <div className="space-y-8 stagger-children pb-24">
            
            {/* Header with Mobile FAB integration */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 animate-fade-in-up">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <p className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)]">
                            Operasional Stasiun
                        </p>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                        {greeting}, <span className="text-[var(--brand-primary)]">Petugas</span>
                    </h1>
                    <p className="text-[var(--text-secondary)]">
                        Kendali Stasiun &bull; Dasbor Operasional
                    </p>
                </div>
                
                {/* Desktop Actions */}
                <div className="hidden md:flex relative group perspective-1000">
                     <motion.div 
                        animate={{ opacity: [0.2, 0.4, 0.2] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="absolute -inset-0.5 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-xl blur opacity-20 group-hover:opacity-60"
                     />
                     <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                        onClick={() => setShowCreateModal(true)}
                        className="relative w-full md:w-auto bg-gradient-to-br from-[#022c22] to-[#064e3b] text-white px-6 py-2.5 rounded-xl font-bold text-xs tracking-widest uppercase shadow-xl hover:shadow-emerald-500/20 border border-emerald-500/30 flex items-center gap-2 overflow-hidden ring-1 ring-white/10"
                    >
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 skew-x-12 translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-700 ease-out" />
                        
                        <div className="bg-emerald-500/20 p-1 rounded-lg">
                            <Plus size={14} className="text-emerald-300" strokeWidth={3} />
                        </div>
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-50 via-white to-emerald-100 group-hover:text-white transition-colors relative z-10">
                            Buat Laporan
                        </span>
                    </motion.button>
                </div>
            </header>

            {/* Quick Stats */}
            <div className="bento-grid bento-3">
                <div className="card-solid flex flex-col justify-between group h-full animate-fade-in-up">
                    <div className="flex justify-between items-start">
                        <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Laporan Saya</p>
                        <FileText size={20} className="text-[var(--text-muted)]" />
                    </div>
                    <div>
                        <p className="text-4xl font-bold text-[var(--text-primary)]">{stats.total}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">Total diajukan</p>
                    </div>
                </div>

                <div className="card-solid flex flex-col justify-between group h-full animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                    <div className="flex justify-between items-start">
                        <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Sedang Proses</p>
                        <History size={20} className="text-[var(--status-warning)]" />
                    </div>
                    <div>
                        <p className="text-4xl font-bold text-[var(--status-warning)]">{stats.inProgress}</p>
                        <div className="h-1 w-full bg-[var(--surface-3)] rounded-full mt-4 overflow-hidden">
                            <div className="h-full bg-amber-500 rounded-full w-[60%]" />
                        </div>
                    </div>
                </div>

                <div className="card-solid flex flex-col justify-between group h-full animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                    <div className="flex justify-between items-start">
                        <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Selesai</p>
                        <CheckCircle2 size={20} className="text-[var(--status-success)]" />
                    </div>
                    <div>
                        <p className="text-4xl font-bold text-[var(--status-success)]">{stats.resolved}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">Berhasil ditangani</p>
                    </div>
                </div>
            </div>

            {/* Data Table View - PREMIUM REDESIGN */}
            <div className="space-y-6">
                <div className="flex items-center justify-between pb-4">
                    <div>
                        <h3 className="text-xl font-bold flex items-center gap-2 text-gray-900">
                            <LayoutDashboard size={24} className="text-[var(--brand-primary)]" />
                            Daftar Laporan
                        </h3>
                        <p className="text-xs text-gray-400 mt-1 font-medium ml-8">
                            Aktivitas dan status laporan terkini
                        </p>
                    </div>
                </div>

                <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl overflow-hidden ring-1 ring-black/5">
                    {/* Floating Toolbar inside Card */}
                    <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white/50">
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"/>
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Live Updates</span>
                        </div>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors group-focus-within:text-[var(--brand-primary)] text-gray-400">
                                <Search size={16} />
                            </div>
                            <input 
                                type="text" 
                                placeholder="Cari ID, Lokasi, atau Judul..." 
                                className="pl-10 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:ring-4 focus:ring-[var(--brand-primary)]/10 focus:border-[var(--brand-primary)] outline-none w-72 transition-all hover:bg-white"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50/80 text-[10px] uppercase font-bold text-gray-400 border-b border-gray-100 tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">ID Laporan</th>
                                    <th className="px-6 py-4">Status & Prioritas</th>
                                    <th className="px-6 py-4">Judul & Lokasi</th>
                                    <th className="px-6 py-4">Waktu</th>
                                    <th className="px-6 py-4 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 bg-white/40">
                                {reports.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-24 text-center text-gray-400">
                                            <div className="flex flex-col items-center gap-4 animate-scale-in">
                                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center shadow-inner">
                                                    <History size={32} className="opacity-30" />
                                                </div>
                                                <p className="font-medium">Belum ada laporan yang diajukan</p>
                                                <button 
                                                    onClick={() => setShowCreateModal(true)}
                                                    className="text-xs text-[var(--brand-primary)] font-bold hover:underline"
                                                >
                                                    + Buat Laporan Baru
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    reports.map((report, idx) => {
                                        const statusConfig = STATUS_CONFIG[report.status as ReportStatus] || STATUS_CONFIG.MENUNGGU_FEEDBACK;
                                        const severityKey = report.severity || 'medium';
                                        const priorityColor = severityKey === 'urgent' ? 'text-red-600 bg-red-50 border-red-100' : 
                                                            severityKey === 'high' ? 'text-orange-600 bg-orange-50 border-orange-100' : 
                                                            severityKey === 'medium' ? 'text-amber-600 bg-amber-50 border-amber-100' : 
                                                            'text-emerald-600 bg-emerald-50 border-emerald-100';

                                        return (
                                            <tr 
                                                key={report.id} 
                                                className="group hover:bg-gradient-to-r hover:from-white hover:to-gray-50 transition-all cursor-pointer duration-300 ease-out"
                                                onClick={() => handleReportClick(report)}
                                                style={{ animationDelay: `${idx * 50}ms` }}
                                            >
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn("w-1.5 h-1.5 rounded-full", statusConfig.textClass?.replace('text-', 'bg-'))} />
                                                        <span className="font-mono text-xs font-bold text-gray-500 group-hover:text-[var(--brand-primary)] transition-colors">
                                                            #{report.id.slice(0, 8).toUpperCase()}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col items-start gap-2">
                                                         <span className={cn(
                                                            "px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-widest border shadow-sm",
                                                            statusConfig.bgClass,
                                                            statusConfig.textClass,
                                                            statusConfig.borderClass
                                                        )}>
                                                            {statusConfig.label}
                                                        </span>
                                                        <div className={cn("text-[9px] font-bold px-2 py-0.5 rounded-md uppercase flex items-center gap-1 border", priorityColor)}>
                                                            <AlertCircle size={8} strokeWidth={3} />
                                                            {severityKey}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="max-w-[280px]">
                                                        <p className="font-bold text-gray-900 group-hover:text-[var(--brand-primary)] transition-colors mb-1 truncate text-sm">
                                                            {report.title}
                                                        </p>
                                                        <div className="flex items-center gap-2 text-xs text-gray-400">
                                                            <MapPin size={10} />
                                                            <span className="truncate">{report.location || report.stations?.name}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col text-xs">
                                                        <span className="font-bold text-gray-700">
                                                            {new Date(report.created_at).toLocaleDateString('id-ID', {day: 'numeric', month: 'short'})}
                                                        </span>
                                                        <span className="text-gray-400 text-[10px] font-medium mt-0.5">
                                                            {new Date(report.created_at).toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'})}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <div className="relative flex justify-end">
                                                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-[var(--brand-primary)] group-hover:text-white group-hover:shadow-lg group-hover:shadow-emerald-500/30 transition-all duration-300 transform group-hover:scale-110">
                                                            <ArrowUpRight size={16} />
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Mobile FAB */}
            <button 
                onClick={() => setShowCreateModal(true)}
                className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-[var(--brand-primary)] text-white rounded-full shadow-lg flex items-center justify-center z-50 hover:scale-110 active:scale-95 transition-all"
            >
                <Plus size={24} />
            </button>

            {/* Modals */}
            <ReportDetailModal
                isOpen={!!selectedReport}
                onClose={() => setSelectedReport(null)}
                report={selectedReport}
            />

            <CreateReportModal 
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={() => {
                    fetchReports();
                    fetchStats();
                    setShowCreateModal(false);
                }}
            />
        </div>
    );
}
