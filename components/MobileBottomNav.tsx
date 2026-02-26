'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, PlusCircle, Calendar, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types';

interface MobileBottomNavProps {
    role: UserRole;
}

export function MobileBottomNav({ role }: MobileBottomNavProps) {
    const pathname = usePathname();

    // Define navigation items based on role
    const getNavItems = () => {
        switch (role) {
            case 'MANAGER_CABANG':
                return [
                    { href: '/dashboard/employee', icon: LayoutDashboard, label: 'Home' },
                    { href: '/dashboard/employee/ai-reports', icon: Brain, label: 'AI Reports' },
                    { href: '/dashboard/employee/new', icon: PlusCircle, label: 'Buat', isPrimary: true },
                    { href: '/dashboard/employee/reports', icon: FileText, label: 'Laporan' },
                ];
            case 'STAFF_CABANG':
                return [
                    { href: '/dashboard/employee', icon: LayoutDashboard, label: 'Home' },
                    { href: '/dashboard/employee/reports', icon: FileText, label: 'Laporan' },
                    { href: '/dashboard/employee/new', icon: PlusCircle, label: 'Buat', isPrimary: true },
                ];
            case 'DIVISI_OT':
            case 'DIVISI_OP':
            case 'DIVISI_UQ':
            case 'DIVISI_HC':
            case 'DIVISI_HT':
                return [
                    { href: '/dashboard/admin', icon: LayoutDashboard, label: 'Home' },
                    { href: '/dashboard/admin/reports', icon: FileText, label: 'Laporan' },
                ];
            case 'DIVISI_OS':
                return [
                    { href: '/dashboard/os', icon: LayoutDashboard, label: 'Monitor' },
                    { href: '/dashboard/os/calendar', icon: Calendar, label: 'Events' },
                    { href: '/dashboard/os/meeting-calendar', icon: Calendar, label: 'Meeting' },
                    { href: '/dashboard/admin/reports', icon: FileText, label: 'Laporan' },
                ];
            case 'ANALYST':
                return [
                    { href: '/dashboard/analyst', icon: LayoutDashboard, label: 'Home' },
                    { href: '/dashboard/analyst/calendar', icon: Calendar, label: 'Events' },
                    { href: '/dashboard/employee/new', icon: PlusCircle, label: 'Buat', isPrimary: true },
                    { href: '/dashboard/analyst/meeting-calendar', icon: Calendar, label: 'Meeting' },
                    { href: '/dashboard/analyst/reports', icon: FileText, label: 'Laporan' },
                ];
            case 'SUPER_ADMIN':
                return [
                    { href: '/dashboard/admin', icon: LayoutDashboard, label: 'Home' },
                    { href: '/dashboard/admin/reports', icon: FileText, label: 'Laporan' },
                    { href: '/dashboard/admin/users', icon: FileText, label: 'Users' },
                ];
            default:
                return [
                    { href: '/dashboard/admin', icon: LayoutDashboard, label: 'Home' },
                    { href: '/dashboard/admin/reports', icon: FileText, label: 'Laporan' },
                ];
        }
    };

    const navItems = getNavItems();

    return (
        <nav className="md:hidden mobile-bottom-nav">
            {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                
                if (item.isPrimary) {
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "relative flex flex-col items-center justify-center",
                                "-mt-6 z-10"
                            )}
                        >
                            <div 
                                className={cn(
                                    "w-14 h-14 rounded-full flex items-center justify-center shadow-lg",
                                    "bg-gradient-to-br from-[var(--brand-gradient-start)] to-[var(--brand-gradient-end)]",
                                    "text-white"
                                )}
                                style={{ boxShadow: 'var(--shadow-brand)' }}
                            >
                                <Icon size={24} />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wide mt-1 text-[var(--brand-primary)]">
                                {item.label}
                            </span>
                        </Link>
                    );
                }
                
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "mobile-nav-item relative",
                            isActive && "active"
                        )}
                    >
                        <Icon size={20} />
                        <span>{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
