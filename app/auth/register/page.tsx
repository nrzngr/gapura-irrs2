'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { User, Mail, Lock, UserPlus, Loader2, CheckCircle, Phone, Building2, Users, Briefcase, CreditCard, Info, Shield } from 'lucide-react';

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

    const [stations, setStations] = useState<Station[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [positions, setPositions] = useState<Position[]>([]);

    useEffect(() => {
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

    const inputStyle = "w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 text-sm transition-all focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white";
    const selectStyle = "w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm transition-all focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white appearance-none cursor-pointer";
    const labelStyle = "block text-sm font-medium text-gray-700 mb-2";

    return (
        <div className="min-h-[100dvh] flex relative overflow-hidden" style={{ background: '#f8fafc' }}>
            {/* Left Side - Branding */}
            <div 
                className="hidden lg:flex lg:w-5/12 flex-col justify-between p-12 relative"
                style={{ background: 'linear-gradient(145deg, #059669, #10b981, #34d399)' }}
            >
                {/* Decorative Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div 
                        className="absolute inset-0"
                        style={{
                            backgroundImage: `radial-gradient(circle at 25% 25%, white 2px, transparent 2px)`,
                            backgroundSize: '50px 50px'
                        }}
                    />
                </div>

                <div className="relative z-10">
                    <Image
                        src="/logo.png"
                        alt="Gapura"
                        width={180}
                        height={70}
                        className="object-contain brightness-0 invert"
                        priority
                    />
                </div>

                <div className="relative z-10 space-y-6">
                    <h1 className="text-4xl font-bold text-white leading-tight">
                        Bergabung dengan<br />Tim Operasional<br />Terbaik
                    </h1>
                    <p className="text-white/80 text-lg max-w-md">
                        Daftarkan diri Anda untuk mengakses sistem pelaporan irregularity yang terintegrasi.
                    </p>
                    
                    <div className="flex items-center gap-4 pt-4">
                        <div className="flex items-center gap-2 px-4 py-2 bg-white/15 backdrop-blur-sm rounded-full">
                            <Shield size={16} className="text-white" />
                            <span className="text-sm font-medium text-white">Terverifikasi Admin</span>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 text-white/60 text-sm">
                    © 2025 Gapura Angkasa. All rights reserved.
                </div>
            </div>

            {/* Right Side - Register Form */}
            <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
                <div className="w-full max-w-xl py-8">
                    {/* Mobile Logo */}
                    <div className="lg:hidden text-center mb-6">
                        <Image
                            src="/logo.png"
                            alt="Gapura"
                            width={140}
                            height={50}
                            className="mx-auto object-contain"
                            priority
                        />
                    </div>

                    {/* Header */}
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-gray-900">Registrasi Akun</h1>
                        <p className="text-gray-500 mt-1">Lengkapi data untuk bergabung dengan Gapura Operations</p>
                    </div>

                    {/* Register Card */}
                    <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6">
                        {/* Error Alert */}
                        {error && (
                            <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-100 flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                                <p className="text-sm font-medium text-red-600">{error}</p>
                            </div>
                        )}

                        {/* Success Alert */}
                        {success && (
                            <div className="mb-5 p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center gap-3">
                                <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                <p className="text-sm font-medium text-emerald-700">{success}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Section: Personal Info */}
                            <div className="pb-4 border-b border-gray-100">
                                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Informasi Pribadi</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelStyle}>Nama Lengkap</label>
                                        <div className="relative">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <input
                                                type="text"
                                                required
                                                className={inputStyle}
                                                placeholder="Nama lengkap"
                                                value={formData.full_name}
                                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelStyle}>NIK</label>
                                        <div className="relative">
                                            <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <input
                                                type="text"
                                                required
                                                className={inputStyle}
                                                placeholder="Nomor Induk Karyawan"
                                                value={formData.nik}
                                                onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Contact */}
                            <div className="pb-4 border-b border-gray-100">
                                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Kontak</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelStyle}>Email</label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <input
                                                type="email"
                                                required
                                                className={inputStyle}
                                                placeholder="email@gapura.co.id"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelStyle}>No. WhatsApp</label>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <input
                                                type="tel"
                                                required
                                                className={inputStyle}
                                                placeholder="08xxxxxxxxxx"
                                                value={formData.phone}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Organization */}
                            <div className="pb-4 border-b border-gray-100">
                                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Organisasi</p>
                                <div className="space-y-4">
                                    <div>
                                        <label className={labelStyle}>Station / Bandara</label>
                                        <div className="relative">
                                            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <select
                                                required
                                                className={selectStyle}
                                                value={formData.station_id}
                                                onChange={(e) => {
                                                   const newStationId = e.target.value;
                                                   setFormData({ 
                                                       ...formData, 
                                                       station_id: newStationId,
                                                       position_id: '' // Reset position on station change
                                                   });
                                                }}
                                            >
                                                <option value="">Pilih Station</option>
                                                <option value="GPS">GPS - Gapura Pusat</option>
                                                {stations.filter(s => s.code !== 'GPS').map((s) => (
                                                    <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className={labelStyle}>Unit / Divisi</label>
                                            <div className="relative">
                                                <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                <select
                                                    required
                                                    className={selectStyle}
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
                                            <label className={labelStyle}>Jabatan</label>
                                            <div className="relative">
                                                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                <select
                                                    required
                                                    className={selectStyle}
                                                    value={formData.position_id}
                                                    onChange={(e) => setFormData({ ...formData, position_id: e.target.value })}
                                                >
                                                    <option value="">Pilih Jabatan</option>
                                                    {/* Dynamic Position Filtering Logic */}
                                                    {(() => {
                                                        const isCentral = formData.station_id === 'GPS' || stations.find(s => s.id === formData.station_id && s.code === 'GPS');
                                                        const centralRoles = ['Super Admin', 'Analyst', 'OS', 'OSF', 'OSL', 'DIVISI OT', 'DIVISI OP', 'DIVISI UQ'];
                                                        
                                                        return positions
                                                            .filter(p => {
                                                                const isCentralRole = centralRoles.some(r => p.name.includes(r));
                                                                return isCentral ? isCentralRole : !isCentralRole;
                                                            })
                                                            .map((p) => (
                                                                <option key={p.id} value={p.id}>{p.name}</option>
                                                            ));
                                                    })()}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Security */}
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Keamanan</p>
                                <div>
                                    <label className={labelStyle}>Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="password"
                                            required
                                            className={inputStyle}
                                            placeholder="Minimal 6 karakter"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading || !!success}
                                className="w-full py-4 rounded-xl font-semibold text-white text-sm transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
                                style={{
                                    background: (loading || success) ? '#9ca3af' : 'linear-gradient(135deg, #059669, #10b981)',
                                    boxShadow: (loading || success) ? 'none' : '0 4px 14px -2px rgba(16, 185, 129, 0.4)',
                                }}
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
                        <div className="mt-5 p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-start gap-3">
                            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                            <p className="text-blue-700 text-sm">
                                Setelah mendaftar, akun perlu disetujui admin sebelum dapat login ke sistem.
                            </p>
                        </div>

                        {/* Login Link */}
                        <div className="mt-5 pt-5 border-t border-gray-100 text-center">
                            <p className="text-gray-500 text-sm">
                                Sudah punya akun?{' '}
                                <Link href="/auth/login" className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
                                    Masuk disini
                                </Link>
                            </p>
                        </div>
                    </div>

                    {/* Mobile Footer */}
                    <p className="lg:hidden text-center text-xs text-gray-400 mt-6">
                        © 2025 Gapura Angkasa. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
}
