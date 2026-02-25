'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { User, Mail, Lock, UserPlus, Loader2, CheckCircle, Phone, Building2, Users, Briefcase, CreditCard, Info, Shield, Eye, EyeOff, Layers } from 'lucide-react';
import type { DivisionType } from '@/types';

interface Station { id: string; code: string; name: string; }
interface Unit { id: string; name: string; }
interface Position { id: string; name: string; }

const DIVISION_OPTIONS: { value: DivisionType; label: string }[] = [
    { value: 'OS', label: 'Operational Services (OS)' },
    { value: 'OT', label: 'Teknik / GSE (OT)' },
    { value: 'OP', label: 'Operasi (OP)' },
    { value: 'UQ', label: 'Quality (UQ)' },
    { value: 'GENERAL', label: 'Umum / Lainnya' },
];

export default function RegisterPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        full_name: '',
        nik: '',
        phone: '',
        station_id: '',
        unit_id: '',
        position_id: '',
        division: 'GENERAL' as DivisionType,
    });
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [emailHint, setEmailHint] = useState('');

    const [stations, setStations] = useState<Station[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [positions, setPositions] = useState<Position[]>([]);

    // Check if selected station is GPS (Gapura Pusat)
    const isGPS = useMemo(() => {
        const station = stations.find(s => s.id === formData.station_id);
        return station?.code === 'GPS';
    }, [formData.station_id, stations]);

    useEffect(() => {
        const fetchMasterData = async () => {
            const settleJson = async (p: Promise<Response>): Promise<any[]> => {
                try {
                    const res = await p;
                    if (!res.ok) return [];
                    const data = await res.json().catch(() => []);
                    return Array.isArray(data) ? data : [];
                } catch {
                    return [];
                }
            };
            const [stationsData, unitsData, positionsData] = await Promise.all([
                settleJson(fetch('/api/master-data?type=stations')),
                settleJson(fetch('/api/master-data?type=units')),
                settleJson(fetch('/api/master-data?type=positions')),
            ]);
            const fallbackCodes = ['GPS', 'CGK', 'DPS', 'SUB', 'UPG', 'KNO', 'BPN', 'MDC', 'PDG', 'PKU', 'BTH', 'PLM'];
            const fallbackStations = fallbackCodes.map(code => ({ id: code, code, name: code }));
            setStations(stationsData.length ? stationsData : fallbackStations);
            setUnits(unitsData);
            setPositions(positionsData);
        };
        fetchMasterData();
    }, []);

    // Filter positions based on station selection
    const filteredPositions = useMemo(() => {
        const centralRoles = ['Super Admin', 'Analyst', 'OS', 'OSF', 'OSL', 'DIVISI OT', 'DIVISI OP', 'DIVISI UQ'];
        return positions.filter(p => {
            const isCentralRole = centralRoles.some(r => p.name.toUpperCase().includes(r.toUpperCase()));
            return isGPS ? isCentralRole : !isCentralRole;
        });
    }, [positions, isGPS]);

    // Filter stations to exclude GPS for branch registration
    const filteredStations = useMemo(() => {
        const gps = stations.find(s => s.code === 'GPS');
        const others = stations.filter(s => s.code !== 'GPS');
        return gps ? [gps, ...others] : others;
    }, [stations]);

    const validateField = (name: string, value: string): string => {
        switch (name) {
            case 'nik':
                if (!/^[A-Z0-9]{5,10}$/i.test(value) && value.length > 0) {
                    return 'NIK harus 5-10 karakter (huruf/angka)';
                }
                break;
            case 'phone':
                if (!/^08\d{8,11}$/.test(value) && value.length > 0) {
                    return 'Format: 08xxxxxxxxxx (10-13 digit)';
                }
                break;
            case 'email':
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length > 0) {
                    return 'Format email tidak valid';
                }
                break;
            case 'password':
                if (value.length > 0 && value.length < 6) {
                    return 'Minimal 6 karakter';
                }
                break;
            case 'confirmPassword':
                if (value !== formData.password && value.length > 0) {
                    return 'Password tidak cocok';
                }
                break;
        }
        return '';
    };

    const handleChange = (name: string, value: string) => {
        // Transform NIK to uppercase
        if (name === 'nik') value = value.toUpperCase();

        // Email domain hint
        if (name === 'email') {
            const isGPS = stations.find(s => s.id === formData.station_id)?.code === 'GPS';
            if (!isGPS) {
                if (value.toLowerCase().endsWith('@gapura.id')) {
                    setEmailHint('✓ Anda akan terdaftar sebagai Manager/Supervisor');
                } else if (value.includes('@')) {
                    setEmailHint('ℹ Anda akan terdaftar sebagai Staff (perlu approval Manager)');
                } else {
                    setEmailHint('');
                }
            } else {
                setEmailHint('');
            }
        }

        setFormData(prev => ({ ...prev, [name]: value }));

        // Validate on change
        const error = validateField(name, value);
        setFieldErrors(prev => ({ ...prev, [name]: error }));

        // Reset position when station changes
        if (name === 'station_id') {
            setFormData(prev => ({ ...prev, station_id: value, position_id: '', division: 'GENERAL' }));
            setEmailHint(''); // Reset hint when station changes
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Validate all fields
        const errors: Record<string, string> = {};
        Object.entries(formData).forEach(([key, value]) => {
            if (key !== 'confirmPassword' && key !== 'division') {
                const err = validateField(key, value);
                if (err) errors[key] = err;
            }
        });

        // Password confirmation check
        if (formData.password !== formData.confirmPassword) {
            errors.confirmPassword = 'Password tidak cocok';
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            setError('Periksa kembali data yang diisi');
            return;
        }

        setLoading(true);

        try {
            const payload = {
                email: formData.email,
                password: formData.password,
                full_name: formData.full_name,
                nik: formData.nik,
                phone: formData.phone,
                station_id: formData.station_id,
                unit_id: formData.unit_id,
                position_id: formData.position_id,
                division: isGPS ? formData.division : undefined,
            };

            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
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
    const inputErrorStyle = "w-full pl-12 pr-4 py-3.5 rounded-xl border border-red-300 bg-red-50 text-gray-900 placeholder:text-gray-400 text-sm transition-all focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 focus:bg-white";
    const selectStyle = "w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm transition-all focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white appearance-none cursor-pointer";
    const labelStyle = "block text-sm font-medium text-gray-700 mb-2";

    return (
        <div className="min-h-[100dvh] flex relative overflow-hidden" style={{ background: '#f8fafc' }}>
            {/* Left Side - Branding */}
            <div 
                className="hidden lg:flex lg:w-5/12 flex-col justify-between p-12 relative"
                style={{ background: 'linear-gradient(145deg, #059669, #10b981, #34d399)' }}
            >
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
                    © 2025 PT Gapura Angkasa. All rights reserved.
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
                        <p className="text-gray-500 mt-1">Lengkapi data untuk bergabung dengan Gapura Integrated Service Analytics</p>
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
                                                onChange={(e) => handleChange('full_name', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelStyle}>NIK (Nomor Induk Karyawan)</label>
                                        <div className="relative">
                                            <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <input
                                                type="text"
                                                required
                                                maxLength={10}
                                                className={fieldErrors.nik ? inputErrorStyle : inputStyle}
                                                placeholder="Contoh: GA12345"
                                                value={formData.nik}
                                                onChange={(e) => handleChange('nik', e.target.value)}
                                            />
                                        </div>
                                        {fieldErrors.nik && <p className="text-xs text-red-500 mt-1">{fieldErrors.nik}</p>}
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
                                                className={fieldErrors.email ? inputErrorStyle : inputStyle}
                                                placeholder="email@gapura.co.id"
                                                value={formData.email}
                                                onChange={(e) => handleChange('email', e.target.value)}
                                            />
                                        </div>
                                        {fieldErrors.email && <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>}
                                        {!fieldErrors.email && emailHint && !isGPS && (
                                            <p className={`text-xs mt-1 ${emailHint.startsWith('✓') ? 'text-emerald-600' : 'text-blue-600'}`}>
                                                {emailHint}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className={labelStyle}>No. WhatsApp</label>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <input
                                                type="tel"
                                                required
                                                maxLength={13}
                                                className={fieldErrors.phone ? inputErrorStyle : inputStyle}
                                                placeholder="08xxxxxxxxxx"
                                                value={formData.phone}
                                                onChange={(e) => handleChange('phone', e.target.value.replace(/\D/g, ''))}
                                            />
                                        </div>
                                        {fieldErrors.phone && <p className="text-xs text-red-500 mt-1">{fieldErrors.phone}</p>}
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
                                                onChange={(e) => handleChange('station_id', e.target.value)}
                                            >
                                                <option value="">Pilih Station</option>
                                                {filteredStations.map((s) => (
                                                    <option key={s.id} value={s.id}>
                                                        {s.code}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        {isGPS && (
                                            <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                                                <Info size={12} />
                                                Kantor Pusat - Pilih divisi di bawah
                                            </p>
                                        )}
                                    </div>

                                    {/* Division - Only shown for GPS (Gapura Pusat) */}
                                    {isGPS && (
                                        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                            <label className={labelStyle}>Divisi</label>
                                            <div className="relative">
                                                <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                <select
                                                    required
                                                    className={selectStyle}
                                                    value={formData.division}
                                                    onChange={(e) => handleChange('division', e.target.value)}
                                                >
                                                    {DIVISION_OPTIONS.map((d) => (
                                                        <option key={d.value} value={d.value}>{d.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {!isGPS && (
                                            <div>
                                                <label className={labelStyle}>Unit Kerja</label>
                                                <div className="relative">
                                                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                    <select
                                                        required={!isGPS}
                                                        className={selectStyle}
                                                        value={formData.unit_id}
                                                        onChange={(e) => handleChange('unit_id', e.target.value)}
                                                    >
                                                        <option value="">Pilih Unit</option>
                                                        {units.map((u) => (
                                                            <option key={u.id} value={u.id}>{u.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                        <div className={isGPS ? "col-span-2" : ""}>
                                            <label className={labelStyle}>Jabatan</label>
                                            <div className="relative">
                                                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                <select
                                                    required
                                                    className={selectStyle}
                                                    value={formData.position_id}
                                                    onChange={(e) => handleChange('position_id', e.target.value)}
                                                    disabled={!formData.station_id}
                                                >
                                                    <option value="">Pilih Jabatan</option>
                                                    {filteredPositions.map((p) => (
                                                        <option key={p.id} value={p.id}>{p.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            {!formData.station_id && (
                                                <p className="text-xs text-gray-400 mt-1">Pilih station terlebih dahulu</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Security */}
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Keamanan</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelStyle}>Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                required
                                                className={fieldErrors.password ? inputErrorStyle : inputStyle}
                                                placeholder="Minimal 6 karakter"
                                                value={formData.password}
                                                onChange={(e) => handleChange('password', e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                        {fieldErrors.password && <p className="text-xs text-red-500 mt-1">{fieldErrors.password}</p>}
                                    </div>
                                    <div>
                                        <label className={labelStyle}>Konfirmasi Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                required
                                                className={fieldErrors.confirmPassword ? inputErrorStyle : inputStyle}
                                                placeholder="Ulangi password"
                                                value={formData.confirmPassword}
                                                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                                            />
                                        </div>
                                        {fieldErrors.confirmPassword && <p className="text-xs text-red-500 mt-1">{fieldErrors.confirmPassword}</p>}
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
                        © 2025 PT Gapura Angkasa. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
}
