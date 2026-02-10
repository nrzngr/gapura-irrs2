'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Plane, MapPin, Building2, AlertTriangle, CheckCircle, ChevronRight, ArrowLeft,
    Loader2, Wrench, Package, MessageSquare, Clock, Calendar,
    ToggleLeft, ToggleRight, FileText, Gauge, Link, Plus, X
} from 'lucide-react';
import { WizardStep } from '@/components/ui/WizardStep';
import { IRREGULARITY_CATEGORIES, AREA_TYPES, routeReportToDivision } from '@/lib/constants/irregularity-types';
import { PRIORITY_CONFIG, type ReportPriority } from '@/lib/constants/report-status';
import { AIRLINES } from '@/lib/constants/airlines';

const REPORT_CATEGORIES = [
    { id: 'Irregularity', label: 'Irregularity' },
    { id: 'Complaint', label: 'Complaint' },
    { id: 'Compliment', label: 'Compliment' },
];

const AREA_OPTIONS = [
    { id: 'TERMINAL', label: 'Terminal Area' },
    { id: 'APRON', label: 'Apron Area' },
    { id: 'GENERAL', label: 'General' },
];

const AREA_CATEGORIES: Record<string, string[]> = {
    'TERMINAL': [
        'Passenger, Baggage & Document Profiling',
        'Boarding Management',
        'Baggage/Special/Irregularities Handling',
        'Accuracy & Completeness of Service',
        'Procedure Competencies',
        'Cleanliness Table',
        'Avoids taking initiative to help',
        'Lack communication skills',
        'Other'
    ],
    'APRON': [
        'Preparation Before ETA',
        'Flight Document Handling',
        'The Availability of GSE',
        'Accurancy & Completeness of Service (Apron)',
        'Qualified Competencies (Apron)',
        'Procedure Competencies',
        'Cleanliness of GSE',
        'Prompt Service and Certainty',
        'Specific Needs of Customers',
        'Other'
    ],
    'GENERAL': ['Other']
};

// Airlines considered local (Indonesian carriers)
const LOKAL_AIRLINE_CODES = ['GA', 'QG', 'JT', 'ID', 'IW', 'IU', 'QZ', 'SJ', 'IN', 'IP', '8B', 'SI', 'IL'];

function getAirlineType(airlineName: string): 'Lokal' | 'MPA' {
    const airline = AIRLINES.find(a => a.name === airlineName);
    if (!airline) return 'MPA';
    return LOKAL_AIRLINE_CODES.includes(airline.code) ? 'Lokal' : 'MPA';
}

function getHubForStation(stationCode: string): string {
    if (['CGK', 'SUB', 'DPS'].includes(stationCode)) return stationCode;
    if (['UPG', 'MDC', 'BPN'].includes(stationCode)) return 'UPG';
    if (['KNO', 'PDG', 'PKU', 'BTH', 'PLM'].includes(stationCode)) return 'KNO';
    return 'CGK';
}

function getWeekInMonth(date: Date): number {
    const day = date.getDate();
    return Math.ceil(day / 7);
}

type FormData = {
    // Step 1: Detail Report
    incident_date: string;
    airline: string;
    flight_number: string;
    station_id: string; // Branch
    route: string;
    main_category: string; // Irregularity/Complaint/Compliment

    // Step 2: Area
    area: string;

    // Step 3: Area Category
    area_category: string;

    // Step 4: Report Details
    description: string; // "Report"
    root_cause: string;
    action_taken: string;
    severity: ReportPriority; // Replacing SLA

    // Step 5: Evidence
    reporter_name: string;
    evidence_urls: string[];
};

