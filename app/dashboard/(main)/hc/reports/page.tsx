'use client';

import { Users } from 'lucide-react';
import { DivisionReportsPage } from '@/components/dashboard/DivisionReportsPage';

export default function HCReportsPage() {
    return (
        <DivisionReportsPage
            config={{
                code: 'HC',
                name: 'Laporan Human Capital',
                color: '#8b5cf6',
                subtitle: 'Kelola laporan Human Capital',
                icon: Users,
                userRole: 'DIVISI_HC',
                basePath: '/dashboard/hc/reports',
                enforceDivisionScope: false,
            }}
        />
    );
}
