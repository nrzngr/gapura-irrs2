import { REPORT_STATUS, type ReportStatus } from '@/lib/constants/report-status';
import type { UserRole } from '@/types';

/**
 * Status transition rules per role
 * Maps current status to allowed next statuses based on user role
 * Complexity: Time O(1) | Space O(1)
 */
const TRANSITION_RULES: Record<ReportStatus, Partial<Record<UserRole, ReportStatus[]>>> = {
    OPEN: {
        PARTNER_ADMIN: ['ACKNOWLEDGED'],
    },
    ACKNOWLEDGED: {
        PARTNER_ADMIN: ['ON_PROGRESS'],
    },
    ON_PROGRESS: {
        PARTNER_ADMIN: ['WAITING_VALIDATION'],
    },
    WAITING_VALIDATION: {
        OS_ADMIN: ['CLOSED', 'RETURNED'],
        ANALYST: ['CLOSED', 'RETURNED'],
        SUPER_ADMIN: ['CLOSED', 'RETURNED'],
    },
    RETURNED: {
        PARTNER_ADMIN: ['ON_PROGRESS'],
    },
    CLOSED: {
        // Final state - no transitions allowed
    },
    REJECTED: {
        // Final state
    },
};

/**
 * Action to Status mapping
 * Maps frontend action names to actual status values
 */
export const ACTION_TO_STATUS: Record<string, ReportStatus> = {
    acknowledge: 'ACKNOWLEDGED',
    start: 'ON_PROGRESS',
    submit_evidence: 'WAITING_VALIDATION',
    validate: 'CLOSED',
    return: 'RETURNED',
    resubmit: 'ON_PROGRESS',
    reject: 'REJECTED',
};

interface ValidationResult {
    valid: boolean;
    error?: string;
    newStatus?: ReportStatus;
}

/**
 * Validate if a status transition is allowed
 * @param currentStatus - Current report status
 * @param action - Action being performed (e.g., 'acknowledge', 'validate')
 * @param userRole - Role of the user attempting the transition
 * @returns ValidationResult with valid flag and optional error message
 * 
 * Complexity: Time O(1) | Space O(1)
 */
export function validateStatusTransition(
    currentStatus: string,
    action: string,
    userRole: string
): ValidationResult {
    // Convert action to target status
    const targetStatus = ACTION_TO_STATUS[action];
    if (!targetStatus) {
        return { 
            valid: false, 
            error: `Invalid action: ${action}. Allowed: ${Object.keys(ACTION_TO_STATUS).join(', ')}` 
        };
    }

    // Validate current status is known
    if (!Object.values(REPORT_STATUS).includes(currentStatus as ReportStatus)) {
        return { 
            valid: false, 
            error: `Invalid current status: ${currentStatus}` 
        };
    }

    // Get allowed transitions for current status and role
    const allowedForRole = TRANSITION_RULES[currentStatus as ReportStatus]?.[userRole as UserRole];
    
    if (!allowedForRole || allowedForRole.length === 0) {
        return { 
            valid: false, 
            error: `Role ${userRole} cannot perform any actions on status ${currentStatus}` 
        };
    }

    if (!allowedForRole.includes(targetStatus)) {
        return { 
            valid: false, 
            error: `Cannot transition from ${currentStatus} to ${targetStatus} with role ${userRole}. Allowed: ${allowedForRole.join(', ')}` 
        };
    }

    return { valid: true, newStatus: targetStatus };
}

/**
 * Get timestamp field name for a status transition
 * Used to automatically set timestamps when status changes
 */
export function getTimestampFieldForStatus(status: ReportStatus): string | null {
    const fieldMap: Partial<Record<ReportStatus, string>> = {
        ACKNOWLEDGED: 'acknowledged_at',
        ON_PROGRESS: 'started_at',
        CLOSED: 'validated_at',
    };
    return fieldMap[status] || null;
}

/**
 * Get user field name for a status transition
 * Used to record who performed the action
 */
export function getUserFieldForStatus(status: ReportStatus): string | null {
    const fieldMap: Partial<Record<ReportStatus, string>> = {
        ACKNOWLEDGED: 'acknowledged_by',
        CLOSED: 'validated_by',
    };
    return fieldMap[status] || null;
}
