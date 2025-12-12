'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, Lock, LogIn, Loader2 } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

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

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Login gagal');
            }

            if (data.role === 'admin') {
                router.push('/dashboard/admin');
            } else {
                router.push('/dashboard/employee');
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Login gagal';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
            {/* Decorative Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-400/20 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-md relative animate-slide-up">
                {/* Logo & Header */}
                <div className="text-center mb-8">
                    <Image
                        src="/logo.png"
                        alt="Gapura Logo"
                        width={200}
                        height={80}
                        className="mx-auto mb-6 object-contain"
                    />
                    <h1 className="text-3xl font-bold text-slate-900">Selamat Datang</h1>
                    <p className="text-slate-500 mt-2">Masuk ke Gapura Operations Dashboard</p>
                </div>

                {/* Login Card */}
                <div className="card p-8">
                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium flex items-start gap-3 animate-scale-in">
                            <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-red-600 text-xs">!</span>
                            </div>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="label">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <input
                                    type="email"
                                    required
                                    className="input pl-12"
                                    placeholder="nama@gapura.co.id"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="label">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <input
                                    type="password"
                                    required
                                    className="input pl-12"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary w-full mt-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Memproses...
                                </>
                            ) : (
                                <>
                                    <LogIn className="w-5 h-5" />
                                    Masuk
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                        <p className="text-slate-500 text-sm">
                            Belum punya akun?{' '}
                            <Link href="/auth/register" className="text-blue-600 font-semibold hover:text-blue-700 transition-colors">
                                Daftar disini
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Demo Credentials */}
                <div className="mt-8 bg-white/60 backdrop-blur-sm rounded-2xl border border-slate-200 p-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
                    <h3 className="text-center text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wider">Demo Credentials</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { role: 'Admin', email: 'admin@gapura.demo', color: 'bg-slate-100 text-slate-700 hover:bg-slate-200' },
                            { role: 'Manager', email: 'manager@gapura.demo', color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
                            { role: 'Investigator', email: 'investigator@gapura.demo', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
                            { role: 'Supervisor', email: 'supervisor@gapura.demo', color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
                            { role: 'Reporter', email: 'reporter@gapura.demo', color: 'bg-amber-50 text-amber-700 hover:bg-amber-100' }
                        ].map((user) => (
                            <button
                                key={user.role}
                                onClick={() => setFormData({ email: user.email, password: 'Gapura123!' })}
                                className={`p-3 rounded-xl text-xs font-semibold transition-all text-left group relative overflow-hidden ${user.role === 'Reporter' ? 'col-span-2' : ''} ${user.color}`}
                            >
                                <div className="relative z-10">
                                    <div className="text-[10px] opacity-70 mb-0.5">Role</div>
                                    <div className="text-sm mb-1">{user.role}</div>
                                    <div className="font-normal opacity-70 truncate">{user.email}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-slate-400 text-xs mt-8">
                    © 2025 Gapura Angkasa. All rights reserved.
                </p>
            </div>
        </div>
    );
}
