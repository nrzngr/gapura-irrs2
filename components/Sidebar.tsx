'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, FileText, LogOut, Plane, Menu, X, ChevronRight, ClipboardList, Users, BarChart3, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Define link groups
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

const osLinks = [
    { href: '/dashboard/os', label: 'Dashboard', icon: LayoutDashboard, description: 'Monitoring Divisi' },
    { href: '/dashboard/os/reports', label: 'Semua Laporan', icon: ClipboardList, description: 'Akses Read-Only' },
];

const oscLinks = [
    { href: '/dashboard/osc', label: 'Dashboard', icon: LayoutDashboard, description: 'Pusat Komando & Analytics' },
    { href: '/dashboard/osc/reports', label: 'Kelola Laporan', icon: ClipboardList, description: 'Validasi laporan' },
    { href: '/dashboard/employee/new', label: 'Buat Laporan', icon: Plane, description: 'Laporan baru' },
];

export default function Sidebar({ role }: { role: string }) {
    const pathname = usePathname();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    // Determine links based on specific role
    let links = employeeLinks; // Default
    
    // Normalize role string
    const normalizedRole = role ? role.toString().trim().toUpperCase() : '';

    if (normalizedRole === 'SUPER_ADMIN' || normalizedRole === 'ADMIN') {
        links = adminLinks;
    } else if (['OS_ADMIN', 'OT_ADMIN', 'OP_ADMIN', 'UQ_ADMIN'].includes(normalizedRole)) {
        links = osLinks;
    } else if (normalizedRole === 'OSC_LEAD') {
        links = oscLinks;
    } else if (normalizedRole === 'PARTNER_ADMIN') {
        links = [
             { href: '/dashboard/partner', label: 'Dashboard Partner', icon: LayoutDashboard, description: 'Approve & Evidence' },
             { href: '/dashboard/employee/reports', label: 'Laporan Masuk', icon: ClipboardList, description: 'Perlu Indak Lanjut' },
        ];
    }

    const handleLogout = async () => {
        setLoading(true);
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/auth/login');
    };

    const isAdmin = ['SUPER_ADMIN', 'OS_ADMIN', 'OSC_LEAD', 'ADMIN'].includes(normalizedRole);

    const NavContent = () => (
        <div className="flex flex-col h-full bg-slate-50/50 backdrop-blur-xl md:backdrop-blur-none md:bg-transparent">
            {/* Logo */}
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="p-10 flex justify-center flex-shrink-0 relative group"
            >
                <div className="absolute inset-0 bg-emerald-500/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                <Image
                    src="/logo.png"
                    alt="Gapura Logo"
                    width={180}
                    height={60}
                    className="object-contain relative z-10 drop-shadow-sm md:w-[160px]"
                />
            </motion.div>

            {/* Navigation */}
            <nav className="flex-1 px-6 py-4 overflow-y-auto space-y-10 scroll-smooth">
                <div>
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="flex items-center gap-4 px-4 mb-6"
                    >
                        <div className="h-px bg-slate-200 flex-1" />
                        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Menu Utama</p>
                        <div className="h-px bg-slate-200 flex-1" />
                    </motion.div>
                    
                    <div className="space-y-3">
                        {links.map((link) => {
                            const Icon = link.icon;
                            const isActive = pathname === link.href;
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setMobileOpen(false)}
                                    className="block relative group"
                                >
                                    <div className={cn(
                                        "relative flex items-center gap-5 px-5 py-4 rounded-[20px] transition-all duration-300 z-10",
                                        isActive ? "text-white" : "text-slate-500 hover:text-slate-900"
                                    )}>
                                        {/* Active Background - Morphing Pill */}
                                        {isActive && (
                                            <motion.div
                                                layoutId="active-nav-pill"
                                                className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl shadow-xl shadow-emerald-500/20"
                                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                            />
                                        )}
                                        
                                        {/* Hover Background (Inactive) */}
                                        {!isActive && (
                                            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-200 shadow-lg shadow-slate-100/50" />
                                        )}

                                        {/* Icon */}
                                        <div className={cn(
                                            "relative p-2 rounded-xl transition-colors duration-200",
                                            isActive ? "bg-white/20 backdrop-blur-sm" : "bg-slate-100/80 group-hover:bg-emerald-50 group-hover:text-emerald-600"
                                        )}>
                                            <Icon size={20} />
                                        </div>

                                        <div className="relative flex-1 min-w-0">
                                            <p className={cn("font-bold text-sm tracking-wide transition-colors", isActive ? "text-white" : "text-slate-700 group-hover:text-slate-900 icon-text")}>
                                                {link.label}
                                            </p>
                                            <p className={cn("text-[10px] truncate transition-colors", isActive ? "text-emerald-100" : "text-slate-400 group-hover:text-slate-500")}>
                                                {link.description}
                                            </p>
                                        </div>
                                        
                                        {isActive && (
                                            <motion.div 
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="relative w-1.5 h-1.5 rounded-full bg-white shadow-glow mr-1" 
                                            />
                                        )}
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </nav>

            {/* User Section */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="p-6 flex-shrink-0"
            >
                <motion.div 
                    whileHover={{ y: -4, rotate: 1 }}
                    className="relative overflow-hidden rounded-[24px] bg-white border border-slate-100 p-5 shadow-2xl shadow-slate-200/50"
                >
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-full blur-2xl opacity-50 pointer-events-none" />
                    
                    <div className="flex items-center gap-3 relative z-10 mb-4">
                        <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg",
                            isAdmin ? "bg-gradient-to-br from-purple-500 to-indigo-600" : "bg-gradient-to-br from-slate-700 to-black"
                        )}>
                            {role.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Role Akses</p>
                            <p className="font-bold text-slate-800 text-sm truncate">
                                {role.replace('_', ' ')}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleLogout}
                        disabled={loading}
                        className="relative w-full overflow-hidden rounded-xl group/btn"
                    >
                         <div className="absolute inset-0 bg-red-50 group-hover/btn:bg-red-500 transition-colors duration-300" />
                        <div className="relative flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-red-500 group-hover/btn:text-white transition-colors duration-300">
                             <LogOut size={14} />
                             <span>{loading ? 'Keluar...' : 'Keluar dari Sistem'}</span>
                        </div>
                    </button>
                </motion.div>
                
                <div className="text-center py-4">
                     <p className="text-[10px] text-slate-300 font-medium tracking-widest uppercase">
                        Gapura Digital
                    </p>
                </div>
            </motion.div>
        </div>
    );

    return (
        <>
            {/* Mobile Menu Button */}
            <div className="md:hidden fixed top-4 left-4 z-50">
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setMobileOpen(true)}
                    className="p-3 bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 text-slate-700"
                >
                    <Menu size={24} />
                </motion.button>
            </div>

            {/* Mobile Overlay & Sidebar */}
            <AnimatePresence>
                {mobileOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="md:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40"
                            onClick={() => setMobileOpen(false)}
                        />
                        <motion.div
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="md:hidden fixed inset-y-0 left-0 w-[85vw] max-w-sm bg-white z-50 flex flex-col shadow-2xl"
                        >
                             <div className="absolute top-4 right-4 z-50">
                                <button
                                    onClick={() => setMobileOpen(false)}
                                    className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <NavContent />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Desktop Sidebar */}
            <div className="hidden md:flex w-[280px] h-screen fixed left-0 top-0 z-50 border-r border-slate-200/60 bg-white/80 backdrop-blur-3xl shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
                <motion.div 
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="w-full h-full flex flex-col relative"
                >
                    <div className="absolute inset-0 bg-gradient-to-b from-white/50 to-transparent pointer-events-none" />
                    <NavContent />
                </motion.div>
            </div>
        </>
    );
}
