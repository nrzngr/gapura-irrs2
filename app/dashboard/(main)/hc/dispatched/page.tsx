'use client';

import { Inbox } from 'lucide-react';
import { DivisionReportsPage } from '@/components/dashboard/DivisionReportsPage';

export default function HCDispatchedPage() {
    return (
        <DivisionReportsPage
            config={{
                code: 'HC',
                name: 'Laporan Divisi HC',
                color: '#8b5cf6',
                subtitle: 'Laporan yang ditujukan ke Divisi Human Capital',
                icon: Inbox,
                userRole: 'DIVISI_HC',
                basePath: '/dashboard/hc/dispatched',
                apiEndpoint: '/api/admin/reports?target_division=HC',
            }}
        />
    );
}
