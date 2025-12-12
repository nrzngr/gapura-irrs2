'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, FileText, LogOut, Plane, Menu, X, ChevronRight, ClipboardList, Users, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const adminLinks = [
    { href: '/dashboard/admin', label: 'Dashboard', icon: LayoutDashboard, description: 'Ringkasan & Analytics' },
    { href: '/dashboard/admin/analytics', label: 'Analytics', icon: BarChart3, description: 'Business Intelligence' },
    { href: '/dashboard/admin/reports', label: 'Kelola Laporan', icon: ClipboardList, description: 'Kelola semua laporan' },
    { href: '/dashboard/admin/users', label: 'Kelola User', icon: Users, description: 'Manajemen pengguna' },
];

const employeeLinks = [
    { href: '/dashboard/employee', label: 'Laporan Saya', icon: FileText, description: 'Riwayat laporan' },
    { href: '/dashboard/employee/new', label: 'Buat Laporan', icon: Plane, description: 'Laporkan kejadian baru' },
];

export default function Sidebar({ role }: { role: 'admin' | 'user' }) {
    const pathname = usePathname();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    const links = role === 'admin' ? adminLinks : employeeLinks;

    const handleLogout = async () => {
        setLoading(true);
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/auth/login');
    };

    const NavContent = () => (
        <>
            {/* Logo */}
            <div className="p-6 flex justify-center">
                <Image
                    src="/logo.png"
                    alt="Gapura Logo"
                    width={180}
                    height={60}
                    className="object-contain"
                />
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-2">
                <p className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Menu</p>
                <div className="space-y-2">
                    {links.map((link) => {
                        const Icon = link.icon;
                        const isActive = pathname === link.href;
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setMobileOpen(false)}
                                className={cn(
                                    "flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 group",
                                    isActive
                                        ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30"
                                        : "text-slate-600 hover:bg-slate-100"
                                )}
                            >
                                <div className={cn(
                                    "p-2 rounded-xl transition-colors",
                                    isActive ? "bg-white/20" : "bg-slate-100 group-hover:bg-slate-200"
                                )}>
                                    <Icon size={20} className={isActive ? "text-white" : "text-slate-500"} />
                                </div>
                                <div className="flex-1">
                                    <p className={cn("font-semibold text-sm", isActive ? "text-white" : "text-slate-700")}>
                                        {link.label}
                                    </p>
                                    <p className={cn("text-xs", isActive ? "text-blue-100" : "text-slate-400")}>
                                        {link.description}
                                    </p>
                                </div>
                                {isActive && <ChevronRight size={18} className="text-white/70" />}
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* User Section */}
            <div className="p-4 mt-auto">
                {/* User Info Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-white font-medium">
                            {role === 'admin' ? 'A' : 'U'}
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">Anda masuk sebagai</p>
                            <p className="font-bold text-slate-800">{role === 'admin' ? 'Administrator' : 'Karyawan'}</p>
                        </div>
                    </div>
                </div>

                {/* Logout Button */}
                <button
                    onClick={handleLogout}
                    disabled={loading}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 border border-red-100 font-medium transition-all duration-200"
                >
                    <LogOut size={18} />
                    {loading ? 'Keluar...' : 'Keluar dari Sistem'}
                </button>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile Menu Button */}
            <button
                onClick={() => setMobileOpen(true)}
                className="md:hidden fixed top-4 left-4 z-50 p-3 bg-white rounded-2xl shadow-lg border border-slate-100"
            >
                <Menu size={24} className="text-slate-600" />
            </button>

            {/* Mobile Overlay */}
            {mobileOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            <div className={cn(
                "md:hidden fixed inset-y-0 left-0 w-80 bg-white z-50 flex flex-col transform transition-transform duration-300 shadow-2xl",
                mobileOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <button
                    onClick={() => setMobileOpen(false)}
                    className="absolute top-6 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                    <X size={20} />
                </button>
                <NavContent />
            </div>

            {/* Desktop Sidebar */}
            <div className="hidden md:flex w-72 bg-white h-screen border-r border-slate-100 fixed left-0 top-0 z-10 flex-col">
                <NavContent />
            </div>
        </>
    );
}
