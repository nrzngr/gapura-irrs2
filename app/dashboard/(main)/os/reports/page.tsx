'use client';

import { LayoutDashboard } from 'lucide-react';
import { DivisionReportsPage } from '@/components/dashboard/DivisionReportsPage';

export default function OSReportsPage() {
    return (
        <DivisionReportsPage
            config={{
                code: 'OS',
                name: 'Semua Laporan',
                color: '#10b981',
                subtitle: 'Monitoring laporan seluruh station',
                icon: LayoutDashboard,
                userRole: 'DIVISI_OS',
                basePath: '/dashboard/os/reports',
                apiEndpoint: '/api/admin/reports',
            }}
        />
    );
}
