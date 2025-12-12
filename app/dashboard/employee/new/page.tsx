'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    FileText, MapPin, AlertTriangle, Upload, ArrowLeft, Loader2,
    Plane, Tag, Camera, CheckCircle, Building2
} from 'lucide-react';

interface Station { id: string; code: string; name: string; }
interface Location { id: string; name: string; area: string; }
interface IncidentType { id: string; name: string; default_severity: string; }

const severityOptions = [
    { value: 'low', label: 'Low (Hazard)', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', description: 'Potensi bahaya, belum terjadi insiden' },
    { value: 'medium', label: 'Medium (Incident)', color: 'bg-amber-100 text-amber-700 border-amber-200', description: 'Insiden terjadi, tidak ada cedera serius' },
    { value: 'high', label: 'High (Accident)', color: 'bg-red-100 text-red-700 border-red-200', description: 'Kecelakaan serius, cedera atau kerusakan besar' },
];

export default function NewReportPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    // Master data
    const [stations, setStations] = useState<Station[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [incidentTypes, setIncidentTypes] = useState<IncidentType[]>([]);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        location: '',
        station_id: '',
        location_id: '',
        incident_type_id: '',
        severity: 'low',
        flight_number: '',
        aircraft_reg: '',
        gse_number: '',
        evidence_url: '',
    });

    useEffect(() => {
        const fetchMasterData = async () => {
            const [stationsRes, incidentTypesRes] = await Promise.all([
                fetch('/api/master-data?type=stations'),
                fetch('/api/master-data?type=incident_types'),
            ]);
            setStations(await stationsRes.json());
            setIncidentTypes(await incidentTypesRes.json());
        };
        fetchMasterData();
    }, []);

    // Fetch locations when station changes
    useEffect(() => {
        if (formData.station_id) {
            fetch(`/api/master-data?type=locations&station_id=${formData.station_id}`)
                .then(res => res.json())
                .then(data => setLocations(data));
        }
    }, [formData.station_id]);

    // Update severity when incident type changes
    useEffect(() => {
        if (formData.incident_type_id) {
            const selectedType = incidentTypes.find(t => t.id === formData.incident_type_id);
            if (selectedType) {
                setFormData(prev => ({ ...prev, severity: selectedType.default_severity }));
            }
        }
    }, [formData.incident_type_id, incidentTypes]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                setImagePreview(base64);
                setFormData({ ...formData, evidence_url: base64 });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Gagal mengirim laporan');
            }

            setSuccess(true);
            setTimeout(() => {
                router.push('/dashboard/employee');
            }, 2000);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Gagal mengirim laporan');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center animate-scale-in">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-emerald-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Laporan Terkirim!</h2>
                    <p className="text-slate-500">Laporan Anda sedang diproses oleh tim.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href="/dashboard/employee"
                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Buat Laporan Baru</h1>
                    <p className="text-slate-500 text-sm">Laporkan kejadian irregularity</p>
                </div>
            </div>

            {error && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="card p-6 space-y-4">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        Informasi Dasar
                    </h3>

                    <div>
                        <label className="label">Judul Laporan</label>
                        <input
                            type="text"
                            required
                            className="input"
                            placeholder="Contoh: Kerusakan GSE di Apron 1"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Tipe Insiden</label>
                            <div className="relative">
                                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                <select
                                    required
                                    className="input pl-10 appearance-none cursor-pointer"
                                    value={formData.incident_type_id}
                                    onChange={(e) => setFormData({ ...formData, incident_type_id: e.target.value })}
                                >
                                    <option value="">Pilih Tipe</option>
                                    {incidentTypes.map((t) => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="label">Tingkat Keparahan</label>
                            <div className="flex gap-2">
                                {severityOptions.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, severity: opt.value })}
                                        className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium border-2 transition-all ${formData.severity === opt.value
                                                ? opt.color + ' border-current'
                                                : 'bg-slate-50 text-slate-500 border-slate-200'
                                            }`}
                                    >
                                        {opt.value.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="label">Deskripsi Detail</label>
                        <textarea
                            required
                            rows={4}
                            className="input resize-none"
                            placeholder="Jelaskan kronologi dan detail kejadian..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>
                </div>

                {/* Location */}
                <div className="card p-6 space-y-4">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-blue-600" />
                        Lokasi Kejadian
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Station / Bandara</label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                <select
                                    required
                                    className="input pl-10 appearance-none cursor-pointer"
                                    value={formData.station_id}
                                    onChange={(e) => setFormData({ ...formData, station_id: e.target.value, location_id: '' })}
                                >
                                    <option value="">Pilih Station</option>
                                    {stations.map((s) => (
                                        <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="label">Lokasi Spesifik</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                <select
                                    className="input pl-10 appearance-none cursor-pointer"
                                    value={formData.location_id}
                                    onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                                    disabled={!formData.station_id}
                                >
                                    <option value="">Pilih Lokasi</option>
                                    {locations.map((l) => (
                                        <option key={l.id} value={l.id}>{l.name} ({l.area})</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="label">Lokasi Manual (jika tidak ada di daftar)</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="Contoh: Dekat Gate 5, Terminal 2"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        />
                    </div>
                </div>

                {/* Flight Context */}
                <div className="card p-6 space-y-4">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                        <Plane className="w-4 h-4 text-blue-600" />
                        Konteks Penerbangan
                        <span className="text-xs text-slate-400 font-normal">(Opsional)</span>
                    </h3>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="label">No. Penerbangan</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="GA-404"
                                value={formData.flight_number}
                                onChange={(e) => setFormData({ ...formData, flight_number: e.target.value.toUpperCase() })}
                            />
                        </div>
                        <div>
                            <label className="label">Registrasi Pesawat</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="PK-GIA"
                                value={formData.aircraft_reg}
                                onChange={(e) => setFormData({ ...formData, aircraft_reg: e.target.value.toUpperCase() })}
                            />
                        </div>
                        <div>
                            <label className="label">No. GSE / Alat</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="BTT-01"
                                value={formData.gse_number}
                                onChange={(e) => setFormData({ ...formData, gse_number: e.target.value.toUpperCase() })}
                            />
                        </div>
                    </div>
                </div>

                {/* Evidence */}
                <div className="card p-6 space-y-4">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                        <Camera className="w-4 h-4 text-blue-600" />
                        Bukti Foto
                    </h3>

                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-blue-400 transition-colors">
                        {imagePreview ? (
                            <div className="space-y-4">
                                <img src={imagePreview} alt="Preview" className="max-h-48 mx-auto rounded-xl" />
                                <button
                                    type="button"
                                    onClick={() => { setImagePreview(null); setFormData({ ...formData, evidence_url: '' }); }}
                                    className="text-red-500 text-sm font-medium hover:text-red-600"
                                >
                                    Hapus Foto
                                </button>
                            </div>
                        ) : (
                            <label className="cursor-pointer block">
                                <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-500 text-sm mb-1">Klik untuk upload atau ambil foto</p>
                                <p className="text-slate-400 text-xs">PNG, JPG hingga 5MB</p>
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    className="hidden"
                                    onChange={handleImageChange}
                                />
                            </label>
                        )}
                    </div>
                </div>

                {/* Severity Warning */}
                {formData.severity === 'high' && (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold text-red-700">Laporan Tingkat Tinggi (Accident)</p>
                            <p className="text-sm text-red-600">Laporan ini akan segera dikirim ke Manager dan Tim Safety untuk penanganan prioritas.</p>
                        </div>
                    </div>
                )}

                {/* Submit */}
                <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary w-full"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Mengirim Laporan...
                        </>
                    ) : (
                        <>
                            <FileText className="w-5 h-5" />
                            Kirim Laporan
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
