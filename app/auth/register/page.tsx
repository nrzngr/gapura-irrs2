'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { User, Mail, Lock, UserPlus, Loader2, CheckCircle, Phone, Building2, Users, Briefcase, CreditCard } from 'lucide-react';

interface Station { id: string; code: string; name: string; }
interface Unit { id: string; name: string; }
interface Position { id: string; name: string; }

export default function RegisterPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        full_name: '',
        nik: '',
        phone: '',
        station_id: '',
        unit_id: '',
        position_id: '',
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    // Master data
    const [stations, setStations] = useState<Station[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [positions, setPositions] = useState<Position[]>([]);

    useEffect(() => {
        // Fetch master data
        const fetchMasterData = async () => {
            const [stationsRes, unitsRes, positionsRes] = await Promise.all([
                fetch('/api/master-data?type=stations'),
                fetch('/api/master-data?type=units'),
                fetch('/api/master-data?type=positions'),
            ]);
            setStations(await stationsRes.json());
            setUnits(await unitsRes.json());
            setPositions(await positionsRes.json());
        };
        fetchMasterData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Registrasi gagal');
            }

            setSuccess('Registrasi berhasil! Mohon tunggu persetujuan admin sebelum login.');
            setTimeout(() => {
                router.push('/auth/login');
            }, 3000);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Registrasi gagal';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
            {/* Decorative Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-400/20 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-lg relative animate-slide-up">
                {/* Logo & Header */}
                <div className="text-center mb-6">
                    <Image
                        src="/logo.png"
                        alt="Gapura Logo"
                        width={200}
                        height={80}
                        className="mx-auto mb-4 object-contain"
                    />
                    <h1 className="text-2xl font-bold text-slate-900">Registrasi Akun</h1>
                    <p className="text-slate-500 mt-1 text-sm">Bergabung dengan Gapura Operations</p>
                </div>

                {/* Register Card */}
                <div className="card p-6">
                    {error && (
                        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium flex items-start gap-2">
                            <span className="text-red-500">!</span>
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-medium flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                            {success}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Row 1: Nama & NIK */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="label text-xs">Nama Lengkap</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        required
                                        className="input pl-10 text-sm py-2.5"
                                        placeholder="Nama lengkap"
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="label text-xs">NIK</label>
                                <div className="relative">
                                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        required
                                        className="input pl-10 text-sm py-2.5"
                                        placeholder="Nomor Induk Karyawan"
                                        value={formData.nik}
                                        onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Email & Phone */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="label text-xs">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                    <input
                                        type="email"
                                        required
                                        className="input pl-10 text-sm py-2.5"
                                        placeholder="email@gapura.co.id"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="label text-xs">No. WhatsApp</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                    <input
                                        type="tel"
                                        required
                                        className="input pl-10 text-sm py-2.5"
                                        placeholder="08xxxxxxxxxx"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Row 3: Station */}
                        <div>
                            <label className="label text-xs">Station / Bandara</label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                <select
                                    required
                                    className="input pl-10 text-sm py-2.5 appearance-none cursor-pointer"
                                    value={formData.station_id}
                                    onChange={(e) => setFormData({ ...formData, station_id: e.target.value })}
                                >
                                    <option value="">Pilih Station</option>
                                    {stations.map((s) => (
                                        <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Row 4: Unit & Position */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="label text-xs">Unit / Divisi</label>
                                <div className="relative">
                                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                    <select
                                        required
                                        className="input pl-10 text-sm py-2.5 appearance-none cursor-pointer"
                                        value={formData.unit_id}
                                        onChange={(e) => setFormData({ ...formData, unit_id: e.target.value })}
                                    >
                                        <option value="">Pilih Unit</option>
                                        {units.map((u) => (
                                            <option key={u.id} value={u.id}>{u.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="label text-xs">Jabatan</label>
                                <div className="relative">
                                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                    <select
                                        required
                                        className="input pl-10 text-sm py-2.5 appearance-none cursor-pointer"
                                        value={formData.position_id}
                                        onChange={(e) => setFormData({ ...formData, position_id: e.target.value })}
                                    >
                                        <option value="">Pilih Jabatan</option>
                                        {positions.map((p) => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="label text-xs">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                <input
                                    type="password"
                                    required
                                    className="input pl-10 text-sm py-2.5"
                                    placeholder="Minimal 6 karakter"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !!success}
                            className="btn btn-primary w-full mt-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Memproses...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="w-5 h-5" />
                                    Daftar Sekarang
                                </>
                            )}
                        </button>
                    </form>

                    {/* Info Box */}
                    <div className="mt-4 p-3 rounded-xl bg-blue-50 border border-blue-100">
                        <p className="text-blue-700 text-xs">
                            <strong>Info:</strong> Setelah mendaftar, akun perlu disetujui admin sebelum dapat login.
                        </p>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                        <p className="text-slate-500 text-sm">
                            Sudah punya akun?{' '}
                            <Link href="/auth/login" className="text-blue-600 font-semibold hover:text-blue-700">
                                Masuk disini
                            </Link>
                        </p>
                    </div>
                </div>

                <p className="text-center text-slate-400 text-xs mt-6">
                    © 2025 Gapura Angkasa. All rights reserved.
                </p>
            </div>
        </div>
    );
}
