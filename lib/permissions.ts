import { UserRole, DivisionType } from '@/types';

// ==========================================
// RBAC Permission Utilities
// ==========================================

/**
 * Role hierarchy level (higher = more access)
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
    BRANCH_USER: 1,
    OS_ADMIN: 2,
    OT_ADMIN: 2,
    OP_ADMIN: 2,
    UQ_ADMIN: 2,
    PARTNER_ADMIN: 2,
    ANALYST: 3,
    SUPER_ADMIN: 4,
};

/**
 * Check if user can export data (Excel/PDF)
 * OS_ADMIN (Central Analyst), ANALYST, and SUPER_ADMIN per requirements
 */
export const canExportData = (role: UserRole): boolean =>
    role === 'OS_ADMIN' || role === 'ANALYST' || role === 'SUPER_ADMIN';

/**
 * Check if user can access admin dashboard
 * All except BRANCH_USER
 */
export const canAccessAdminDashboard = (role: UserRole): boolean =>
    ROLE_HIERARCHY[role] >= 2;

/**
 * Check if user can execute/update report status
 * OT_ADMIN, OP_ADMIN, UQ_ADMIN, ANALYST, SUPER_ADMIN
 */
export const canExecuteReport = (role: UserRole): boolean =>
    role === 'OT_ADMIN' || role === 'OP_ADMIN' || role === 'UQ_ADMIN' || role === 'ANALYST' || role === 'SUPER_ADMIN';

/**
 * Check if user can manage users (approve/reject/edit)
 * Only SUPER_ADMIN
 */
export const canManageUsers = (role: UserRole): boolean =>
    role === 'SUPER_ADMIN';

/**
 * Check if user can manage master data (stations, categories)
 * Only SUPER_ADMIN
 */
export const canManageMasterData = (role: UserRole): boolean =>
    role === 'SUPER_ADMIN';

/**
 * Check if user can view audit logs
 * Only SUPER_ADMIN
 */
export const canViewAuditLogs = (role: UserRole): boolean =>
    role === 'SUPER_ADMIN';

/**
 * Check if user can create reports
 * BRANCH_USER (station-scoped), ANALYST (HQ reports), SUPER_ADMIN
 */
export const canCreateReport = (role: UserRole): boolean =>
    role === 'BRANCH_USER' || role === 'ANALYST' || role === 'SUPER_ADMIN' || role === 'OS_ADMIN';

/**
 * Check if user has global data access (all stations)
 * All except BRANCH_USER
 */
export const hasGlobalAccess = (role: UserRole): boolean =>
    ROLE_HIERARCHY[role] >= 2;

/**
 * Get the redirect path after login based on role
 */
export const getLoginRedirectPath = (role: UserRole): string => {
    if (role === 'BRANCH_USER') {
        return '/dashboard/employee';
    }
    return '/dashboard/admin';
};

/**
 * Division labels for UI display
 */
export const DIVISION_LABELS: Record<DivisionType, string> = {
    GENERAL: 'Umum',
    OS: 'Operational Services',
    OT: 'Teknik (GSE)',
    OP: 'Operasi',
    UQ: 'Quality (Safety)',
};

/**
 * Role labels for UI display
 */
export const ROLE_LABELS: Record<UserRole, string> = {
    BRANCH_USER: 'Petugas Cabang',
    OS_ADMIN: 'OS Admin',
    OT_ADMIN: 'OT Admin',
    OP_ADMIN: 'OP Admin',
    UQ_ADMIN: 'UQ Admin',
    ANALYST: 'Analyst',
    SUPER_ADMIN: 'Super Admin',
    PARTNER_ADMIN: 'Partner Admin',
};

/**
 * Role descriptions for tooltips/help text
 */
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
    BRANCH_USER: 'Akses terbatas pada station sendiri. Dapat membuat laporan.',
    OS_ADMIN: 'Central Analyst. Full superview, export data, monitoring global.',
    OT_ADMIN: 'Eksekutor divisi OT. Dapat mengubah status laporan divisi OT.',
    OP_ADMIN: 'Eksekutor divisi OP. Dapat mengubah status laporan divisi OP.',
    UQ_ADMIN: 'Eksekutor divisi UQ. Dapat mengubah status laporan divisi UQ.',
    ANALYST: 'Kepala divisi. Akses global + export data.',
    SUPER_ADMIN: 'Full access. Kelola user dan master data.',
    PARTNER_ADMIN: 'Akses terbatas partner. Dashboard monitoring partner.',
};
