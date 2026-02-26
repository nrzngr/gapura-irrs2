'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { WizardStep } from '@/components/ui/WizardStep';
import GuestNav from '@/components/GuestNav';
import { ReportDownloadModal } from '@/components/dashboard/ReportDownloadModal';
import { PRIORITY_CONFIG, type ReportPriority } from '@/lib/constants/report-status';
import { AIRLINES } from '@/lib/constants/airlines';
import { AlertTriangle, Calendar, Plus, CheckCircle } from 'lucide-react';

const REPORT_CATEGORIES = [
  { id: 'Irregularity', label: 'Irregularity' },
  { id: 'Complaint', label: 'Complaint' },
  { id: 'Compliment', label: 'Compliment' },
];

const AREA_OPTIONS = [
  { id: 'TERMINAL', label: 'Terminal Area' },
  { id: 'APRON', label: 'Apron Area' },
  { id: 'CARGO', label: 'Cargo Area' },
  { id: 'GENERAL', label: 'General' },
];

const AREA_CATEGORIES: Record<string, string[]> = {
  TERMINAL: [
    'Passenger, Baggage & Document Profiling',
    'Boarding Management',
    'Baggage/Special/Irregularities Handling',
    'Accuracy & Completeness of Service',
    'Procedure Competencies',
    'Cleanliness Table',
    'Avoids taking initiative to help',
    'Lack communication skills',
    'Other',
  ],
  APRON: [
    'Preparation Before ETA',
    'Flight Document Handling',
    'The Availability of GSE',
    'Accurancy & Completeness of Service (Apron)',
    'Qualified Competencies (Apron)',
    'Procedure Competencies',
    'Cleanliness of GSE',
    'Prompt Service and Certainty',
    'Specific Needs of Customers',
    'Other',
  ],
  CARGO: ['Acceptance', 'Build Up', 'Break Down', 'Delivery', 'Documentation', 'Storage/Warehousing', 'Other'],
  GENERAL: ['Other'],
};

const LOKAL_AIRLINE_CODES = ['GA', 'QG', 'JT', 'ID', 'IW', 'IU', 'QZ', 'SJ', 'IN', 'IP', '8B', 'SI', 'IL'];

function getAirlineType(airlineName: string): 'Lokal' | 'MPA' {
  const airline = AIRLINES.find((a) => a.name === airlineName);
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
  incident_date: string;
  airline: string;
  flight_number: string;
  station_id: string;
  route: string;
  main_category: string;
  delay_code: string;
  delay_duration: string;
  area: string;
  area_category: string;
  description: string;
  root_cause: string;
  action_taken: string;
  severity: ReportPriority;
  reporter_name: string;
  reporter_email: string;
  evidence_urls: string[];
};

