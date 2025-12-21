'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    Plane, MapPin, Building2, AlertTriangle, CheckCircle, ChevronRight, ArrowLeft,
    Loader2, Camera, Upload, Wrench, Package, MessageSquare, Clock, Calendar,
    ToggleLeft, ToggleRight, FileText, Gauge
} from 'lucide-react';
import { WizardStep } from '@/components/ui/WizardStep';
import { supabase } from '@/lib/supabase';
import { IRREGULARITY_CATEGORIES, AREA_TYPES, routeReportToDivision } from '@/lib/constants/irregularity-types';
import { PRIORITY_CONFIG, type ReportPriority } from '@/lib/constants/report-status';

// Icon mapping for categories
const CATEGORY_ICONS: Record<string, React.ElementType> = {
    Wrench,
    Package,
    AlertTriangle,
    MessageSquare,
};

type FormData = {
    // Step 1: Context
    incident_date: string;
    incident_time: string;
    area: 'APRON' | 'TERMINAL' | 'GENERAL' | '';
    specific_location: string;
    
    // Step 2: Subject
    is_flight_related: boolean;
    flight_number: string;
    aircraft_reg: string;
    is_gse_related: boolean;
    gse_number: string;
    gse_name: string;
    
    // Step 3: The Case
    main_category: string;
    sub_category: string;
    title: string;
    description: string;
    immediate_action: string;
    priority: ReportPriority;
    
    // Step 4: Evidence
    evidence_urls: string[];
    evidence_meta?: {
        url: string;
        dateTimeOriginal?: string;
        gps?: {
            latitude: number;
            longitude: number;
        };
    }[];
};

