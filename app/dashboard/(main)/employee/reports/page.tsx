'use client';

import { useState, useEffect } from 'react';
import { type Report, type UserRole } from '@/types';
import { ReportMasterDetail } from '@/components/dashboard/ReportMasterDetail';
import { canExportBranchData } from '@/lib/permissions';

interface UserSession {
    id: string;
    role: UserRole;
    full_name: string;
    station_id?: string;
}

export default function EmployeeReportsPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [userSession, setUserSession] = useState<UserSession | null>(null);

    // Fetch current user session with station info
    useEffect(() => {
        const fetchSession = async () => {
            try {
                const res = await fetch('/api/auth/me');
                if (res.ok) {
                    const userData = await res.json();
                    if (userData.id) {
                        setUserSession({
                            id: userData.id,
                            role: userData.role,
                            full_name: userData.full_name,
                            station_id: userData.station_id,
                        });
                    }
                }
            } catch (error) {
                console.error('Failed to fetch session:', error);
            }
        };
        fetchSession();
    }, []);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/reports');
            if (res.ok) {
                const data = await res.json();
                const allReports = data || [];

                // Client-side filtering based on role
                if (userSession) {
                    if (userSession.role === 'STAFF_CABANG') {
                        // STAFF_CABANG: Only show own reports
                        const filteredReports = allReports.filter((r: Report) => r.user_id === userSession.id);
                        setReports(filteredReports);
                    } else if (userSession.role === 'MANAGER_CABANG' && userSession.station_id) {
                        // MANAGER_CABANG: Show all reports from same station
                        const filteredReports = allReports.filter((r: Report) => r.station_id === userSession.station_id);
                        setReports(filteredReports);
                    } else {
                        // Other roles: Show all reports (API already filters appropriately)
                        setReports(allReports);
                    }
                } else {
                    // If no session yet, show all (will be filtered when session loads)
                    setReports(allReports);
                }
            }
        } catch (error) {
            console.error('Failed to fetch reports:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userSession) {
            fetchReports();
        }
    }, [userSession]);

    // Determine user role for ReportDetailView
    // ReportDetailView uses simplified role strings, but we pass the actual role
    // and it will need to handle MANAGER_CABANG and STAFF_CABANG
    const displayRole = userSession?.role || 'STAFF_CABANG';

    return (
        <ReportMasterDetail
            title="Laporan Saya"
            reports={reports}
            loading={loading}
            // Pass actual role so export buttons can be conditionally shown based on canExportBranchData
            userRole={displayRole}
        />
    );
}