export default function PublicReportPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [stations, setStations] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [createdReport, setCreatedReport] = useState<any>(null);

  const [formData, setFormData] = useState<FormData>({
    incident_date: new Date().toISOString().split('T')[0],
    airline: '',
    flight_number: '',
    station_id: '',
    route: '',
    main_category: 'Irregularity',
    delay_code: '',
    delay_duration: '',
    area: '',
    area_category: '',
    description: '',
    root_cause: '',
    action_taken: '',
    severity: 'medium',
    reporter_name: '',
    reporter_email: '',
    evidence_urls: [],
  });

  useEffect(() => {
    const fetchStations = async () => {
      try {
        const res = await fetch('/api/master-data?type=stations');
        const data = await res.json();
        if (Array.isArray(data)) setStations(data);
      } catch (e) {
        console.error('Failed to load stations', e);
      }
    };
    fetchStations();
  }, []);

  // Ensure mobile bottom nav (GuestNav) remains visible on public access pages

  const compressImage = (file: File, opts: { maxWidth?: number; maxHeight?: number; quality?: number; mimeType?: string } = {}) => {
    const { maxWidth = 1600, maxHeight = 1600, quality = 0.8, mimeType = 'image/webp' } = opts;
    return new Promise<File>((resolve, reject) => {
      const img = document.createElement('img');
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          return reject(new Error('Canvas not supported'));
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          if (!blob) return reject(new Error('Compression failed'));
          const ext = mimeType.includes('webp') ? 'webp' : 'jpg';
          const compressed = new File([blob], file.name.replace(/\.[^.]+$/, `.${ext}`), { type: blob.type });
          resolve(compressed);
        }, mimeType, quality);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Image load error'));
      };
      img.src = url;
    });
  };

  const handleFilesSelected = async () => {
    if (!selectedFiles.length) return;
    try {
      const uploadedUrls: string[] = [];
      for (const file of selectedFiles) {
        if (!file.type.startsWith('image/')) continue;
        const compressed = await compressImage(file);
        const fd = new FormData();
        fd.append('file', compressed);
        const res = await fetch('/api/uploads/evidence/public', { method: 'POST', body: fd });
        if (!res.ok) {
          const msg = await res.text();
          throw new Error(msg || 'Gagal upload bukti');
        }
        const data = await res.json();
        uploadedUrls.push(data.url);
      }
      setFormData((prev) => ({ ...prev, evidence_urls: [...prev.evidence_urls, ...uploadedUrls] }));
      setSelectedFiles([]);
      setError('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal mengunggah bukti';
      setError(message);
    }
  };

  const removeEvidenceAt = (index: number) => {
    setFormData((prev) => ({ ...prev, evidence_urls: prev.evidence_urls.filter((_, i) => i !== index) }));
  };

  const nextStep = () => setStep((prev) => Math.min(prev + 1, 5));
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  const isStepValid = (): boolean => {
    switch (step) {
      case 1:
        return !!(formData.incident_date && formData.airline && formData.flight_number && formData.station_id && formData.route && formData.main_category);
      case 2:
        return !!formData.area;
      case 3:
        return !!formData.area_category;
      case 4:
        return !!(formData.description && formData.root_cause && formData.action_taken);
      case 5:
        return !!(formData.reporter_name && formData.reporter_email && formData.evidence_urls.length > 0);
      default:
        return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const selectedStation = stations.find((s) => s.id === formData.station_id);
      const stationCode = selectedStation?.code || formData.station_id || '';
      const eventDate = new Date(formData.incident_date);

      const payload = {
        ...formData,
        title: `${formData.airline} ${formData.flight_number} - ${formData.main_category}`,
        station_id: formData.station_id,
        category: formData.main_category,
        station_code: stationCode,
        hub: getHubForStation(stationCode),
        jenis_maskapai: getAirlineType(formData.airline),
        report: formData.description,
        reporting_branch: stationCode,
        week_in_month: getWeekInMonth(eventDate),
        form_submitted_at: new Date().toISOString(),
        form_completed_at: new Date().toISOString(),
        area: formData.area,
        incident_type_id: formData.area_category,
        delay_code: formData.delay_code,
        delay_duration: formData.delay_duration,
        terminal_area_category: formData.area === 'TERMINAL' ? formData.area_category : undefined,
        apron_area_category: formData.area === 'APRON' ? formData.area_category : undefined,
        general_category: formData.area === 'GENERAL' || formData.area === 'CARGO' ? formData.area_category : undefined,
      };

      const res = await fetch('/api/reports/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await res.text();
        throw new Error('Respons server tidak valid. Mohon coba lagi.');
      }
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Gagal mengirim laporan');
      }

      setCreatedReport({
        ...formData,
        ...data.data,
        id: data.data?.id || 'DRAFT',
      });
      setSuccess(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <>
        <GuestNav />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center animate-scale-in p-12 card-glass max-w-lg mx-auto">
            <div className="w-28 h-28 bg-emerald-100/50 rounded-full flex items-center justify-center mx-auto mb-8 ring-8 ring-emerald-50/50 animate-bounce">
              <CheckCircle className="w-16 h-16 text-emerald-600" />
            </div>
            <h2 className="text-4xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              Laporan Terkirim!
            </h2>
            <p className="text-lg mb-8" style={{ color: 'var(--text-secondary)' }}>
              Terima kasih atas partisipasi Anda.
            </p>
          </div>
        </div>
        <ReportDownloadModal
          isOpen={success}
          onClose={() => {}}
          reportData={createdReport}
          onFinished={() => router.push('/auth/login')}
        />
      </>
    );
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6 bg-gray-50">
      <GuestNav />
      <div className="w-full max-w-5xl">
        <div className="mb-6 flex items-center justify-center gap-3">
          <Image src="/logo.png" alt="Gapura" width={140} height={48} />
        </div>
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8">
          <div className="text-center space-y-2 animate-fade-in-up px-4">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Buat Laporan Irregularity (Quick Access)</h1>
            <p className="text-base md:text-lg" style={{ color: 'var(--text-secondary)' }}>
              Langkah {step} dari 5
            </p>
          </div>

          <div className="px-4 mt-4">
            <div className="flex items-center gap-2 max-w-md mx-auto">
              {[1, 2, 3, 4, 5].map((s) => (
                <div key={s} className="flex-1 flex items-center">
                  <div className={`h-2 flex-1 rounded-full transition-all ${s <= step ? 'bg-emerald-500' : 'bg-slate-200'}`} />
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
            <WizardStep isActive={step === 1}>
              <div className="max-w-3xl mx-auto space-y-8">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold">Detail Report</h2>
                  <p style={{ color: 'var(--text-secondary)' }}>Lengkapi informasi dasar penerbangan</p>
                </div>

                <div className="card-solid p-6 md:p-8 space-y-6" style={{ background: 'var(--surface-2)' }}>
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
                      onChange={(e) => setFormData({ ...formData, incident_date: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="label">2. Airlines <span className="text-red-500">*</span></label>
                    <select
                      required
                      className="input-field"
                      value={formData.airline}
                      onChange={(e) => setFormData({ ...formData, airline: e.target.value })}
                    >
                      <option value="">Select Airline...</option>
                      {AIRLINES.map((airline) => (
                        <option key={airline.code} value={airline.name}>
                          {airline.name} ({airline.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="label">3. Flight Number <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      className="input-field uppercase"
                      placeholder="e.g. CZ-123"
                      value={formData.flight_number}
                      onChange={(e) => setFormData({ ...formData, flight_number: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="label">4. Branch (cth: CGK, UPG, DPS) <span className="text-red-500">*</span></label>
                    <select
                      required
                      className="input-field"
                      value={formData.station_id}
                      onChange={(e) => setFormData({ ...formData, station_id: e.target.value })}
                    >
                      <option value="">Select Branch...</option>
                      {stations.map((station) => (
                        <option key={station.id} value={station.id}>
                          {station.code}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="label">5. Route <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      className="input-field uppercase"
                      placeholder="e.g. NRT-CGK"
                      value={formData.route}
                      onChange={(e) => setFormData({ ...formData, route: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="label">Delay Code (Optional)</label>
                      <input
                        type="text"
                        className="input-field uppercase"
                        placeholder="e.g. 93"
                        value={formData.delay_code}
                        onChange={(e) => setFormData({ ...formData, delay_code: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="label">Delay Duration (Optional)</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="e.g. 15 mins"
                        value={formData.delay_duration}
                        onChange={(e) => setFormData({ ...formData, delay_duration: e.target.value })}
                      />
                    </div>
                  </div>

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
                            {formData.main_category === cat.id && <div className="w-3 h-3 rounded-full bg-emerald-500" />}
                          </div>
                          <span>{cat.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </WizardStep>

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
                            {formData.area === area.id && <div className="w-3 h-3 rounded-full bg-emerald-500" />}
                          </div>
                          <span>{area.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </WizardStep>

            <WizardStep isActive={step === 3}>
              <div className="max-w-3xl mx-auto space-y-8">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold">{AREA_OPTIONS.find((a) => a.id === formData.area)?.label}</h2>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    Specify the category for {AREA_OPTIONS.find((a) => a.id === formData.area)?.label}
                  </p>
                </div>

                <div className="card-solid p-6 md:p-8 space-y-6" style={{ background: 'var(--surface-2)' }}>
                  <div className="space-y-4">
                    <label className="label">
                      8. {AREA_OPTIONS.find((a) => a.id === formData.area)?.label} Category <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-col gap-3">
                      {AREA_CATEGORIES[formData.area]?.map((cat, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setFormData({ ...formData, area_category: cat })}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-black/5 transition-colors text-left"
                        >
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${formData.area_category === cat ? 'border-emerald-500' : 'border-gray-400'}`}>
                            {formData.area_category === cat && <div className="w-3 h-3 rounded-full bg-emerald-500" />}
                          </div>
                          <span>{cat}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </WizardStep>

            <WizardStep isActive={step === 4}>
              <div className="max-w-3xl mx-auto space-y-8">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold">Irregularity / Complaint</h2>
                  <p style={{ color: 'var(--text-secondary)' }}>Fill in the details</p>
                </div>

                <div className="card-solid p-6 md:p-8 space-y-6" style={{ background: 'var(--surface-2)' }}>
                  <div className="space-y-2">
                    <label className="label">9. Report <span className="text-red-500">*</span></label>
                    <textarea
                      required
                      className="input-field min-h-[100px] resize-y"
                      placeholder="Enter your answer"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="label">10. Root Cause <span className="text-red-500">*</span></label>
                    <textarea
                      required
                      className="input-field min-h-[100px] resize-y"
                      placeholder="Enter your answer"
                      value={formData.root_cause}
                      onChange={(e) => setFormData({ ...formData, root_cause: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="label">11. Action Taken <span className="text-red-500">*</span></label>
                    <textarea
                      required
                      className="input-field min-h-[100px] resize-y"
                      placeholder="Enter your answer"
                      value={formData.action_taken}
                      onChange={(e) => setFormData({ ...formData, action_taken: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="label flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Severity
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {(Object.entries(PRIORITY_CONFIG) as [ReportPriority, (typeof PRIORITY_CONFIG)[ReportPriority]][]).map(([key, config]) => {
                        const isSelected = formData.severity === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setFormData({ ...formData, severity: key })}
                            className={`p-3 rounded-xl border-2 transition-all text-center ${isSelected ? 'border-current' : 'border-transparent'}`}
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

            <WizardStep isActive={step === 5}>
              <div className="max-w-3xl mx-auto space-y-8">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold">Evidence</h2>
                  <p style={{ color: 'var(--text-secondary)' }}>Unggah foto bukti (akan dikompres otomatis sebelum disimpan)</p>
                </div>

                <div className="card-solid p-6 md:p-8 space-y-6" style={{ background: 'var(--surface-2)' }}>
                  <div className="space-y-2">
                    <label className="label">12. Report By <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      className="input-field"
                      placeholder="Nama pelapor"
                      value={formData.reporter_name}
                      onChange={(e) => setFormData({ ...formData, reporter_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="label">13. Email Pelapor <span className="text-red-500">*</span></label>
                    <input
                      type="email"
                      required
                      className="input-field"
                      placeholder="email@domain.com"
                      value={formData.reporter_email}
                      onChange={(e) => setFormData({ ...formData, reporter_email: e.target.value })}
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="label">14. Foto Evidence (min 1) <span className="text-red-500">*</span></label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="input-field"
                      onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                    />
                    <div className="flex">
                      <button
                        type="button"
                        onClick={handleFilesSelected}
                        className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors flex items-center gap-1.5"
                        disabled={selectedFiles.length === 0}
                      >
                        <Plus className="w-4 h-4" />
                        Upload Foto
                      </button>
                    </div>
                    {formData.evidence_urls.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {formData.evidence_urls.map((url, idx) => (
                          <div key={idx} className="relative rounded-xl overflow-hidden border bg-white">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt={`evidence-${idx}`} className="w-full h-32 object-cover" />
                            <button
                              type="button"
                              onClick={() => removeEvidenceAt(idx)}
                              className="absolute top-2 right-2 px-2 py-1 bg-white/90 rounded-lg text-xs font-semibold"
                            >
                              Hapus
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </WizardStep>

            <div className="max-w-3xl mx-auto mt-6 flex items-center justify-between px-2">
              <button
                type="button"
                onClick={prevStep}
                className="px-5 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 font-semibold"
                disabled={step === 1}
              >
                Kembali
              </button>
              {step < 5 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-5 py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 disabled:opacity-60"
                  disabled={!isStepValid()}
                >
                  Lanjut
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!isStepValid() || loading}
                  className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60"
                >
                  {loading ? 'Mengirim...' : 'Kirim Laporan'}
                </button>
              )}
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
