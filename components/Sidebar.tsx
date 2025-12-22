'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, FileText, LogOut, Plane, Menu, X, ClipboardList, Users, BarChart3, ChevronRight, Hash, FolderOpen, LifeBuoy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Type Definitions ---
interface NavItem {
    href: string;
    label: string;
    icon: any;
    count?: number;
}

interface NavGroup {
    title: string;
    items: NavItem[];
}

// --- Configuration ---
const LINKS_CONFIG: Record<string, NavGroup[]> = {
    'ADMIN': [
        {
            title: 'Overview',
            items: [
                { href: '/dashboard/admin', label: 'Dashboard', icon: LayoutDashboard },
                { href: '/dashboard/admin/analytics', label: 'Analytics', icon: BarChart3 },
            ]
        },
        {
            title: 'Management',
            items: [
                { href: '/dashboard/admin/reports', label: 'Reports', icon: ClipboardList, count: 12 },
                { href: '/dashboard/admin/users', label: 'Users', icon: Users },
            ]
        }
    ],
    'EMPLOYEE': [
        {
            title: 'Workspace',
            items: [
                { href: '/dashboard/employee', label: 'Laporan Saya', icon: FileText },
                { href: '/dashboard/employee/new', label: 'Buat Laporan', icon: Plane },
            ]
        }
    ],
    'OS': [
        {
            title: 'Monitoring',
            items: [
                { href: '/dashboard/os', label: 'Dashboard', icon: LayoutDashboard },
                { href: '/dashboard/os/reports', label: 'Semua Laporan', icon: ClipboardList },
            ]
        }
    ],
    'OT': [
        {
            title: 'Divisi Teknik',
            items: [
                { href: '/dashboard/ot', label: 'Dashboard OT', icon: LayoutDashboard },
                { href: '/dashboard/ot/reports', label: 'Laporan OT', icon: ClipboardList },
            ]
        }
    ],
    'OP': [
        {
            title: 'Divisi Operasi',
            items: [
                { href: '/dashboard/op', label: 'Dashboard OP', icon: LayoutDashboard },
                { href: '/dashboard/op/reports', label: 'Laporan OP', icon: ClipboardList },
            ]
        }
    ],
    'UQ': [
        {
            title: 'Divisi Quality',
            items: [
                { href: '/dashboard/uq', label: 'Dashboard UQ', icon: LayoutDashboard },
                { href: '/dashboard/uq/reports', label: 'Laporan UQ', icon: ClipboardList },
            ]
        }
    ],
    'OSC': [
        {
            title: 'Command Center',
            items: [
                { href: '/dashboard/osc', label: 'Dashboard', icon: LayoutDashboard },
                { href: '/dashboard/osc/reports', label: 'Laporan', icon: ClipboardList },
            ]
        }
    ],
    'PARTNER': [
        {
            title: 'Partner Area',
            items: [
                { href: '/dashboard/partner', label: 'Dashboard', icon: LayoutDashboard },
                { href: '/dashboard/employee/reports', label: 'Laporan Masuk', icon: ClipboardList },
            ]
        }
    ]
};

// Map roles to config keys
const GET_LINKS_KEY = (role: string): string => {
    const r = role.toUpperCase();
    if (r.includes('SUPER') || r === 'ADMIN') return 'ADMIN';
    if (r === 'OSC_LEAD') return 'OSC';
    if (r === 'OS_ADMIN') return 'OS';
    if (r === 'OT_ADMIN') return 'OT';
    if (r === 'OP_ADMIN') return 'OP';
    if (r === 'UQ_ADMIN') return 'UQ';
    if (r === 'PARTNER_ADMIN') return 'PARTNER';
    return 'EMPLOYEE';
};

