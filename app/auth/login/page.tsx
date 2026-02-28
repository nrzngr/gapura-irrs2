'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, Lock, ArrowRight, Loader2, Sparkles, Shield, Monitor } from 'lucide-react';

const demoCredentials = [
    { role: 'Super Admin', email: 'admin@gapura.demo', division: 'ALL', color: '#8b5cf6', description: 'Full access' },
    { role: 'Analyst', email: 'supervisor@gapura.demo', division: 'OS', color: '#3b82f6', description: 'Create + Export' },
    { role: 'Divisi OS', email: 'manager@gapura.demo', division: 'OS', color: '#10b981', description: 'Monitoring' },
    { role: 'Divisi OT', email: 'partner.ot@gapura.demo', division: 'OT', color: '#f59e0b', description: 'ACC & Evidence' },
    { role: 'Divisi OP', email: 'partner.op@gapura.demo', division: 'OP', color: '#06b6d4', description: 'ACC & Evidence' },
    { role: 'Divisi UQ', email: 'partner.uq@gapura.demo', division: 'UQ', color: '#ec4899', description: 'ACC & Evidence' },
    { role: 'Manager Cabang CGK', email: 'manager.cgk@gapura.id', division: 'CGK', color: '#059669', description: 'AI Reports + Cabang CGK' },
    { role: 'Karyawan Cabang', email: 'karyawan@gapura.co.id', division: 'CGK', color: '#f87171', description: 'Akses Cabang' },
];


