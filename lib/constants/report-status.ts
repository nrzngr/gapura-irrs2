/**
 * Report Status Constants
 * Simplified 3-status lifecycle system
 */

import {
    AlertTriangle,
    AlertCircle,
    Shield,
    CheckCircle,
    CheckCircle2,
    Eye,
    Clock,
    LucideIcon
} from 'lucide-react';

export const REPORT_STATUS = {
    MENUNGGU_FEEDBACK: 'MENUNGGU_FEEDBACK',     // Menunggu feedback dari analyst
    SUDAH_DIVERIFIKASI: 'SUDAH_DIVERIFIKASI',   // Sudah diverifikasi analyst
    SELESAI: 'SELESAI',                           // Kasus selesai
} as const;

export type ReportStatus = typeof REPORT_STATUS[keyof typeof REPORT_STATUS];

/**
 * Status configuration for UI display
 */
export const STATUS_CONFIG: Record<ReportStatus, {
    label: string;
    color: string;
    bgColor: string;
    icon: LucideIcon;
    description: string;
    bgClass?: string;
    textClass?: string;
    borderClass?: string;
}> = {
    MENUNGGU_FEEDBACK: {
        label: 'Menunggu Feedback',
        color: 'oklch(0.65 0.18 85)',      // Amber
        bgColor: 'oklch(0.65 0.18 85 / 0.1)',
        icon: Clock,
        description: 'Menunggu feedback dari analyst',
        bgClass: 'bg-amber-50',
        textClass: 'text-amber-700',
        borderClass: 'border-amber-200',
    },
    SUDAH_DIVERIFIKASI: {
        label: 'Sudah Diverifikasi',
        color: 'oklch(0.55 0.20 240)',     // Blue
        bgColor: 'oklch(0.55 0.20 240 / 0.1)',
        icon: Eye,
        description: 'Laporan sudah diverifikasi, menunggu penyelesaian',
        bgClass: 'bg-blue-50',
        textClass: 'text-blue-700',
        borderClass: 'border-blue-200',
    },
    SELESAI: {
        label: 'Selesai',
        color: 'oklch(0.55 0.18 145)',     // Green
        bgColor: 'oklch(0.55 0.18 145 / 0.1)',
        icon: CheckCircle2,
        description: 'Kasus telah diselesaikan',
        bgClass: 'bg-green-50',
        textClass: 'text-green-700',
        borderClass: 'border-green-200',
    },
};

/**
 * Priority levels for SLA calculation
 */
export type ReportPriority = 'low' | 'medium' | 'high' | 'urgent';

export const PRIORITY_CONFIG: Record<ReportPriority, {
    label: string;
    labelShort: string;
    color: string;
    bgColor: string;
    slaHours: number;
    description: string;
}> = {
    low: {
        label: 'Rendah',
        labelShort: 'Low',
        color: 'oklch(0.55 0.18 145)',
        bgColor: 'oklch(0.55 0.18 145 / 0.1)',
        slaHours: 168,
        description: 'Non-urgent, standard handling',
    },
    medium: {
        label: 'Sedang',
        labelShort: 'Med',
        color: 'oklch(0.65 0.18 85)',
        bgColor: 'oklch(0.65 0.18 85 / 0.1)',
        slaHours: 72,
        description: 'Requires attention within 3 days',
    },
    high: {
        label: 'Tinggi',
        labelShort: 'High',
        color: 'oklch(0.60 0.18 45)',
        bgColor: 'oklch(0.60 0.18 45 / 0.1)',
        slaHours: 24,
        description: 'Urgent action required within 24 hours',
    },
    urgent: {
        label: 'Kritis',
        labelShort: 'URGENT',
        color: 'oklch(0.55 0.22 25)',
        bgColor: 'oklch(0.55 0.22 25 / 0.1)',
        slaHours: 4,
        description: 'Critical - immediate response required',
    },
};

/**
 * @deprecated Legacy config for backward compatibility.
 */
export const SEVERITY_CONFIG = {
    urgent: { label: 'Urgent', color: 'oklch(0.55 0.22 25)', bg: 'oklch(0.55 0.22 25 / 0.12)', icon: AlertTriangle },
    high: { label: 'High', color: 'oklch(0.55 0.18 25)', bg: 'oklch(0.55 0.18 25 / 0.12)', icon: AlertTriangle },
    medium: { label: 'Medium', color: 'oklch(0.70 0.14 75)', bg: 'oklch(0.70 0.14 75 / 0.12)', icon: AlertCircle },
    low: { label: 'Low', color: 'oklch(0.55 0.14 160)', bg: 'oklch(0.55 0.14 160 / 0.12)', icon: Shield },
};

/**
 * Calculate SLA deadline from creation time and priority
 */
export function calculateSlaDeadline(createdAt: Date | string, priority: ReportPriority): Date {
    const created = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
    const slaHours = PRIORITY_CONFIG[priority].slaHours;
    return new Date(created.getTime() + slaHours * 60 * 60 * 1000);
}

/**
 * Get SLA status (remaining time or breach)
 */
export function getSlaStatus(slaDeadline: Date | string | null): {
    isBreached: boolean;
    remainingMs: number;
    remainingText: string;
} {
    if (!slaDeadline) {
        return { isBreached: false, remainingMs: 0, remainingText: '-' };
    }

    const deadline = typeof slaDeadline === 'string' ? new Date(slaDeadline) : slaDeadline;
    const now = new Date();
    const remainingMs = deadline.getTime() - now.getTime();
    const isBreached = remainingMs < 0;

    const absMs = Math.abs(remainingMs);
    const hours = Math.floor(absMs / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    let remainingText: string;
    if (days > 0) {
        remainingText = `${days}d ${remainingHours}h`;
    } else if (hours > 0) {
        remainingText = `${hours}h`;
    } else {
        const minutes = Math.floor(absMs / (1000 * 60));
        remainingText = `${minutes}m`;
    }

    return {
        isBreached,
        remainingMs,
        remainingText: isBreached ? `Lewat ${remainingText}` : remainingText,
    };
}

/**
 * Get allowed status transitions based on current status and user role
 * Only ANALYST can change statuses
 */
export function getAllowedTransitions(
    currentStatus: ReportStatus | string,
    userRole: string
): ReportStatus[] {
    const isAnalyst = userRole === 'ANALYST' || userRole === 'SUPER_ADMIN';

    if (!isAnalyst) return [];

    switch (currentStatus) {
        case 'MENUNGGU_FEEDBACK':
            return ['SUDAH_DIVERIFIKASI'];

        case 'SUDAH_DIVERIFIKASI':
            return ['SELESAI'];

        case 'SELESAI':
            return ['MENUNGGU_FEEDBACK']; // Reopen

        default:
            return [];
    }
}

/**
 * Check if user can perform specific action on report
 * Analyst controls ALL status changes. Other roles can only view and comment.
 */
export function canPerformAction(
    action: 'verify' | 'close' | 'reopen' | 'comment',
    currentStatus: ReportStatus | string,
    userRole: string,
    _targetDivision?: string,
    _userDivision?: string
): boolean {
    const isAnalyst = userRole === 'ANALYST' || userRole === 'SUPER_ADMIN';

    switch (action) {
        case 'verify':
            return isAnalyst && currentStatus === 'MENUNGGU_FEEDBACK';

        case 'close':
            return isAnalyst && currentStatus === 'SUDAH_DIVERIFIKASI';

        case 'reopen':
            return isAnalyst && currentStatus === 'SELESAI';

        case 'comment':
            return true; // Everyone can comment

        default:
            return false;
    }
}