export default function Sidebar({ role }: { role: string }) {
    const pathname = usePathname();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    const configKey = GET_LINKS_KEY(role || '');
    const groups = LINKS_CONFIG[configKey];

    const handleLogout = async () => {
        setLoading(true);
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/auth/login');
    };

    const NavContent = () => (
        <div className="flex flex-col h-full bg-[var(--surface-1)] text-[var(--text-primary)]">
            {/* 1. Header with Dashed Separator */}
            <div className="p-6 pb-6 border-b border-dashed border-gray-200 flex justify-center">
                 <Image
                    src="/logo.png"
                    alt="Gapura Logo"
                    width={180}
                    height={60}
                    className="object-contain w-[140px] h-auto"
                    priority
                />
            </div>

            {/* 2. Scrollable Nav Area */}
            <nav className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin">
                <div className="space-y-8">
                    {groups.map((group, groupIdx) => (
                        <div key={group.title} className="relative">
                            {/* Group Title with Tree Line */}
                            <div className="flex items-center gap-2 px-2 mb-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] opacity-50" />
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                                    {group.title}
                                </h3>
                            </div>

                            {/* Tree Line Container */}
                            <div className="relative pl-2.5 ml-1 border-l border-dashed border-gray-200 space-y-1">
                                {group.items.map((link) => {
                                    const isActive = pathname === link.href;
                                    const Icon = link.icon;
                                    return (
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            onClick={() => setMobileOpen(false)}
                                            className="block relative group pl-4"
                                        >
                                            {/* Connector "L" shape (CSS pseudo-element simulated) */}
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-px bg-gray-200 group-hover:bg-gray-400 transition-colors" />

                                            <motion.div
                                                className={cn(
                                                    "relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                                                    isActive 
                                                        ? "bg-[var(--surface-2)] text-[var(--text-primary)] shadow-sm ring-1 ring-gray-200"
                                                        : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                                                )}
                                                whileHover={{ x: 4 }}
                                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                            >
                                                <Icon size={16} className={cn(
                                                    "shrink-0",
                                                    isActive ? "text-[var(--brand-primary)]" : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"
                                                )} />
                                                
                                                <span className="flex-1">{link.label}</span>
                                                
                                                {link.count && (
                                                    <span className="px-1.5 py-0.5 rounded-md bg-[var(--surface-3)] text-[10px] font-bold text-[var(--text-secondary)]">
                                                        {link.count}
                                                    </span>
                                                )}

                                                {isActive && (
                                                     <motion.div
                                                        layoutId="active-indicator"
                                                        className="absolute right-2 w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)]"
                                                     />
                                                )}
                                            </motion.div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </nav>

            {/* 3. User Footer */}
            <div className="p-4 border-t border-dashed border-gray-200 bg-[var(--surface-1)]">
                 <div className="bg-[var(--surface-2)] rounded-xl p-3 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                         <div className="w-8 h-8 rounded-full bg-[var(--surface-3)] flex items-center justify-center text-xs font-bold text-[var(--text-secondary)] border border-gray-200">
                             {role.charAt(0)}
                         </div>
                         <div className="min-w-0 flex-1">
                             <p className="text-xs font-bold text-[var(--text-primary)] truncate">{role.replace('_', ' ')}</p>
                             <p className="text-[10px] text-[var(--text-muted)] truncate">Logged in</p>
                         </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide text-red-600 hover:bg-red-50 transition-colors"
                    >
                        <LogOut size={12} />
                        {loading ? '...' : 'Sign Out'}
                    </button>
                 </div>
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile Header Button */}
            <div className="md:hidden fixed top-4 left-4 z-50">
                <button
                    onClick={() => setMobileOpen(true)}
                    className="p-2.5 bg-white rounded-xl shadow-md border border-gray-200 text-[var(--text-primary)] active:scale-95 transition-transform"
                >
                    <Menu size={20} />
                </button>
            </div>

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {mobileOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
                            onClick={() => setMobileOpen(false)}
                        />
                        <motion.div
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", stiffness: 350, damping: 35 }}
                            className="fixed inset-y-0 left-0 w-[280px] z-50 shadow-2xl md:hidden"
                        >
                             <NavContent />
                              <button 
                                onClick={() => setMobileOpen(false)}
                                className="absolute top-4 right-4 p-1.5 bg-[var(--surface-2)] rounded-lg text-[var(--text-muted)]"
                            >
                                <X size={16} />
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Desktop Fixed Sidebar */}
            <div className="hidden md:block fixed top-0 left-0 h-screen w-[260px] z-40 border-r border-dashed border-gray-200 shadow-[2px_0_24px_rgba(0,0,0,0.02)]">
                <NavContent />
            </div>
        </>
    );
}
