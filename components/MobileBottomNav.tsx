'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, PlusCircle, BarChart3, User } from 'lucide-react';
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
            case 'BRANCH_USER':
                return [
                    { href: '/dashboard/employee', icon: LayoutDashboard, label: 'Home' },
                    { href: '/dashboard/employee/reports', icon: FileText, label: 'Laporan' },
                    { href: '/dashboard/employee/new', icon: PlusCircle, label: 'Buat', isPrimary: true },
                ];
            case 'OT_ADMIN':
            case 'OP_ADMIN':
            case 'UQ_ADMIN':
                return [
                    { href: '/dashboard/admin', icon: LayoutDashboard, label: 'Home' },
                    { href: '/dashboard/admin/reports', icon: FileText, label: 'Laporan' },
                ];
            case 'OS_ADMIN':
                return [
                    { href: '/dashboard/os', icon: LayoutDashboard, label: 'Monitor' },
                    { href: '/dashboard/admin/reports', icon: FileText, label: 'Laporan' },
                ];
            case 'ANALYST':
                return [
                    { href: '/dashboard/analyst', icon: LayoutDashboard, label: 'Home' },
                    { href: '/dashboard/analyst/analytics', icon: BarChart3, label: 'Analitik' },
                    { href: '/dashboard/employee/new', icon: PlusCircle, label: 'Buat', isPrimary: true },
                    { href: '/dashboard/admin/reports', icon: FileText, label: 'Laporan' },
                ];
            case 'SUPER_ADMIN':
                return [
                    { href: '/dashboard/admin', icon: LayoutDashboard, label: 'Home' },
                    { href: '/dashboard/admin/analytics', icon: BarChart3, label: 'Analitik' },
                    { href: '/dashboard/admin/reports', icon: FileText, label: 'Laporan' },
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