export default function NewReportWizard() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [userStation, setUserStation] = useState<{ id: string; code: string; name: string } | null>(null);
    const [stations, setStations] = useState<Array<{ id: string; code: string; name: string }>>([]);
    const [selectedStationId, setSelectedStationId] = useState<string>('');
    const [newLinkInput, setNewLinkInput] = useState('');

    const [formData, setFormData] = useState<FormData>({
        incident_date: new Date().toISOString().split('T')[0],
        airline: '',
        flight_number: '',
        station_id: '',
        route: '',
        main_category: 'Irregularity', // Default
        
        area: '',
        area_category: '',
        
        description: '',
        root_cause: '',
        action_taken: '',
        severity: 'medium',
        
        reporter_name: '',
        evidence_urls: [],
    });

    // Fetch user's station and all stations on mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch all stations
                const stationsRes = await fetch('/api/master-data?type=stations');
                const stationsData = await stationsRes.json();
                if (Array.isArray(stationsData)) {
                    setStations(stationsData);
                }

                // Fetch user's station as default
                const userRes = await fetch('/api/auth/me');
                if (userRes.ok) {
                    const userData = await userRes.json();
                    if (userData.station) {
                        setUserStation(userData.station);
                        setSelectedStationId(userData.station.id); // Set default to user's station
                    }
                }
            } catch (err) {
                console.error('Failed to fetch data:', err);
            }
        };
        fetchData();
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

    const handleAddLink = () => {
        const link = newLinkInput.trim();
        if (!link) return;

        if (formData.evidence_urls.length >= 3) {
            setError('Maksimal 3 link');
            return;
        }

        try {
            new URL(link);
        } catch {
            setError('Link tidak valid. Pastikan format URL benar (contoh: https://drive.google.com/...)');
            return;
        }

        setError('');
        setFormData(prev => ({
            ...prev,
            evidence_urls: [...prev.evidence_urls, link],
        }));
        setNewLinkInput('');
    };

    const removeLink = (index: number) => {
        setFormData(prev => ({
            ...prev,
            evidence_urls: prev.evidence_urls.filter((_, i) => i !== index),
        }));
    };

    const nextStep = () => setStep(prev => Math.min(prev + 1, 5));
    const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

    const isStepValid = (): boolean => {
        switch (step) {
            case 1:
                return !!(formData.incident_date && formData.airline && formData.flight_number && selectedStationId && formData.route && formData.main_category);
            case 2:
                return !!formData.area;
            case 3:
                return !!formData.area_category;
            case 4:
                return !!(formData.description && formData.root_cause && formData.action_taken);
            case 5:
                return !!(formData.reporter_name && formData.evidence_urls.length > 0);
            default:
                return false;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Derive auto-populated fields
            const selectedStation = stations.find(s => s.id === selectedStationId);
            const stationCode = selectedStation?.code || '';
            const eventDate = new Date(formData.incident_date);

            const res = await fetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    title: `${formData.airline} ${formData.flight_number} - ${formData.main_category}`,
                    station_id: selectedStationId,
                    sub_category: formData.area_category,
                    // New CSV-aligned fields
                    station_code: stationCode,
                    hub: getHubForStation(stationCode),
                    airline_type: getAirlineType(formData.airline),
                    report_content: formData.description,
                    reporting_branch: stationCode,
                    week_in_month: getWeekInMonth(eventDate),
                    reporter_email: undefined,
                    form_submitted_at: new Date().toISOString(),
                    form_completed_at: new Date().toISOString(),
                }),
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

    const selectedCategory = IRREGULARITY_CATEGORIES.find(c => c.id === 'IRREGULARITY'); // Dummy default to allow build

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
                    Langkah {step} dari 5
                </p>
            </div>

            {/* Progress Bar */}
            <div className="px-4">
                <div className="flex items-center gap-2 max-w-md mx-auto">
                    {[1, 2, 3, 4, 5].map((s) => (
                        <div key={s} className="flex-1 flex items-center">
                            <div 
                                className={`h-2 flex-1 rounded-full transition-all ${s <= step ? 'bg-emerald-500' : 'bg-slate-200'}`}
                            />
                        </div>
                    ))}
                </div>
                <div className="flex justify-between max-w-md mx-auto mt-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                    <span>Detail</span>
                    <span>Area</span>
                    <span>Kategori</span>
                    <span>Isi</span>
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
                {/* Step 1: Detail Report */}
                <WizardStep isActive={step === 1}>
                    <div className="max-w-3xl mx-auto space-y-8">
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold">Detail Report</h2>
                            <p style={{ color: 'var(--text-secondary)' }}>Lengkapi informasi dasar penerbangan</p>
                        </div>

                        <div className="card-solid p-6 md:p-8 space-y-6" style={{ background: 'var(--surface-2)' }}>
                            {/* Date of Event */}
                            <div className="space-y-2">
                                <label className="label flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    1. Date of Event <span className="text-red-500">*</span>
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

                            {/* Airlines */}
                            <div className="space-y-2">
                                <label className="label">2. Airlines <span className="text-red-500">*</span></label>
                                <select
                                    required
                                    className="input-field"
                                    value={formData.airline}
                                    onChange={e => setFormData({ ...formData, airline: e.target.value })}
                                >
                                    <option value="">Select Airline...</option>
                                    {AIRLINES.map((airline) => (
                                        <option key={airline.code} value={airline.name}>
                                            {airline.name} ({airline.code})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Flight Number */}
                            <div className="space-y-2">
                                <label className="label">3. Flight Number <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    className="input-field uppercase"
                                    placeholder="e.g. CZ-123"
                                    value={formData.flight_number}
                                    onChange={e => setFormData({ ...formData, flight_number: e.target.value })}
                                />
                            </div>

                            {/* Branch */}
                            <div className="space-y-2">
                                <label className="label">4. Branch (cth: CGK, UPG, DPS) <span className="text-red-500">*</span></label>
                                <select
                                    required
                                    className="input-field"
                                    value={selectedStationId}
                                    onChange={e => setSelectedStationId(e.target.value)}
                                >
                                    <option value="">Select Branch...</option>
                                    {stations.map((station) => (
                                        <option key={station.id} value={station.id}>
                                            {station.code} - {station.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Route */}
                            <div className="space-y-2">
                                <label className="label">5. Route <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    className="input-field uppercase"
                                    placeholder="e.g. NRT-CGK"
                                    value={formData.route}
                                    onChange={e => setFormData({ ...formData, route: e.target.value })}
                                />
                            </div>

                             {/* Report Category */}
                             <div className="space-y-2">
                                <label className="label">6. Report Category <span className="text-red-500">*</span></label>
                                <div className="flex flex-col gap-3">
                                    {REPORT_CATEGORIES.map((cat) => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, main_category: cat.id })}
                                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-black/5 transition-colors text-left"
                                        >
                                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${formData.main_category === cat.id ? 'border-emerald-500' : 'border-gray-400'}`}>
                                                {formData.main_category === cat.id && (
                                                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                                )}
                                            </div>
                                            <span>{cat.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </WizardStep>

                {/* Step 2: Area */}
                <WizardStep isActive={step === 2}>
                    <div className="max-w-3xl mx-auto space-y-8">
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold">Section</h2>
                            <p style={{ color: 'var(--text-secondary)' }}>Choose the area of the incident</p>
                        </div>

                        <div className="card-solid p-6 md:p-8 space-y-6" style={{ background: 'var(--surface-2)' }}>
                            <div className="space-y-4">
                                <label className="label">7. Area <span className="text-red-500">*</span></label>
                                <div className="flex flex-col gap-3">
                                    {AREA_OPTIONS.map((area) => (
                                        <button
                                            key={area.id}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, area: area.id, area_category: '' })}
                                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-black/5 transition-colors text-left"
                                        >
                                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${formData.area === area.id ? 'border-emerald-500' : 'border-gray-400'}`}>
                                                {formData.area === area.id && (
                                                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                                )}
                                            </div>
                                            <span>{area.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </WizardStep>

                {/* Step 3: Area Category */}
                <WizardStep isActive={step === 3}>
                    <div className="max-w-3xl mx-auto space-y-8">
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold">{AREA_OPTIONS.find(a => a.id === formData.area)?.label}</h2>
                            <p style={{ color: 'var(--text-secondary)' }}>Specify the category for {AREA_OPTIONS.find(a => a.id === formData.area)?.label}</p>
                        </div>

                        <div className="card-solid p-6 md:p-8 space-y-6" style={{ background: 'var(--surface-2)' }}>
                            <div className="space-y-4">
                                <label className="label">8. {AREA_OPTIONS.find(a => a.id === formData.area)?.label} Category <span className="text-red-500">*</span></label>
                                <div className="flex flex-col gap-3">
                                    {AREA_CATEGORIES[formData.area]?.map((cat, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, area_category: cat })}
                                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-black/5 transition-colors text-left"
                                        >
                                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${formData.area_category === cat ? 'border-emerald-500' : 'border-gray-400'}`}>
                                                {formData.area_category === cat && (
                                                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                                )}
                                            </div>
                                            <span>{cat}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </WizardStep>

                {/* Step 4: Report Details */}
                <WizardStep isActive={step === 4}>
                    <div className="max-w-3xl mx-auto space-y-8">
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold">Irregularity / Complaint</h2>
                            <p style={{ color: 'var(--text-secondary)' }}>Fill in the details</p>
                        </div>

                        <div className="card-solid p-6 md:p-8 space-y-6" style={{ background: 'var(--surface-2)' }}>
                            {/* Report / Description */}
                            <div className="space-y-2">
                                <label className="label">9. Report <span className="text-red-500">*</span></label>
                                <textarea
                                    required
                                    className="input-field min-h-[100px] resize-y"
                                    placeholder="Enter your answer"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            {/* Root Cause */}
                            <div className="space-y-2">
                                <label className="label">10. Root Cause <span className="text-red-500">*</span></label>
                                <textarea
                                    required
                                    className="input-field min-h-[100px] resize-y"
                                    placeholder="Enter your answer"
                                    value={formData.root_cause}
                                    onChange={e => setFormData({ ...formData, root_cause: e.target.value })}
                                />
                            </div>

                            {/* Action Taken */}
                            <div className="space-y-2">
                                <label className="label">11. Action Taken <span className="text-red-500">*</span></label>
                                <textarea
                                    required
                                    className="input-field min-h-[100px] resize-y"
                                    placeholder="Enter your answer"
                                    value={formData.action_taken}
                                    onChange={e => setFormData({ ...formData, action_taken: e.target.value })}
                                />
                            </div>

                             {/* Severity */}
                             <div className="space-y-2">
                                <label className="label flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    Severity
                                </label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {(Object.entries(PRIORITY_CONFIG) as [ReportPriority, typeof PRIORITY_CONFIG[ReportPriority]][]).map(([key, config]) => {
                                        const isSelected = formData.severity === key;
                                        return (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, severity: key })}
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
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </WizardStep>

                {/* Step 5: Evidence */}
                <WizardStep isActive={step === 5}>
                    <div className="max-w-3xl mx-auto space-y-8">
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold">Evidence</h2>
                            <p style={{ color: 'var(--text-secondary)' }}>Lampirkan link Google Drive sebagai bukti</p>
                        </div>

                        <div className="card-solid p-6 md:p-8 space-y-6" style={{ background: 'var(--surface-2)' }}>
                            {/* Report By */}
                            <div className="space-y-2">
                                <label className="label">12. Report By <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    className="input-field"
                                    placeholder="Enter your answer"
                                    value={formData.reporter_name}
                                    onChange={e => setFormData({ ...formData, reporter_name: e.target.value })}
                                />
                            </div>

                            {/* Google Drive Link */}
                            <div className="space-y-4">
                                <label className="label">13. Link Google Drive Evidence <span className="text-red-500">*</span></label>

                                {/* Added Links */}
                                {formData.evidence_urls.length > 0 && (
                                    <div className="space-y-2">
                                        {formData.evidence_urls.map((url, idx) => (
                                            <div key={idx} className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                                                <Link className="w-4 h-4 text-emerald-600 shrink-0" />
                                                <a
                                                    href={url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm text-emerald-700 hover:underline truncate flex-1"
                                                >
                                                    {url}
                                                </a>
                                                <button
                                                    type="button"
                                                    onClick={() => removeLink(idx)}
                                                    className="p-1 hover:bg-red-100 text-red-500 rounded-lg transition-colors shrink-0"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Add Link Input */}
                                {formData.evidence_urls.length < 3 && (
                                    <div className="space-y-3">
                                        <div className="flex gap-2">
                                            <input
                                                type="url"
                                                className="input-field flex-1"
                                                placeholder="https://drive.google.com/..."
                                                value={newLinkInput}
                                                onChange={e => setNewLinkInput(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddLink(); } }}
                                            />
                                            <button
                                                type="button"
                                                onClick={handleAddLink}
                                                className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors flex items-center gap-1.5"
                                            >
                                                <Plus className="w-4 h-4" />
                                                Tambah
                                            </button>
                                        </div>
                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                            Paste link Google Drive (maks. {3 - formData.evidence_urls.length} lagi)
                                        </p>
                                    </div>
                                )}
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
                    
                    {step < 5 ? (
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
                            disabled={!isStepValid() || loading}
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
