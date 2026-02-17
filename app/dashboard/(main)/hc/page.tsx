'use client';

import { AnalyticsDashboard } from '@/components/dashboard/AnalyticsDashboard';
import { DIVISIONS } from '@/lib/constants/divisions';

export default function HCDashboard() {
    return <AnalyticsDashboard division={DIVISIONS.HC} />;
}
