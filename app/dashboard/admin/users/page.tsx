'use client';

import { useEffect, useState } from 'react';
import {
    Users, Search, RefreshCw, Check, X, Shield, User,
    Filter, ChevronDown, Mail, Calendar, Building2, Briefcase, Phone
} from 'lucide-react';

interface UserData {
    id: string;
    email: string;
    full_name: string;
    nik: string;
    phone: string;
    role: 'reporter' | 'supervisor' | 'investigator' | 'manager' | 'admin';
    status: 'pending' | 'active' | 'rejected';
    created_at: string;
    stations: { code: string; name: string } | null;
    units: { name: string } | null;
    positions: { name: string } | null;
}

const statusConfig = {
    pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    active: { label: 'Aktif', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-700 border-red-200' },
};

const roleConfig = {
    admin: { label: 'Admin', color: 'bg-purple-100 text-purple-700', icon: Shield },
    manager: { label: 'Manager', color: 'bg-blue-100 text-blue-700', icon: Briefcase },
    investigator: { label: 'Investigator', color: 'bg-cyan-100 text-cyan-700', icon: Search },
    supervisor: { label: 'Supervisor', color: 'bg-indigo-100 text-indigo-700', icon: Users },
    reporter: { label: 'Reporter', color: 'bg-slate-100 text-slate-700', icon: User },
};

export default function AdminUsersPage() {
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/users?status=${filter === 'all' ? '' : filter}`);
            const data = await res.json();
            setUsers(data);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [filter]);

    const updateUserStatus = async (userId: string, status: string) => {
        setActionLoading(userId);
        try {
            await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, status }),
            });
            fetchUsers();
        } catch (error) {
            alert('Gagal mengubah status');
        } finally {
            setActionLoading(null);
        }
    };

    const filteredUsers = users.filter(user =>
        user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        user.email?.toLowerCase().includes(search.toLowerCase()) ||
        user.nik?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Kelola User</h1>
                    <p className="text-slate-500 mt-1">Kelola semua pengguna dalam sistem</p>
                </div>
                <button
                    onClick={fetchUsers}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 font-medium hover:border-slate-300 hover:bg-slate-50 transition-all self-start"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Cari nama, email, atau NIK..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-200 bg-white focus:border-blue-500 focus:outline-none transition-colors"
                    />
                </div>
                <div className="relative">
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="appearance-none pl-10 pr-10 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-700 font-medium focus:border-blue-500 focus:outline-none cursor-pointer"
                    >
                        <option value="all">Semua Status</option>
                        <option value="pending">Pending</option>
                        <option value="active">Aktif</option>
                        <option value="rejected">Ditolak</option>
                    </select>
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-slate-100 p-4">
                    <p className="text-sm text-slate-500">Total User</p>
                    <p className="text-2xl font-bold text-slate-900">{users.length}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4">
                    <p className="text-sm text-emerald-600">Aktif</p>
                    <p className="text-2xl font-bold text-emerald-700">{users.filter(u => u.status === 'active').length}</p>
                </div>
                <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
                    <p className="text-sm text-amber-600">Pending</p>
                    <p className="text-2xl font-bold text-amber-700">{users.filter(u => u.status === 'pending').length}</p>
                </div>
                <div className="bg-purple-50 rounded-xl border border-purple-100 p-4">
                    <p className="text-sm text-purple-600">Admin</p>
                    <p className="text-2xl font-bold text-purple-700">{users.filter(u => u.role === 'admin').length}</p>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center">
                        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="p-12 text-center">
                        <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">Tidak ada user ditemukan</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Station / Unit</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredUsers.map((user) => {
                                    const RoleIcon = roleConfig[user.role]?.icon || User;
                                    return (
                                        <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold ${user.role === 'admin' ? 'bg-gradient-to-br from-purple-500 to-violet-600' : 'bg-gradient-to-br from-blue-500 to-cyan-500'}`}>
                                                        {user.full_name?.charAt(0).toUpperCase() || 'U'}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-900">{user.full_name}</p>
                                                        <p className="text-xs text-slate-500 flex items-center gap-1">
                                                            <Mail size={10} />
                                                            {user.email}
                                                        </p>
                                                        {user.nik && (
                                                            <p className="text-xs text-slate-400">NIK: {user.nik}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm">
                                                    {user.stations && (
                                                        <p className="font-medium text-slate-700 flex items-center gap-1">
                                                            <Building2 size={12} className="text-slate-400" />
                                                            {user.stations.code}
                                                        </p>
                                                    )}
                                                    {user.units && (
                                                        <p className="text-xs text-slate-500">{user.units.name}</p>
                                                    )}
                                                    {user.positions && (
                                                        <p className="text-xs text-slate-400">{user.positions.name}</p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${roleConfig[user.role]?.color || 'bg-slate-100 text-slate-700'}`}>
                                                    <RoleIcon size={12} />
                                                    {roleConfig[user.role]?.label || user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${statusConfig[user.status].color}`}>
                                                    {statusConfig[user.status].label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-end gap-2">
                                                    {user.status === 'pending' && (
                                                        <>
                                                            <button
                                                                onClick={() => updateUserStatus(user.id, 'rejected')}
                                                                disabled={actionLoading === user.id}
                                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                                                title="Tolak"
                                                            >
                                                                <X size={18} />
                                                            </button>
                                                            <button
                                                                onClick={() => updateUserStatus(user.id, 'active')}
                                                                disabled={actionLoading === user.id}
                                                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-white font-medium text-sm hover:bg-emerald-600 transition-colors disabled:opacity-50"
                                                            >
                                                                <Check size={16} />
                                                                Setujui
                                                            </button>
                                                        </>
                                                    )}
                                                    {user.status === 'active' && (
                                                        <button
                                                            onClick={() => updateUserStatus(user.id, 'rejected')}
                                                            disabled={actionLoading === user.id}
                                                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-200 text-red-600 font-medium text-sm hover:bg-red-50 transition-colors disabled:opacity-50"
                                                        >
                                                            <X size={16} />
                                                            Nonaktifkan
                                                        </button>
                                                    )}
                                                    {user.status === 'rejected' && (
                                                        <button
                                                            onClick={() => updateUserStatus(user.id, 'active')}
                                                            disabled={actionLoading === user.id}
                                                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-emerald-200 text-emerald-600 font-medium text-sm hover:bg-emerald-50 transition-colors disabled:opacity-50"
                                                        >
                                                            <Check size={16} />
                                                            Aktifkan
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
