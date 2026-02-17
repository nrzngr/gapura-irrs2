'use client';

import { AnalyticsDashboard } from '@/components/dashboard/AnalyticsDashboard';
import { DIVISIONS } from '@/lib/constants/divisions';

export default function HTDashboard() {
    return <AnalyticsDashboard division={DIVISIONS.HT} />;
}
