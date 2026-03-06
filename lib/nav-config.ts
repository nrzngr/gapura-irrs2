import { 
    LayoutDashboard, 
    FileText, 
    LogOut, 
    Plane, 
    Menu, 
    X, 
    ClipboardList, 
    Users, 
    ChevronRight, 
    Hash, 
    FolderOpen, 
    Shield, 
    Brain, 
    Inbox, 
    Calendar 
} from 'lucide-react';

export interface NavItemConfig {
    href: string;
    label: string;
    icon: any;
    count?: number;
    external?: boolean;
}

export interface NavGroupConfig {
    title: string;
    items: NavItemConfig[];
}

export const LINKS_CONFIG: Record<string, NavGroupConfig[]> = {
    'ADMIN': [
        {
            title: 'Overview',
            items: [
                { href: '/dashboard/admin', label: 'Dashboard', icon: LayoutDashboard },
                { href: '/dashboard/admin/security', label: 'Security', icon: Shield },
            ]
        },
        {
            title: 'Management',
            items: [
                { href: '/dashboard/admin/reports', label: 'Reports', icon: ClipboardList },
                { href: '/dashboard/admin/users', label: 'Users', icon: Users },
            ]
        }
    ],
    'EMPLOYEE': [
        {
            title: 'Workspace',
            items: [
                { href: '/dashboard/employee', label: 'Laporan Saya', icon: FileText },
                { href: '/dashboard/employee/new', label: 'Buat Laporan', icon: Plane },
                { href: '/dashboard/employee/quick-access', label: 'Quick Access', icon: ChevronRight },
            ]
        }
    ],
    'MANAGER': [
        {
            title: 'Workspace',
            items: [
                { href: '/dashboard/employee', label: 'Laporan Saya', icon: FileText },
                { href: '/dashboard/employee/new', label: 'Buat Laporan', icon: Plane },
                { href: '/dashboard/employee/quick-access', label: 'Quick Access', icon: ChevronRight },
            ]
        },
        {
            title: 'Analysis',
            items: [
                { href: '/dashboard/employee/ai-reports', label: 'AI Reports', icon: Brain },
            ]
        },
        {
            title: 'Management',
            items: [
                { href: '/dashboard/admin/users', label: 'Kelola Staff', icon: Users },
            ]
        }
    ],
    'OS': [
        {
            title: 'Monitoring',
            items: [
                { href: '/dashboard/os', label: 'Dashboard', icon: LayoutDashboard },
                { href: '/dashboard/os/dispatched', label: 'Laporan Divisi', icon: Inbox },
            ]
        },
        {
            title: 'Analysis',
            items: [
                { href: '/dashboard/os/ai-reports', label: 'AI Reports', icon: Brain },
            ]
        },
        {
            title: 'Schedule',
            items: [
                { href: '/dashboard/os/calendar', label: 'Event Calendar', icon: Calendar },
                { href: '/dashboard/os/meeting-calendar', label: 'Meeting Calendar', icon: Calendar },
            ]
        }
    ],
    'OT': [
        {
            title: 'Divisi Teknik',
            items: [
                { href: '/dashboard/ot', label: 'OT Dashboard', icon: LayoutDashboard },
                { href: '/dashboard/ot/dispatched', label: 'Laporan Divisi', icon: Inbox },
            ]
        },
        {
            title: 'Analysis',
            items: [
                { href: '/dashboard/ot/ai-reports', label: 'AI Reports', icon: Brain },
            ]
        }
    ],
    'OP': [
        {
            title: 'Divisi Operasi',
            items: [
                { href: '/dashboard/op', label: 'OP Dashboard', icon: LayoutDashboard },
                { href: '/dashboard/op/dispatched', label: 'Laporan Divisi', icon: Inbox },
            ]
        },
        {
            title: 'Analysis',
            items: [
                { href: '/dashboard/op/ai-reports', label: 'AI Reports', icon: Brain },
            ]
        }
    ],
    'UQ': [
        {
            title: 'Divisi Quality',
            items: [
                { href: '/dashboard/uq', label: 'UQ Dashboard', icon: LayoutDashboard },
                { href: '/dashboard/uq/dispatched', label: 'Laporan Divisi', icon: Inbox },
            ]
        },
        {
            title: 'Analysis',
            items: [
                { href: '/dashboard/uq/ai-reports', label: 'AI Reports', icon: Brain },
            ]
        }
    ],
    'HC': [
        {
            title: 'Human Capital',
            items: [
                { href: '/dashboard/hc', label: 'HC Dashboard', icon: LayoutDashboard },
                { href: '/dashboard/hc/dispatched', label: 'Laporan Divisi', icon: Inbox },
            ]
        }
    ],
    'HT': [
        {
            title: 'Human Training',
            items: [
                { href: '/dashboard/ht', label: 'HT Dashboard', icon: LayoutDashboard },
                { href: '/dashboard/ht/dispatched', label: 'Laporan Divisi', icon: Inbox },
            ]
        }
    ],
    'ANALYST': [
        {
            title: 'Command Center',
            items: [
                { href: '/dashboard/analyst', label: 'Dashboard', icon: LayoutDashboard },
                { href: '/dashboard/analyst/reports', label: 'Laporan', icon: ClipboardList },
                { href: '/dashboard/analyst/ai-reports', label: 'AI Reports', icon: Brain },
                { href: '/dashboard/analyst/builder', label: 'Explore & Build', icon: Hash },
                { href: '/dashboard/analyst/dashboards', label: 'Custom Dashboards', icon: FolderOpen },
                { href: '/dashboard/analyst/import', label: 'Import Data', icon: FolderOpen },
                { href: '/dashboard/employee/new', label: 'Buat Laporan', icon: Plane },
            ]
        },
        {
            title: 'Schedule',
            items: [
                { href: '/dashboard/analyst/calendar', label: 'Event Calendar', icon: Calendar },
                { href: '/dashboard/analyst/meeting-calendar', label: 'Meeting Calendar', icon: Calendar },
            ]
        }
    ]
};

export const GET_LINKS_KEY = (role: string): string => {
    const r = (role || '').toUpperCase();
    if (r.includes('SUPER') || r === 'ADMIN') return 'ADMIN';
    if (r === 'ANALYST') return 'ANALYST';
    if (r === 'MANAGER_CABANG') return 'MANAGER';
    if (r === 'DIVISI_OS' || r === 'PARTNER_OS') return 'OS';
    if (r === 'DIVISI_OT' || r === 'PARTNER_OT') return 'OT';
    if (r === 'DIVISI_OP' || r === 'PARTNER_OP') return 'OP';
    if (r === 'DIVISI_UQ' || r === 'PARTNER_UQ') return 'UQ';
    if (r === 'DIVISI_HC' || r === 'PARTNER_HC') return 'HC';
    if (r === 'DIVISI_HT' || r === 'PARTNER_HT') return 'HT';
    return 'EMPLOYEE';
};
