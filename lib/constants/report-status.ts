/**
 * Report Status Constants
 * Defines the lifecycle states for the feedback loop system
 */

import { 
    AlertTriangle, 
    AlertCircle, 
    Shield,
    CheckCircle,
    Loader,
    Eye,
    CheckCircle2,
    RotateCcw,
    LucideIcon 
} from 'lucide-react';

export const REPORT_STATUS = {
    OPEN: 'OPEN',                           // Baru masuk, menunggu ACC
    ACKNOWLEDGED: 'ACKNOWLEDGED',           // Partner sudah ACC
    ON_PROGRESS: 'ON_PROGRESS',             // Sedang dikerjakan
    WAITING_VALIDATION: 'WAITING_VALIDATION', // Menunggu validasi OS
    CLOSED: 'CLOSED',                       // Selesai final
    RETURNED: 'RETURNED',                   // Ditolak, perlu revisi
    REJECTED: 'REJECTED',                   // Ditolak permanen
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
    bgClass?: string; // added for compatibility
    textClass?: string; // added for compatibility
    borderClass?: string; // added for compatibility
}> = {
    OPEN: {
        label: 'Menunggu ACC',
        color: 'oklch(0.55 0.22 25)',      // Red
        bgColor: 'oklch(0.55 0.22 25 / 0.1)',
        icon: AlertCircle,
        description: 'Laporan baru, menunggu respon Partner',
        bgClass: 'bg-red-50',
        textClass: 'text-red-700',
        borderClass: 'border-red-200',
    },
    ACKNOWLEDGED: {
        label: 'Sudah di-ACC',
        color: 'oklch(0.65 0.18 85)',      // Yellow/Amber
        bgColor: 'oklch(0.65 0.18 85 / 0.1)',
        icon: CheckCircle,
        description: 'Partner sudah menerima, sedang dipelajari',
        bgClass: 'bg-yellow-50',
        textClass: 'text-yellow-700',
        borderClass: 'border-yellow-200',
    },
    ON_PROGRESS: {
        label: 'Sedang Dikerjakan',
        color: 'oklch(0.55 0.20 240)',     // Blue
        bgColor: 'oklch(0.55 0.20 240 / 0.1)',
        icon: Loader,
        description: 'Partner sedang mengerjakan di lapangan',
        bgClass: 'bg-blue-50',
        textClass: 'text-blue-700',
        borderClass: 'border-blue-200',
    },
    WAITING_VALIDATION: {
        label: 'Menunggu Verifikasi',
        color: 'oklch(0.55 0.22 280)',     // Purple
        bgColor: 'oklch(0.55 0.22 280 / 0.1)',
        icon: Eye,
        description: 'Partner sudah selesai, menunggu validasi OS',
        bgClass: 'bg-purple-50',
        textClass: 'text-purple-700',
        borderClass: 'border-purple-200',
    },
    CLOSED: {
        label: 'Selesai',
        color: 'oklch(0.55 0.18 145)',     // Green
        bgColor: 'oklch(0.55 0.18 145 / 0.1)',
        icon: CheckCircle2,
        description: 'Masalah sudah terselesaikan dan divalidasi',
        bgClass: 'bg-green-50',
        textClass: 'text-green-700',
        borderClass: 'border-green-200',
    },
    RETURNED: {
        label: 'Dikembalikan',
        color: 'oklch(0.60 0.18 45)',      // Orange
        bgColor: 'oklch(0.60 0.18 45 / 0.1)',
        icon: RotateCcw,
        description: 'Bukti ditolak, perlu revisi dari Partner',
        bgClass: 'bg-orange-50',
        textClass: 'text-orange-700',
        borderClass: 'border-orange-200',
    },
    REJECTED: {
        label: 'Ditolak',
        color: 'oklch(0.55 0.22 25)',      // Red
        bgColor: 'oklch(0.55 0.22 25 / 0.1)',
        icon: AlertCircle,
        description: 'Laporan ditolak permanen',
        bgClass: 'bg-red-50',
        textClass: 'text-red-700',
        borderClass: 'border-red-200',
    },
};

/**
 * Priority levels for SLA calculation
 * Complexity: Time O(1) | Space O(1)
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
        color: 'oklch(0.55 0.18 145)',      // Green
        bgColor: 'oklch(0.55 0.18 145 / 0.1)',
        slaHours: 168,                       // 7 days
        description: 'Non-urgent, standard handling',
    },
    medium: {
        label: 'Sedang',
        labelShort: 'Med',
        color: 'oklch(0.65 0.18 85)',       // Yellow/Amber
        bgColor: 'oklch(0.65 0.18 85 / 0.1)',
        slaHours: 72,                        // 3 days
        description: 'Requires attention within 3 days',
    },
    high: {
        label: 'Tinggi',
        labelShort: 'High',
        color: 'oklch(0.60 0.18 45)',       // Orange
        bgColor: 'oklch(0.60 0.18 45 / 0.1)',
        slaHours: 24,                        // 1 day
        description: 'Urgent action required within 24 hours',
    },
    urgent: {
        label: 'Kritis',
        labelShort: 'URGENT',
        color: 'oklch(0.55 0.22 25)',       // Red
        bgColor: 'oklch(0.55 0.22 25 / 0.1)',
        slaHours: 4,                         // 4 hours
        description: 'Critical - immediate response required',
    },
};

/**
 * @deprecated Legacy config for backward compatibility.
 * For new code, use PRIORITY_CONFIG which includes SLA information.
 * Maps directly to severity levels for UI display.
 * Complexity: Time O(1) | Space O(1)
 */
