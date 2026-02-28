'use client';

import { redirect } from 'next/navigation';

export default function OPReportsPage() {
    redirect('/dashboard/op?view=reports');
}
