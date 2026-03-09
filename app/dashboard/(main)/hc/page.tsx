'use client';

import { DivisionAnalystDashboard } from '@/components/dashboard/DivisionAnalystDashboard';
import { DIVISIONS } from '@/lib/constants/divisions';

export default function HCDashboard() {
    return <DivisionAnalystDashboard division={DIVISIONS.HC} />;
}