export const SEVERITY_CONFIG = {
    urgent: { label: 'Urgent', color: 'oklch(0.55 0.22 25)', bg: 'oklch(0.55 0.22 25 / 0.12)', icon: AlertTriangle },
    high: { label: 'High', color: 'oklch(0.55 0.18 25)', bg: 'oklch(0.55 0.18 25 / 0.12)', icon: AlertTriangle },
    medium: { label: 'Medium', color: 'oklch(0.70 0.14 75)', bg: 'oklch(0.70 0.14 75 / 0.12)', icon: AlertCircle },
    low: { label: 'Low', color: 'oklch(0.55 0.14 160)', bg: 'oklch(0.55 0.14 160 / 0.12)', icon: Shield },
};

/**
 * Calculate SLA deadline from creation time and priority
 * Complexity: Time O(1) | Space O(1)
 */
export function calculateSlaDeadline(createdAt: Date | string, priority: ReportPriority): Date {
    const created = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
    const slaHours = PRIORITY_CONFIG[priority].slaHours;
    return new Date(created.getTime() + slaHours * 60 * 60 * 1000);
}

/**
 * Get SLA status (remaining time or breach)
 * Complexity: Time O(1) | Space O(1)
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
        remainingText: isBreached ? `Leqwat ${remainingText}` : remainingText,
    };
}

/**
 * Get allowed status transitions based on current status and user role
 * Division admins (OT, OP, UQ) can close reports directly with evidence upload
 */
export function getAllowedTransitions(
    currentStatus: ReportStatus,
    userRole: string
): ReportStatus[] {
    const isPartner = userRole === 'PARTNER_ADMIN';
    const isOSAdmin = userRole === 'OS_ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'OSC_LEAD';
    const isDivisionAdmin = userRole === 'OT_ADMIN' || userRole === 'OP_ADMIN' || userRole === 'UQ_ADMIN';

    switch (currentStatus) {
        case 'OPEN':
            // Partner or Division Admin can ACK
            if (isPartner || isDivisionAdmin) return ['ACKNOWLEDGED'];
            return [];

        case 'ACKNOWLEDGED':
            // Partner or Division Admin can start work
            if (isPartner || isDivisionAdmin) return ['ON_PROGRESS'];
            return [];

        case 'ON_PROGRESS':
            // Partner submits for validation, Division Admin can close directly (with evidence at UI level)
            if (isDivisionAdmin) return ['CLOSED', 'WAITING_VALIDATION'];
            if (isPartner) return ['WAITING_VALIDATION'];
            return [];

        case 'WAITING_VALIDATION':
            // OS Admin or Division Admin can approve or return
            if (isOSAdmin || isDivisionAdmin) return ['CLOSED', 'RETURNED'];
            return [];

        case 'RETURNED':
            // Partner or Division Admin can resubmit
            if (isPartner || isDivisionAdmin) return ['ON_PROGRESS'];
            return [];

        case 'CLOSED':
            // Final state, no transitions
            return [];

        default:
            return [];
    }
}

/**
 * Check if user can perform specific action on report
 * Division admins (OT, OP, UQ) have extended permissions to handle reports directly
 */
export function canPerformAction(
    action: 'acknowledge' | 'start' | 'submit_evidence' | 'validate' | 'return' | 'comment' | 'close',
    currentStatus: ReportStatus,
    userRole: string,
    targetDivision?: string,
    userDivision?: string
): boolean {
    const isPartner = userRole === 'PARTNER_ADMIN';
    const isOSAdmin = userRole === 'OS_ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'OSC_LEAD';
    const isDivisionAdmin = userRole === 'OT_ADMIN' || userRole === 'OP_ADMIN' || userRole === 'UQ_ADMIN';
    const isBranchUser = userRole === 'BRANCH_USER';

    // Division check for Partner - must match target division
    const isDivisionMatch = !isPartner || !targetDivision || !userDivision || 
        targetDivision === userDivision || userDivision === 'GENERAL';

    switch (action) {
        case 'acknowledge':
            return (isPartner && isDivisionMatch && currentStatus === 'OPEN') ||
                   (isDivisionAdmin && currentStatus === 'OPEN');

        case 'start':
            return (isPartner && isDivisionMatch && currentStatus === 'ACKNOWLEDGED') ||
                   (isDivisionAdmin && currentStatus === 'ACKNOWLEDGED');

        case 'submit_evidence':
            return (isPartner && isDivisionMatch && (currentStatus === 'ON_PROGRESS' || currentStatus === 'RETURNED')) ||
                   (isDivisionAdmin && (currentStatus === 'ON_PROGRESS' || currentStatus === 'RETURNED'));

        case 'validate':
            return (isOSAdmin && currentStatus === 'WAITING_VALIDATION') ||
                   (isDivisionAdmin && currentStatus === 'WAITING_VALIDATION');

        case 'return':
            return (isOSAdmin && currentStatus === 'WAITING_VALIDATION') ||
                   (isDivisionAdmin && currentStatus === 'WAITING_VALIDATION');

        case 'close':
            // Division admin can close directly from ON_PROGRESS (requires evidence at UI level)
            return isDivisionAdmin && (currentStatus === 'ON_PROGRESS' || currentStatus === 'WAITING_VALIDATION');

        case 'comment':
            // All can comment except when closed
            return (isPartner || isOSAdmin || isDivisionAdmin || isBranchUser) && currentStatus !== 'CLOSED';

        default:
            return false;
    }
}
