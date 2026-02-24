'use client';

import { Wrench } from 'lucide-react';
import { DivisionReportsPage } from '@/components/dashboard/DivisionReportsPage';

export default function OTReportsPage() {
    return (
        <DivisionReportsPage
            config={{
                code: 'OT',
                name: 'Laporan Teknik',
                color: '#f59e0b',
                subtitle: 'Kelola laporan teknik dan GSE',
                icon: Wrench,
                userRole: 'DIVISI_OT',
                basePath: '/dashboard/ot/reports',
            }}
        />
    );
}