export default function NewReportWizard() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [userStation, setUserStation] = useState<{ code: string; name: string } | null>(null);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    
    // ExifReader State
    const exifReaderRef = useRef<any>(null);
    const [isExifReaderLoaded, setIsExifReaderLoaded] = useState(false);

    useEffect(() => {
        import('exifreader').then((module) => {
            exifReaderRef.current = module.default;
            setIsExifReaderLoaded(true);
        }).catch(err => console.error("Failed to load ExifReader", err));
    }, []);

    const [formData, setFormData] = useState<FormData>({
        incident_date: new Date().toISOString().split('T')[0],
        incident_time: new Date().toTimeString().slice(0, 5),
        area: '',
        specific_location: '',
        
        is_flight_related: false,
        flight_number: '',
        aircraft_reg: '',
        is_gse_related: false,
        gse_number: '',
        gse_name: '',
        
        main_category: '',
        sub_category: '',
        title: '',
        description: '',
        immediate_action: '',
        priority: 'medium',
        
        evidence_urls: [],
        evidence_meta: [],
    });

    // Fetch user's station on mount
    useEffect(() => {
        const fetchUserStation = async () => {
            try {
                const res = await fetch('/api/auth/me');
                if (res.ok) {
                    const data = await res.json();
                    if (data.station) {
                        setUserStation(data.station);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch user station:', err);
            }
        };
        fetchUserStation();
    }, []);

    // Hide mobile bottom navigation on this page
    useEffect(() => {
        const hideMobileNav = () => {
            const mobileNav = document.querySelector('[data-hide-mobile-nav]');
            if (mobileNav) {
                (mobileNav as HTMLElement).style.display = 'none';
            }
        };

        hideMobileNav();

        // Show mobile nav when leaving the page
        return () => {
            const mobileNav = document.querySelector('[data-hide-mobile-nav]');
            if (mobileNav) {
                (mobileNav as HTMLElement).style.display = '';
            }
        };
    }, []);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const maxPhotos = 3;
        if (formData.evidence_urls.length + files.length > maxPhotos) {
            setError(`Maksimal ${maxPhotos} foto`);
            return;
        }

        setUploading(true);
        setError('');

        try {
            const uploadedUrls: string[] = [];
            const newPreviews: string[] = [];
            const uploadedMetas: { url: string; dateTimeOriginal?: string; gps?: { latitude: number; longitude: number; }; }[] = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                
                if (file.size > 10 * 1024 * 1024) {
                    setError('Ukuran file maksimal 10MB');
                    continue;
                }

                let newMeta: { url: string; dateTimeOriginal?: string; gps?: { latitude: number; longitude: number; }; } = { url: '' };

                if (isExifReaderLoaded && exifReaderRef.current) {
                    try {
                        const tags = await exifReaderRef.current.load(file);
                        
                        // Extract Timestamp
                        const dateTimeOriginal = tags['DateTimeOriginal']?.description;
                        if (dateTimeOriginal) {
                            newMeta.dateTimeOriginal = dateTimeOriginal;
                        }

                        // Extract GPS
                        const lat = tags['GPSLatitude']?.description;
                        const long = tags['GPSLongitude']?.description;
                        
                        if (lat && long) {
                             const latNum = parseFloat(String(lat));
                             const longNum = parseFloat(String(long));
                             if (!isNaN(latNum) && !isNaN(longNum)) {
                                 newMeta.gps = { latitude: latNum, longitude: longNum };
                             }
                        }
                    } catch (e) {
                         console.log('EXIF extraction failed for file', file.name, e);
                    }
                }
                
                uploadedMetas.push(newMeta);
                
                // Create local preview
                const objectUrl = URL.createObjectURL(file);
                newPreviews.push(objectUrl);

                // Upload to Supabase Storage
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('evidence')
                    .upload(fileName, file);

                if (uploadError) {
                    throw uploadError;
                }

                const { data: { publicUrl } } = supabase.storage
                    .from('evidence')
                    .getPublicUrl(fileName);

                // Update the meta with the FINAL public URL
                newMeta.url = publicUrl;
                uploadedUrls.push(publicUrl);
            }

            // Update state with BOTH urls and meta
            setImagePreviews(prev => [...prev, ...newPreviews]);
            setFormData(prev => ({
                ...prev,
                evidence_urls: [...prev.evidence_urls, ...uploadedUrls],
                // We need to manage evidence_meta in state too
                evidence_meta: [...(prev.evidence_meta || []), ...uploadedMetas]
            }));

        } catch (err: any) {
            console.error('Upload error:', err);
            setError('Gagal upload foto. Silakan coba lagi.');
        } finally {
            setUploading(false);
        }
    };

    const removeImage = (index: number) => {
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
        setFormData(prev => ({
            ...prev,
            evidence_urls: prev.evidence_urls.filter((_, i) => i !== index),
        }));
    };

    const nextStep = () => setStep(prev => Math.min(prev + 1, 4));
    const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

    const isStepValid = (): boolean => {
        switch (step) {
            case 1:
                return !!(formData.incident_date && formData.incident_time && formData.area && formData.specific_location);
            case 2:
                if (formData.is_flight_related && !formData.flight_number) return false;
                if (formData.is_gse_related && !formData.gse_number) return false;
                return true;
            case 3:
                return !!(formData.main_category && formData.sub_category && formData.title && formData.description.length >= 20);
            case 4:
                return formData.evidence_urls.length >= 1;
            default:
                return false;
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
            }, 3000);
        } catch (err: any) {
            setError(err.message || 'Terjadi kesalahan');
        } finally {
            setLoading(false);
        }
    };

    const selectedCategory = IRREGULARITY_CATEGORIES.find(c => c.id === formData.main_category);

    if (success) {
        return (
            <div className="flex items-center justify-center min-h-[80vh]">
                <div className="text-center animate-scale-in p-12 card-glass max-w-lg mx-auto">
                    <div className="w-28 h-28 bg-emerald-100/50 rounded-full flex items-center justify-center mx-auto mb-8 ring-8 ring-emerald-50/50 animate-bounce">
                        <CheckCircle className="w-16 h-16 text-emerald-600" />
                    </div>
                    <h2 className="text-4xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Laporan Terkirim!</h2>
                    <p className="text-lg mb-8" style={{ color: 'var(--text-secondary)' }}>
                        Terima kasih atas kontribusi Anda dalam menjaga kualitas dan keselamatan operasional.
                    </p>
                    <p className="text-sm font-medium animate-pulse" style={{ color: 'var(--brand-primary)' }}>
                        Mengalihkan ke dashboard...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-32 md:pb-8 pt-8">
            {/* Header */}
            <div className="text-center space-y-2 animate-fade-in-up px-4">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Buat Laporan Irregularity</h1>
                <p className="text-base md:text-lg" style={{ color: 'var(--text-secondary)' }}>
                    Langkah {step} dari 4
                </p>
            </div>

            {/* Progress Bar */}
            <div className="px-4">
                <div className="flex items-center gap-2 max-w-md mx-auto">
                    {[1, 2, 3, 4].map((s) => (
                        <div key={s} className="flex-1 flex items-center">
                            <div 
                                className={`h-2 flex-1 rounded-full transition-all ${s <= step ? 'bg-emerald-500' : 'bg-slate-200'}`}
                            />
                        </div>
                    ))}
                </div>
                <div className="flex justify-between max-w-md mx-auto mt-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                    <span>Konteks</span>
                    <span>Objek</span>
                    <span>Masalah</span>
                    <span>Bukti</span>
                </div>
            </div>

            {error && (
                <div className="mx-auto max-w-2xl p-4 rounded-xl flex items-center gap-3 animate-fade-in-up" style={{ background: 'oklch(0.60 0.22 25 / 0.1)', color: 'oklch(0.55 0.18 25)' }}>
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <p>{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="min-h-[400px]">
                {/* Step 1: Context */}
                <WizardStep isActive={step === 1}>
                    <div className="max-w-3xl mx-auto space-y-8">
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold">Konteks Kejadian</h2>
                            <p style={{ color: 'var(--text-secondary)' }}>Kapan dan di mana kejadian terjadi?</p>
                        </div>

                        <div className="card-solid p-6 md:p-8 space-y-6" style={{ background: 'var(--surface-2)' }}>
                            {/* Station (Locked) */}
                            <div className="space-y-2">
                                <label className="label">Station (Lokasi Anda)</label>
                                <div 
                                    className="input-field flex items-center gap-3 cursor-not-allowed opacity-80"
                                    style={{ background: 'var(--surface-3)' }}
                                >
                                    <Building2 className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                                    <span className="font-semibold">
                                        {userStation ? `${userStation.code} - ${userStation.name}` : 'Memuat...'}
                                    </span>
                                </div>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                    Station diambil dari profil Anda untuk keamanan
                                </p>
                            </div>

                            {/* Date & Time */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="label flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        Tanggal Kejadian
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        max={new Date().toISOString().split('T')[0]}
                                        className="input-field"
                                        value={formData.incident_date}
                                        onChange={e => setFormData({ ...formData, incident_date: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="label flex items-center gap-2">
                                        <Clock className="w-4 h-4" />
                                        Waktu Kejadian
                                    </label>
                                    <input
                                        type="time"
                                        required
                                        className="input-field"
                                        value={formData.incident_time}
                                        onChange={e => setFormData({ ...formData, incident_time: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Area Selection */}
                            <div className="space-y-4">
                                <label className="label">Area Utama</label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {AREA_TYPES.map((area) => {
                                        const Icon = area.icon === 'Plane' ? Plane : area.icon === 'Building2' ? Building2 : MapPin;
                                        const isSelected = formData.area === area.id;
                                        return (
                                            <button
                                                key={area.id}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, area: area.id })}
                                                className={`relative p-6 rounded-2xl border-2 transition-all text-left ${
                                                    isSelected 
                                                        ? 'border-emerald-500 bg-emerald-50' 
                                                        : 'border-transparent bg-slate-50 hover:bg-slate-100'
                                                }`}
                                            >
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                                                    isSelected ? 'bg-emerald-500 text-white' : 'bg-white'
                                                }`}>
                                                    <Icon size={24} />
                                                </div>
                                                <h4 className="font-bold text-lg">{area.label}</h4>
                                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{area.description}</p>
                                                {isSelected && (
                                                    <div className="absolute top-4 right-4">
                                                        <CheckCircle className="w-6 h-6 text-emerald-500" />
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Specific Location */}
                            <div className="space-y-2">
                                <label className="label">Lokasi Spesifik</label>
                                <input
                                    type="text"
                                    required
                                    className="input-field"
                                    placeholder="Contoh: Parking Stand R45 / Gate 3 / Gudang Cargo A"
                                    value={formData.specific_location}
                                    onChange={e => setFormData({ ...formData, specific_location: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </WizardStep>

                {/* Step 2: Subject */}
                <WizardStep isActive={step === 2}>
                    <div className="max-w-3xl mx-auto space-y-8">
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold">Objek Terdampak</h2>
                            <p style={{ color: 'var(--text-secondary)' }}>Apa yang terkena masalah?</p>
                        </div>

                        <div className="card-solid p-6 md:p-8 space-y-8" style={{ background: 'var(--surface-2)' }}>
                            {/* Flight Related Toggle */}
                            <div className="space-y-4">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ 
                                        ...formData, 
                                        is_flight_related: !formData.is_flight_related,
                                        is_gse_related: false 
                                    })}
                                    className={`w-full p-6 rounded-2xl border-2 transition-all text-left flex items-center justify-between ${
                                        formData.is_flight_related 
                                            ? 'border-blue-500 bg-blue-50' 
                                            : 'border-slate-200 hover:border-slate-300'
                                    }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                            formData.is_flight_related ? 'bg-blue-500 text-white' : 'bg-slate-100'
                                        }`}>
                                            <Plane size={24} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-lg">Terkait Penerbangan?</h4>
                                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                                Kejadian melibatkan pesawat atau penerbangan tertentu
                                            </p>
                                        </div>
                                    </div>
                                    {formData.is_flight_related ? (
                                        <ToggleRight className="w-8 h-8 text-blue-500" />
                                    ) : (
                                        <ToggleLeft className="w-8 h-8 text-slate-400" />
                                    )}
                                </button>

                                {formData.is_flight_related && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 animate-fade-in-up">
                                        <div className="space-y-2">
                                            <label className="label">Nomor Penerbangan</label>
                                            <input
                                                type="text"
                                                className="input-field uppercase font-mono"
                                                placeholder="GA-404"
                                                value={formData.flight_number}
                                                onChange={e => setFormData({ ...formData, flight_number: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="label">Registrasi Pesawat (Opsional)</label>
                                            <input
                                                type="text"
                                                className="input-field uppercase font-mono"
                                                placeholder="PK-GIA"
                                                value={formData.aircraft_reg}
                                                onChange={e => setFormData({ ...formData, aircraft_reg: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* GSE Related Toggle (only if not flight related) */}
                            {!formData.is_flight_related && (
                                <div className="space-y-4">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, is_gse_related: !formData.is_gse_related })}
                                        className={`w-full p-6 rounded-2xl border-2 transition-all text-left flex items-center justify-between ${
                                            formData.is_gse_related 
                                                ? 'border-amber-500 bg-amber-50' 
                                                : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                                formData.is_gse_related ? 'bg-amber-500 text-white' : 'bg-slate-100'
                                            }`}>
                                                <Wrench size={24} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-lg">Terkait Alat / GSE?</h4>
                                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                                    Kejadian melibatkan kendaraan atau peralatan GSE
                                                </p>
                                            </div>
                                        </div>
                                        {formData.is_gse_related ? (
                                            <ToggleRight className="w-8 h-8 text-amber-500" />
                                        ) : (
                                            <ToggleLeft className="w-8 h-8 text-slate-400" />
                                        )}
                                    </button>

                                    {formData.is_gse_related && (
                                        <div className="pl-4 animate-fade-in-up space-y-4">
                                            <div className="space-y-2">
                                                <label className="label">Nama Alat / Jenis GSE</label>
                                                <input
                                                    type="text"
                                                    className="input-field"
                                                    placeholder="Contoh: Belt Loader, Pushback Tractor, High Lift Loader"
                                                    value={formData.gse_name}
                                                    onChange={e => setFormData({ ...formData, gse_name: e.target.value })}
                                                />
                                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Wajib diisi jika lupa nomor aset</p>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="label">Nomor Aset / BTT (Opsional)</label>
                                                <input
                                                    type="text"
                                                    className="input-field uppercase font-mono"
                                                    placeholder="BTT-01 atau No. Asset"
                                                    value={formData.gse_number}
                                                    onChange={e => setFormData({ ...formData, gse_number: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {!formData.is_flight_related && !formData.is_gse_related && (
                                <p className="text-center py-4" style={{ color: 'var(--text-muted)' }}>
                                    Jika tidak terkait penerbangan atau GSE, lanjutkan ke langkah berikutnya
                                </p>
                            )}
                        </div>
                    </div>
                </WizardStep>

                {/* Step 3: The Case */}
                <WizardStep isActive={step === 3}>
                    <div className="max-w-3xl mx-auto space-y-8">
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold">Detail Masalah</h2>
                            <p style={{ color: 'var(--text-secondary)' }}>Masalahnya apa? (Krusial untuk Routing)</p>
                        </div>

                        <div className="card-solid p-6 md:p-8 space-y-6" style={{ background: 'var(--surface-2)' }}>
                            {/* Main Category */}
                            <div className="space-y-4">
                                <label className="label">Kategori Masalah</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {IRREGULARITY_CATEGORIES.map((cat) => {
                                        const Icon = CATEGORY_ICONS[cat.icon] || AlertTriangle;
                                        const isSelected = formData.main_category === cat.id;
                                        return (
                                            <button
                                                key={cat.id}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, main_category: cat.id, sub_category: '' })}
                                                className={`p-4 rounded-xl border-2 transition-all text-left flex items-center gap-3 ${
                                                    isSelected ? 'border-current' : 'border-transparent'
                                                }`}
                                                style={{
                                                    background: isSelected ? cat.bgColor : 'var(--surface-3)',
                                                    color: isSelected ? cat.color : 'var(--text-primary)',
                                                    borderColor: isSelected ? cat.color : 'transparent',
                                                }}
                                            >
                                                <div 
                                                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                                                    style={{ 
                                                        background: isSelected ? cat.color : cat.bgColor,
                                                        color: isSelected ? 'white' : cat.color,
                                                    }}
                                                >
                                                    <Icon size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-sm">{cat.label}</h4>
                                                    <p className="text-xs opacity-80">→ {cat.targetDivision}</p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Sub Category */}
                            {selectedCategory && (
                                <div className="space-y-2 animate-fade-in-up">
                                    <label className="label">Jenis Masalah Spesifik</label>
                                    <select
                                        required
                                        className="input-field"
                                        value={formData.sub_category}
                                        onChange={e => setFormData({ ...formData, sub_category: e.target.value })}
                                    >
                                        <option value="">Pilih masalah spesifik...</option>
                                        {selectedCategory.problems.map((problem) => (
                                            <option key={problem} value={problem}>{problem}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Priority Selector */}
                            <div className="space-y-2">
                                <label className="label flex items-center gap-2">
                                    <Gauge className="w-4 h-4" />
                                    Tingkat Urgensi (SLA)
                                </label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {(Object.entries(PRIORITY_CONFIG) as [ReportPriority, typeof PRIORITY_CONFIG[ReportPriority]][]).map(([key, config]) => {
                                        const isSelected = formData.priority === key;
                                        return (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, priority: key })}
                                                className={`p-3 rounded-xl border-2 transition-all text-center ${
                                                    isSelected ? 'border-current' : 'border-transparent'
                                                }`}
                                                style={{
                                                    background: isSelected ? config.bgColor : 'var(--surface-3)',
                                                    color: isSelected ? config.color : 'var(--text-primary)',
                                                    borderColor: isSelected ? config.color : 'transparent',
                                                }}
                                            >
                                                <span className="font-bold text-sm block">{config.label}</span>
                                                <span className="text-xs opacity-70">
                                                    {config.slaHours >= 24 
                                                        ? `${config.slaHours / 24}d SLA`
                                                        : `${config.slaHours}h SLA`
                                                    }
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                    Menentukan batas waktu penyelesaian. Pilih "Kritis" untuk kejadian darurat.
                                </p>
                            </div>

                            {/* Title */}
                            <div className="space-y-2">
                                <label className="label">Judul Laporan</label>
                                <input
                                    type="text"
                                    required
                                    maxLength={100}
                                    className="input-field"
                                    placeholder="Ringkasan singkat masalah..."
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                                <p className="text-xs text-right" style={{ color: 'var(--text-muted)' }}>
                                    {formData.title.length}/100
                                </p>
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <label className="label">Kronologis Kejadian (5W + 1H)</label>
                                <textarea
                                    required
                                    className="input-field min-h-[150px] resize-y"
                                    placeholder="Jelaskan apa yang terjadi, siapa yang terlibat, bagaimana kejadiannya..."
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                                <p className={`text-xs ${formData.description.length < 20 ? 'text-red-500' : ''}`} style={{ color: formData.description.length >= 20 ? 'var(--text-muted)' : undefined }}>
                                    Minimal 20 karakter ({formData.description.length} tertulis)
                                </p>
                            </div>

                            {/* Immediate Action */}
                            <div className="space-y-2">
                                <label className="label">Tindakan Awal (Opsional)</label>
                                <textarea
                                    className="input-field min-h-[100px] resize-y"
                                    placeholder="Apa yang sudah dilakukan saat itu? (Misal: Lapor ke teknisi, ganti BTT cadangan, dll)"
                                    value={formData.immediate_action}
                                    onChange={e => setFormData({ ...formData, immediate_action: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </WizardStep>

                {/* Step 4: Evidence */}
                <WizardStep isActive={step === 4}>
                    <div className="max-w-3xl mx-auto space-y-8">
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold">Bukti & Validasi</h2>
                            <p style={{ color: 'var(--text-secondary)' }}>Upload foto bukti kejadian</p>
                        </div>

                        <div className="card-solid p-6 md:p-8 space-y-6" style={{ background: 'var(--surface-2)' }}>
                            {/* Photo Upload */}
                            <div className="space-y-4">
                                <label className="label">Foto Bukti (Wajib minimal 1, maksimal 3)</label>
                                
                                {/* Image Previews */}
                                {imagePreviews.length > 0 && (
                                    <div className="grid grid-cols-3 gap-4">
                                        {imagePreviews.map((preview, idx) => (
                                            <div key={idx} className="relative group">
                                                <img 
                                                    src={preview} 
                                                    alt={`Evidence ${idx + 1}`} 
                                                    className="w-full h-32 object-cover rounded-xl"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeImage(idx)}
                                                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Upload Area */}
                                {formData.evidence_urls.length < 3 && (
                                    <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 hover:bg-slate-50 transition-colors text-center cursor-pointer relative">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={handleImageUpload}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        {uploading ? (
                                            <Loader2 className="w-12 h-12 mx-auto animate-spin text-emerald-500" />
                                        ) : (
                                            <>
                                                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <Camera className="w-8 h-8 text-emerald-600" />
                                                </div>
                                                <p className="font-bold">Klik atau Ambil Foto</p>
                                                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                                    JPG, PNG (Max 10MB per file)
                                                </p>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Summary Review */}
                            <div className="border-t pt-6 mt-6">
                                <h3 className="font-bold text-lg mb-4">Ringkasan Laporan</h3>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <span style={{ color: 'var(--text-muted)' }}>Station</span>
                                        <span className="font-medium">{userStation?.code || '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span style={{ color: 'var(--text-muted)' }}>Tanggal & Waktu</span>
                                        <span className="font-medium">{formData.incident_date} {formData.incident_time}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span style={{ color: 'var(--text-muted)' }}>Area</span>
                                        <span className="font-medium">{formData.area} - {formData.specific_location}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span style={{ color: 'var(--text-muted)' }}>Kategori</span>
                                        <span className="font-medium">{selectedCategory?.label || '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span style={{ color: 'var(--text-muted)' }}>Masalah</span>
                                        <span className="font-medium">{formData.sub_category || '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span style={{ color: 'var(--text-muted)' }}>Routing ke</span>
                                        <span 
                                            className="font-bold px-2 py-0.5 rounded" 
                                            style={{ 
                                                background: selectedCategory?.bgColor,
                                                color: selectedCategory?.color 
                                            }}
                                        >
                                            {selectedCategory?.targetDivision || 'OS'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </WizardStep>

                {/* Navigation */}
                <div className="fixed bottom-0 left-0 right-0 md:bottom-6 md:right-6 md:left-auto p-4 md:p-0 bg-white/80 backdrop-blur-xl md:bg-transparent border-t md:border-none z-[100] flex items-center justify-between md:justify-end gap-4">
                    <button
                        type="button"
                        onClick={prevStep}
                        className={`btn-secondary h-12 w-12 rounded-full p-0 flex items-center justify-center !shadow-lg bg-white transition-opacity ${step > 1 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    
                    {step < 4 ? (
                        <button
                            type="button"
                            onClick={nextStep}
                            disabled={!isStepValid()}
                            className="flex-1 md:flex-none h-12 px-6 rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 font-bold hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            Lanjut
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    ) : (
                        <button
                            type="submit"
                            disabled={!isStepValid() || loading || uploading}
                            className="flex-1 md:flex-none h-12 px-6 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Kirim Laporan
                                    <FileText className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    )}
                </div>

                {/* Step Indicator */}
                <div className="fixed top-20 md:top-24 right-4 md:right-6 z-[100] bg-white/80 backdrop-blur-md px-4 py-2 rounded-full border shadow-sm flex items-center gap-2">
                    <span className="text-sm font-bold">Langkah {step}/4</span>
                </div>
            </form>
        </div>
    );
}
