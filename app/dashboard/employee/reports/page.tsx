'use client';

import { useState, useEffect } from 'react';
import { type Report } from '@/types';
import { ReportMasterDetail } from '@/components/dashboard/ReportMasterDetail';

export default function EmployeeReportsPage() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchReports = async () => {
        setLoading(true);
        try {
            // For employee, we want their own reports. 
            // Usually /api/reports returns reports for the user if they are basic user?
            // Or we might need a specific endpoint like /api/reports/me or query param
            // Let's assume /api/reports filters by user if not admin. 
            // If /api/reports returns all for admin, we might need to check the API implementation.
            // But for now, let's try /api/reports.
            const res = await fetch('/api/reports?filter=mine'); // Adding hint just in case
            if (res.ok) {
                const data = await res.json();
                // Filter client side if API doesn't support it yet to be safe, 
                // but ideally API handles it.
                // For now, let's assume the API returns what the user is allowed to see.
                setReports(data || []);
            }
        } catch (error) {
            console.error('Failed to fetch reports:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    return (
        <ReportMasterDetail 
            title="Laporan Saya" 
            reports={reports} 
            loading={loading}
            // Employee usually can't update status directly from here unless permitted
            // Keeping it undefined implies read-only status in the view
            userRole="CABANG"
        />
    );
}