export default function LoginPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [demoMode, setDemoMode] = useState(false);

    // Persist demo mode state
    useEffect(() => {
        const savedDemoMode = localStorage.getItem('demo_mode') === 'true';
        setDemoMode(savedDemoMode);
    }, []);

    const toggleDemoMode = () => {
        const newState = !demoMode;
        setDemoMode(newState);
        localStorage.setItem('demo_mode', String(newState));
        if (newState) {
            setError('');
        }
    };

    const handleDemoEnter = () => {
        // Redirect to analyst dashboard by default for demo mode
        router.push('/dashboard/analyst?demo=1');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            let data: any = null;
            const ct = res.headers.get('content-type') || '';
            if (ct.includes('application/json')) {
                data = await res.json();
            } else {
                const text = await res.text();
                data = { error: text?.slice(0, 200) || 'Kesalahan tak diketahui' };
            }

            if (!res.ok) {
                throw new Error(data.error || 'Login gagal');
            }

            // Redirect based on role
            const roleRedirects: Record<string, string> = {
                SUPER_ADMIN: '/dashboard/admin',
                DIVISI_OS: '/dashboard/os',
                DIVISI_OT: '/dashboard/ot',
                DIVISI_OP: '/dashboard/op',
                DIVISI_UQ: '/dashboard/uq',
                ANALYST: '/dashboard/analyst',
                CABANG: '/dashboard/employee',
                PARTNER_OS: '/dashboard/os',
                PARTNER_OT: '/dashboard/ot',
                PARTNER_OP: '/dashboard/op',
                PARTNER_UQ: '/dashboard/uq',
                PARTNER_HC: '/dashboard/hc',
                PARTNER_HT: '/dashboard/ht',
            };
            
            const normalizedRole = data.role ? String(data.role).trim().toUpperCase() : '';
            const targetPath = roleRedirects[normalizedRole] || '/dashboard/employee';
            
            router.push(targetPath);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Login gagal');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] flex relative overflow-hidden" style={{ background: '#f8fafc' }}>
            {/* Left Side - Branding */}
            <div 
                className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative"
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
                        width={240}
                        height={90}
                        className="object-contain brightness-0 invert"
                        priority
                    />
                </div>

                <div className="relative z-10 mt-6">
                    <div className="grid grid-cols-2 grid-rows-2 gap-3 w-full h-72">
                        <div className="relative col-span-1 row-span-2 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/20">
                            <Image
                                src="/front-page-image2.jpg"
                                alt="Gapura"
                                fill
                                sizes="(max-width: 1024px) 100vw, 50vw"
                                className="object-cover"
                                priority
                            />
                        </div>
                        <div className="relative rounded-2xl overflow-hidden shadow-xl ring-1 ring-white/20">
                            <Image
                                src="/front-image-2.svg"
                                alt="Gapura"
                                fill
                                sizes="(max-width: 1024px) 100vw, 25vw"
                                className="object-cover"
                            />
                        </div>
                        <div className="relative rounded-2xl overflow-hidden shadow-xl ring-1 ring-white/20">
                            <Image
                                src="/front-image-3.svg"
                                alt="Gapura"
                                fill
                                sizes="(max-width: 1024px) 100vw, 25vw"
                                className="object-cover"
                            />
                        </div>
                    </div>
                </div>

                <div className="relative z-10 space-y-6">
                    <h1 className="text-4xl font-bold text-white leading-tight">
                        <em>&quot;One Click&quot;</em> Irregularity Report
                    </h1>
                    <p className="text-white/80 text-lg max-w-md">
                        Sistem Pelaporan Terintegrasi adalah Platform digital untuk pelaporan, pelacakan, dan penyelesaian masalah operasional penerbangan.
                    </p>
                </div>

                <div className="relative z-10 text-white/60 text-sm">
                    © 2025 Gapura Angkasa. All rights reserved.
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden text-center mb-8">
                        <Image
                            src="/logo.png"
                            alt="Gapura"
                            width={200}
                            height={75}
                            className="mx-auto object-contain"
                            priority
                        />
                    </div>

                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900">Selamat Datang</h1>
                        <p className="text-gray-500 mt-2">Masuk ke dashboard operasional Anda</p>
                    </div>

                    {/* Login Card */}
                    <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8">
                        {error && (
                            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                                <p className="text-sm font-medium text-red-600">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="email"
                                        required
                                        className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 text-sm transition-all focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white"
                                        placeholder="email@perusahaan.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="password"
                                        required
                                        className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 text-sm transition-all focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 rounded-xl font-semibold text-white text-sm transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2"
                                style={{
                                    background: loading ? '#9ca3af' : 'linear-gradient(135deg, #059669, #10b981)',
                                    boxShadow: loading ? 'none' : '0 4px 14px -2px rgba(16, 185, 129, 0.4)',
                                }}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Memproses...
                                    </>
                                ) : (
                                    <>
                                        Masuk
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-4">
                            <Link
                                href="/auth/public-report"
                                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-emerald-200 text-emerald-700 font-semibold hover:bg-emerald-50 transition-colors"
                            >
                                Quick Access: Laporkan Irregularity
                            </Link>
                        </div>

                        <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                            <p className="text-sm text-gray-500">
                                Belum punya akun?{' '}
                                <Link href="/auth/register" className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
                                    Daftar Sekarang
                                </Link>
                            </p>
                        </div>
                    </div>

                    {/* Demo Credentials */}
                    <div className={`mt-6 rounded-2xl border transition-all duration-300 p-5 ${demoMode ? 'bg-emerald-50 border-emerald-100 ring-4 ring-emerald-500/5' : 'bg-white border-gray-100'}`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Sparkles size={14} className={demoMode ? 'text-emerald-600' : 'text-emerald-500'} />
                                <p className={`text-xs font-bold uppercase tracking-wider ${demoMode ? 'text-emerald-700' : 'text-gray-400'}`}>Quick Demo Access</p>
                            </div>
                            <button
                                onClick={toggleDemoMode}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${demoMode ? 'bg-emerald-500' : 'bg-gray-200'}`}
                            >
                                <span className="sr-only">Enable demo mode</span>
                                <span
                                    className={`${demoMode ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm`}
                                />
                            </button>
                        </div>

                        {demoMode ? (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="p-4 bg-white rounded-xl border border-emerald-100 shadow-sm">
                                    <p className="text-sm text-emerald-800 font-medium mb-3">
                                        Demo Mode Aktif: Anda dapat mengakses dashboard tanpa login.
                                    </p>
                                    <button
                                        onClick={handleDemoEnter}
                                        className="w-full py-3 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Monitor size={16} />
                                        Masuk sebagai Tamu
                                        <ArrowRight size={16} />
                                    </button>
                                </div>
                                
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                        <div className="w-full border-t border-emerald-100"></div>
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-emerald-50 px-2 text-emerald-600 font-bold">Atau pilih role</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-2 max-h-[280px] overflow-y-auto pr-1">
                                    {demoCredentials.map((cred) => (
                                        <button
                                            key={cred.role}
                                            onClick={() => setFormData({ email: cred.email, password: 'Gapura123!' })}
                                            className="flex items-center gap-3 py-2.5 px-3 rounded-xl text-left bg-white border border-emerald-50 hover:border-emerald-200 hover:bg-emerald-50/50 transition-all group"
                                        >
                                            <div 
                                                className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                                                style={{ background: cred.color }} 
                                            />
                                            <span className="text-sm font-semibold text-gray-900 flex-1">{cred.role}</span>
                                            <ArrowRight className="w-4 h-4 text-emerald-300 group-hover:text-emerald-500 transition-colors" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {demoCredentials.map((cred) => (
                                    <button
                                        key={cred.role}
                                        onClick={() => setFormData({ email: cred.email, password: 'Gapura123!' })}
                                        className="w-full flex items-center gap-3 py-3 px-3 -mx-1 rounded-xl text-left transition-all hover:bg-gray-50 group"
                                    >
                                        <div 
                                            className="w-3 h-3 rounded-full flex-shrink-0 ring-4 ring-opacity-20" 
                                            style={{ background: cred.color, boxShadow: `0 0 0 4px ${cred.color}20` }} 
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-gray-900">{cred.role}</span>
                                                <span 
                                                    className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                                    style={{ background: `${cred.color}15`, color: cred.color }}
                                                >
                                                    {cred.division}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-400 truncate">{cred.description}</p>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                                    </button>
                                ))}
                            </div>
                        )}
                        
                        <p className="text-[10px] text-gray-400 mt-3 text-center">
                            Password: <span className="font-mono">Gapura123!</span>
                        </p>
                    </div>

                    {/* Mobile Footer */}
                    <p className="lg:hidden text-center text-xs text-gray-400 mt-8">
                        © 2025 Gapura Angkasa. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
}
