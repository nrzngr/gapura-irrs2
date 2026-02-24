'use client';

import { GraduationCap } from 'lucide-react';
import { DivisionReportsPage } from '@/components/dashboard/DivisionReportsPage';

export default function HTReportsPage() {
    return (
        <DivisionReportsPage
            config={{
                code: 'HT',
                name: 'Laporan Training',
                color: '#0ea5e9',
                subtitle: 'Kelola laporan pelatihan',
                icon: GraduationCap,
                userRole: 'DIVISI_HT',
                basePath: '/dashboard/ht/reports',
            }}
        />
    );
}
