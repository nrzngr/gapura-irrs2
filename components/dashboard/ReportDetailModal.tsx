'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { type Report } from '@/types';
import { ReportDetailView } from './ReportDetailView';

interface ReportDetailModalProps {
    isOpen?: boolean;
    onClose: () => void;
    report: Report | null;
    onUpdateStatus?: (reportId: string, status: string, notes?: string, evidenceUrl?: string) => Promise<void>;
    onRefresh?: () => Promise<void> | void;
    userRole?: string;
}

export function ReportDetailModal({ 
    isOpen, 
    onClose, 
    report: initialReport, 
    onUpdateStatus, 
    onRefresh, 
    userRole = 'PARTNER_ADMIN' 
}: ReportDetailModalProps) {
    const effectiveIsOpen = isOpen ?? !!initialReport;
    const [fullReport, setFullReport] = useState<Report | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Reset when modal closes or report changes
    useEffect(() => {
        if (!effectiveIsOpen || !initialReport) {
            setFullReport(null);
            return;
        }

        const fetchFullDetail = async () => {
            setLoadingDetail(true);
            try {
                const res = await fetch(`/api/reports/${initialReport.id}`);
                if (res.ok) {
                    const data = await res.json();
                    setFullReport(data);
                } else {
                     setFullReport(initialReport);
                }
            } catch (error) {
                console.error("Failed to fetch full report detail", error);
                setFullReport(initialReport);
            } finally {
                setLoadingDetail(false);
            }
        };

        fetchFullDetail();
    }, [effectiveIsOpen, initialReport]);

    if (!effectiveIsOpen || !initialReport || !mounted) return null;

    const displayReport = fullReport || initialReport;

    return createPortal(
        <div className="fixed top-0 left-0 w-screen h-[100dvh] z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div 
                className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-scale-in relative z-10 flex flex-col"
                style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}
            >
                <div className="relative flex-1 overflow-hidden flex flex-col">
                     <button 
                        onClick={onClose} 
                        className="absolute top-4 right-4 z-50 p-2.5 bg-black/5 hover:bg-black/10 rounded-full transition-all duration-200"
                    >
                        <X size={20} className="text-gray-600" />
                    </button>
                    
                    <div className="flex-1 overflow-auto bg-gray-50/50 relative">
                        {loadingDetail && (
                            <div className="absolute top-0 left-0 w-full h-1 bg-gray-100 overflow-hidden z-50">
                                <div className="h-full bg-emerald-500 animate-progress-indeterminate origin-left" />
                            </div>
                        )}
                        <ReportDetailView 
                            report={displayReport} 
                            onUpdateStatus={onUpdateStatus}
                            userRole={userRole}
                             onRefresh={(updatedReport?: Report) => {
                                 if (onRefresh) onRefresh();
                                 
                                 // Handle Report Transfer (ID Change)
                                 if (updatedReport && updatedReport.id && initialReport?.id && updatedReport.id !== initialReport.id) {
                                     // ID changed (moved to another sheet), so current ID is now invalid (404)
                                     // Best UX: Close modal as "context" is lost/changed
                                     onClose();
                                     return;
                                 }

                                 if (initialReport?.id) {
                                     fetch(`/api/reports/${initialReport.id}`)
                                        .then(res => {
                                            if (!res.ok) {
                                                if (res.status === 404) onClose(); // Auto-close if not found
                                                throw new Error('Failed to fetch');
                                            }
                                            return res.json();
                                        })
                                        .then(data => setFullReport(data))
                                        .catch(err => console.error("Error refreshing detail:", err));
                                 }
                             }}
                        />
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

