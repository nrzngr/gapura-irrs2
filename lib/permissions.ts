import { UserRole, DivisionType } from '@/types';

// ==========================================
// RBAC Permission Utilities
// ==========================================

/**
 * Role hierarchy level (higher = more access)
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
    CABANG: 1,
    DIVISI_OS: 2,
    DIVISI_OT: 2,
    DIVISI_OP: 2,
    DIVISI_UQ: 2,
    DIVISI_HC: 2,
    DIVISI_HT: 2,
    ANALYST: 3,
    SUPER_ADMIN: 4,
};

/**
 * Check if user can export data (Excel/PDF)
 * DIVISI_OS, ANALYST, and SUPER_ADMIN per requirements
 */
export const canExportData = (role: UserRole): boolean =>
    role === 'DIVISI_OS' || role === 'ANALYST' || role === 'SUPER_ADMIN';

/**
 * Check if user can access admin dashboard
 * All except CABANG
 */
export const canAccessAdminDashboard = (role: UserRole): boolean =>
    ROLE_HIERARCHY[role] >= 2;

/**
 * Check if user can execute/update report status
 * Only ANALYST and SUPER_ADMIN can change statuses
 */
export const canExecuteReport = (role: UserRole): boolean =>
    role === 'ANALYST' || role === 'SUPER_ADMIN';

/**
 * Check if user can close a case (mark as SELESAI)
 * Only ANALYST and SUPER_ADMIN
 */
export const canCloseCase = (role: UserRole): boolean =>
    role === 'ANALYST' || role === 'SUPER_ADMIN';

/**
 * Check if user can reopen a case (SELESAI → MENUNGGU_FEEDBACK)
 * Only ANALYST and SUPER_ADMIN
 */
export const canReopenCase = (role: UserRole): boolean =>
    role === 'ANALYST' || role === 'SUPER_ADMIN';

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
 * CABANG (station-scoped), ANALYST (HQ reports), SUPER_ADMIN
 */
export const canCreateReport = (role: UserRole): boolean =>
    role === 'CABANG' || role === 'ANALYST' || role === 'SUPER_ADMIN' || role === 'DIVISI_OS';

/**
 * Check if user has global data access (all stations)
 * All except CABANG
 */
export const hasGlobalAccess = (role: UserRole): boolean =>
    ROLE_HIERARCHY[role] >= 2;

/**
 * Get the redirect path after login based on role
 */
export const getLoginRedirectPath = (role: UserRole): string => {
    if (role === 'CABANG') {
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
    HC: 'Human Capital',
    HT: 'Human Training',
};

/**
 * Role labels for UI display
 */
export const ROLE_LABELS: Record<UserRole, string> = {
    CABANG: 'Cabang',
    DIVISI_OS: 'Divisi OS',
    DIVISI_OT: 'Divisi OT',
    DIVISI_OP: 'Divisi OP',
    DIVISI_UQ: 'Divisi UQ',
    DIVISI_HC: 'Divisi HC',
    DIVISI_HT: 'Divisi HT',
    ANALYST: 'Analyst',
    SUPER_ADMIN: 'Super Admin',
};

/**
 * Role descriptions for tooltips/help text
 */
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
    CABANG: 'Akses terbatas pada station sendiri. Dapat membuat laporan.',
    DIVISI_OS: 'Divisi Operational Services. Full superview, export data, monitoring global.',
    DIVISI_OT: 'Divisi Teknik. Eksekutor laporan terkait GSE dan peralatan.',
    DIVISI_OP: 'Divisi Operasi. Eksekutor laporan terkait operasional.',
    DIVISI_UQ: 'Divisi Quality. Eksekutor laporan terkait safety dan quality.',
    DIVISI_HC: 'Divisi Human Capital. Eksekutor laporan terkait kepegawaian.',
    DIVISI_HT: 'Divisi Human Training. Eksekutor laporan terkait pelatihan.',
    ANALYST: 'Kepala divisi. Akses global + export data.',
    SUPER_ADMIN: 'Full access. Kelola user dan master data.',
};
