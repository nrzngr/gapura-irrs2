'use client';

import { Plane } from 'lucide-react';
import { DivisionReportsPage } from '@/components/dashboard/DivisionReportsPage';

export default function OPReportsPage() {
    return (
        <DivisionReportsPage
            config={{
                code: 'OP',
                name: 'Laporan Operasi',
                color: '#06b6d4',
                subtitle: 'Kelola laporan operasional penerbangan',
                icon: Plane,
                userRole: 'DIVISI_OP',
                basePath: '/dashboard/op/reports',
            }}
        />
    );
}
