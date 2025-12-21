'use client';

import { useState, useCallback } from 'react';
import type { Report } from '@/types';

interface UseReportsOptions {
    endpoint?: string;
    autoFetch?: boolean;
}

interface UseReportsReturn {
    reports: Report[];
    loading: boolean;
    error: string | null;
    fetchReports: () => Promise<void>;
    updateStatus: (reportId: string, action: string) => Promise<boolean>;
    refresh: () => Promise<void>;
}

/**
 * useReports - Centralized hook for report fetching and status updates
 * Eliminates duplicate fetchReports/handleUpdateStatus logic across dashboards
 * Complexity: Time O(n) for fetch | Space O(n) for storing reports
 */
export function useReports(options: UseReportsOptions = {}): UseReportsReturn {
    const { endpoint = '/api/reports' } = options;
    
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchReports = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(endpoint);
            if (res.ok) {
                const data = await res.json();
                setReports(Array.isArray(data) ? data : []);
            } else {
                setError('Failed to fetch reports');
                setReports([]);
            }
        } catch (err) {
            console.error('Fetch error:', err);
            setError('Network error');
            setReports([]);
        } finally {
            setLoading(false);
        }
    }, [endpoint]);

    const updateStatus = useCallback(async (reportId: string, action: string): Promise<boolean> => {
        try {
            const res = await fetch(`/api/reports/${reportId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action })
            });
            
            if (res.ok) {
                await fetchReports();
                return true;
            } else {
                const err = await res.json();
                console.error('Failed to update status:', err);
                return false;
            }
        } catch (error) {
            console.error('Error updating status:', error);
            return false;
        }
    }, [fetchReports]);

    return {
        reports,
        loading,
        error,
        fetchReports,
        updateStatus,
        refresh: fetchReports
    };
}

/**
 * mapStatusToAction - Maps status string to API action
 * Complexity: Time O(1) | Space O(1)
 */
export function mapStatusToAction(status: string): string | null {
    const actionMap: Record<string, string> = {
        ACKNOWLEDGED: 'acknowledge',
        ON_PROGRESS: 'start',
        WAITING_VALIDATION: 'submit_evidence',
        CLOSED: 'validate',
        RETURNED: 'return',
    };
    return actionMap[status] || null;
}
