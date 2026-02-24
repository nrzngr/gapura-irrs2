'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function PublicReportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    reporter_email: '',
    reporter_name: '',
    title: '',
    description: '',
    location: '',
    airline: '',
    flight_number: '',
    date_of_event: '',
    area: '',
    evidence_url: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await fetch('/api/reports/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengirim laporan');
      }
      setSuccess('Laporan berhasil dikirim. Terima kasih.');
      setForm({
        reporter_email: '',
        reporter_name: '',
        title: '',
        description: '',
        location: '',
        airline: '',
        flight_number: '',
        date_of_event: '',
        area: '',
        evidence_url: '',
      });
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-center gap-3">
          <Image src="/logo.png" alt="Gapura" width={140} height={48} />
        </div>
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Form Laporan Irregularity (Akses Umum)</h1>
            <p className="text-gray-500 text-sm mt-1">Isi data di bawah ini. Email wajib diisi.</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-sm text-emerald-700">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                name="reporter_email"
                type="email"
                required
                value={form.reporter_email}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                placeholder="email@domain.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nama</label>
              <input
                name="reporter_name"
                type="text"
                value={form.reporter_name}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Kejadian</label>
              <input
                name="date_of_event"
                type="date"
                value={form.date_of_event}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Judul</label>
              <input
                name="title"
                type="text"
                required
                value={form.title}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                placeholder="Ringkas, jelas"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Deskripsi</label>
              <textarea
                name="description"
                required
                value={form.description}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 min-h-[120px]"
                placeholder="Jelaskan kejadian"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Lokasi</label>
              <input
                name="location"
                type="text"
                value={form.location}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                placeholder="Contoh: Gate 5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Area</label>
              <select
                name="area"
                value={form.area}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
              >
                <option value="">Pilih</option>
                <option value="Terminal Area">Terminal Area</option>
                <option value="Apron Area">Apron Area</option>
                <option value="General">General</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Maskapai</label>
              <input
                name="airline"
                type="text"
                value={form.airline}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                placeholder="Contoh: Garuda Indonesia"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Flight Number</label>
              <input
                name="flight_number"
                type="text"
                value={form.flight_number}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                placeholder="Contoh: GA123"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Link Bukti Foto</label>
              <input
                name="evidence_url"
                type="url"
                value={form.evidence_url}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                placeholder="URL gambar"
              />
            </div>
            <div className="md:col-span-2 mt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl font-semibold text-white text-sm transition-all disabled:opacity-60"
                style={{ background: loading ? '#9ca3af' : 'linear-gradient(135deg, #059669, #10b981)' }}
              >
                {loading ? 'Mengirim...' : 'Kirim Laporan'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <Link href="/auth/login" className="text-sm text-emerald-700 font-semibold">
              Kembali ke Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
