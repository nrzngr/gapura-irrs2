'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HCReportsPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/dashboard/hc?view=reports');
    }, [router]);
    return null;
}
