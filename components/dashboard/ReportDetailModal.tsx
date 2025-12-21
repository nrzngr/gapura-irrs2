'use client';

import { X } from 'lucide-react';
import { type Report } from '@/types';
import { ReportDetailView } from './ReportDetailView';
import { cn } from '@/lib/utils';
import { SEVERITY_CONFIG } from '@/lib/constants/report-status'; // Keep if needed for header, but ReportDetailView handles most.

interface ReportDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    report: Report | null;
    onUpdateStatus?: (reportId: string, status: string) => Promise<void>;
    userRole?: string;
}

export function ReportDetailModal({ isOpen, onClose, report, onUpdateStatus, userRole = 'PARTNER_ADMIN' }: ReportDetailModalProps) {
    if (!isOpen || !report) return null;

    const severityKey = report.severity || report.priority || 'medium';
    // const severityCfg = SEVERITY_CONFIG[severityKey as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.medium;
    // Actually ReportDetailView handles its own viewing. 
    // We can just render ReportDetailView inside a modal wrapper.
    // But ReportDetailView might expect to fill the container.

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
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
                    
                    {/* Render ReportDetailView */}
                    <div className="flex-1 overflow-auto bg-gray-50/50">
                        <ReportDetailView 
                            report={report} 
                            onUpdateStatus={onUpdateStatus}
                            isModal={true}
                            userRole={userRole}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

