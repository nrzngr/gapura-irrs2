'use client';

import { Shield } from 'lucide-react';
import { DivisionReportsPage } from '@/components/dashboard/DivisionReportsPage';

export default function UQReportsPage() {
    return (
        <DivisionReportsPage
            config={{
                code: 'UQ',
                name: 'Laporan Quality',
                color: '#ec4899',
                subtitle: 'Kelola laporan kualitas dan keselamatan',
                icon: Shield,
                userRole: 'DIVISI_UQ',
                basePath: '/dashboard/uq/reports',
            }}
        />
    );
}
