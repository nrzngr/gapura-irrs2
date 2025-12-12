'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, MapPin, Clock, FileText, RefreshCw } from 'lucide-react';

interface Report {
    id: string;
    title: string;
    location: string;
    status: string;
    created_at: string;
}

export default function EmployeeDashboard() {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchReports = async () => {
        try {
            const res = await fetch('/api/reports');
            const data = await res.json();
            // Ensure data is an array
            setReports(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error:', error);
            setReports([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const getStatusBadge = (status: string) => {
        const styles = {
            pending: 'badge-warning',
            reviewed: 'badge-info',
            resolved: 'badge-success',
        }[status] || 'badge-info';

        const labels = {
            pending: 'Menunggu',
            reviewed: 'Ditinjau',
            resolved: 'Selesai',
        }[status] || status;

        return <span className={`badge ${styles}`}>{labels}</span>;
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Welcome Card */}
            <div className="card p-6 bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">Halo, Petugas! 👋</h1>
                        <p className="text-blue-100 mt-1">Siap melaporkan kejadian hari ini?</p>
                    </div>
                    <Link
                        href="/dashboard/employee/new"
                        className="btn bg-white text-blue-600 hover:bg-blue-50 shadow-lg self-start"
                    >
                        <Plus size={20} />
                        Buat Laporan Baru
                    </Link>
                </div>
            </div>

            {/* Reports History */}
            <div className="card">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Riwayat Laporan</h2>
                        <p className="text-sm text-slate-500 mt-1">Semua laporan yang telah Anda kirim</p>
                    </div>
                    <button onClick={fetchReports} className="btn btn-ghost p-2">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-6">
                    {loading ? (
                        <div className="text-center py-12">
                            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
                            <p className="text-slate-500">Memuat riwayat...</p>
                        </div>
                    ) : reports.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500 mb-4">Belum ada laporan yang dikirim.</p>
                            <Link href="/dashboard/employee/new" className="btn btn-primary text-sm">
                                <Plus size={18} />
                                Mulai buat laporan baru
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {reports.map((report) => (
                                <div
                                    key={report.id}
                                    className="group p-5 rounded-xl bg-slate-50 hover:bg-white border border-slate-100 hover:border-blue-100 hover:shadow-lg transition-all duration-300"
                                >
                                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                                                {report.title}
                                            </h3>
                                            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-500">
                                                <span className="flex items-center gap-1.5">
                                                    <MapPin size={14} className="text-slate-400" />
                                                    {report.location}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <Clock size={14} className="text-slate-400" />
                                                    {new Date(report.created_at).toLocaleDateString('id-ID', {
                                                        day: 'numeric', month: 'short', year: 'numeric'
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                        {getStatusBadge(report.status)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
