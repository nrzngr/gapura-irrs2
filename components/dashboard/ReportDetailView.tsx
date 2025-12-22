'use client';

import { useState, useEffect, useRef } from 'react';
import {
    MapPin, User, Calendar, Plane, Image as ImageIcon,
    Shield, CheckCircle2, Clock,
    Loader2, Wrench, X, Upload, MessageSquare, AlertCircle, XCircle,
    ChevronDown, Send, ArrowRight, Edit3, Save, Search
} from 'lucide-react';
import { STATUS_CONFIG, getAllowedTransitions, type ReportStatus, SEVERITY_CONFIG } from '@/lib/constants/report-status';
import { cn } from '@/lib/utils';
import { type Report } from '@/types';
import { CommentInput } from '@/components/dashboard/reports/CommentInput';
import { supabase } from '@/lib/supabase';
import { RotateCcw } from 'lucide-react';

// Fix Severity Colors (Semantic)
const UI_SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
    'urgent': { label: 'URGENT', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
    'high': { label: 'HIGH', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
    'medium': { label: 'MEDIUM', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
    'low': { label: 'LOW', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' }
};

interface ReportDetailViewProps {
    report: Report | null;
    onUpdateStatus?: (reportId: string, status: string, notes?: string, evidenceUrl?: string) => Promise<void>;
    onRefresh?: () => void;
    onClose?: () => void;
    isModal?: boolean;
    userRole?: string;
    divisionColor?: string;
    currentUserId?: string;
}

export function ReportDetailView({ 
    report, 
    onUpdateStatus, 
    onRefresh,
    isModal = false, 
    userRole = 'PARTNER_ADMIN',
    divisionColor = '#10b981',
    currentUserId
}: ReportDetailViewProps) {
    // User State
    const [user, setUser] = useState<{id: string; role: string} | null>(null);

    useEffect(() => {
        // Fetch current user session
        // Fetch current user session from our custom auth API
        const fetchUser = async () => {
            if (currentUserId) {
                 // If passed as prop, use it (though role might be needed too)
                 setUser({ id: currentUserId, role: 'unknown' });
            } else {
                 try {
                     const res = await fetch('/api/auth/session');
                     if (res.ok) {
                         const data = await res.json();
                         if (data.user) {
                             setUser(data.user);
                         }
                     }
                 } catch (e) {
                     console.error("Failed to fetch session", e);
                 }
            }
        };
        fetchUser();
    }, [currentUserId]);

    const [actionLoading, setActionLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showReturnForm, setShowReturnForm] = useState(false);
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [showCloseForm, setShowCloseForm] = useState(false);
    const [returnNotes, setReturnNotes] = useState('');
    const [rejectNotes, setRejectNotes] = useState('');
    const [closeNotes, setCloseNotes] = useState('');
    const [closeEvidenceUrl, setCloseEvidenceUrl] = useState('');
    const [closeEvidencePreview, setCloseEvidencePreview] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    // Editing State
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<{
        title: string;
        description: string;
        flight_number: string;
        aircraft_reg: string;
        location: string;
    }>({
        title: '',
        description: '',
        flight_number: '',
        aircraft_reg: '',
        location: ''
    });

    useEffect(() => {
        if (report) {
            setEditForm({
                title: report.title || '',
                description: report.description || '',
                flight_number: report.flight_number || '',
                aircraft_reg: report.aircraft_reg || '',
                location: report.location || ''
            });
        }
    }, [report]);

    // Realtime subscription for chat
    useEffect(() => {
        if (!report?.id) return;

        const channel = supabase
            .channel(`report-${report.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'report_comments',
                filter: `report_id=eq.${report.id}`
            }, () => {
                if (onRefresh) onRefresh();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [report?.id, onRefresh]);

    // Scroll to bottom on new comments
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [report?.comments]);

    const handleUpdateStatus = async (status: string, notes?: string, evidenceUrl?: string) => {
        if (!onUpdateStatus || !report) return;
        setActionLoading(true);
        try {
            await onUpdateStatus(report.id, status, notes, evidenceUrl);
            setShowReturnForm(false);
            setShowRejectForm(false);
            setShowCloseForm(false);
            setReturnNotes('');
            setRejectNotes('');
            setCloseNotes('');
            setCloseNotes('');
            setCloseEvidenceUrl('');
            setCloseEvidencePreview('');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCloseEvidenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setUploading(true);
        try {
            const fileName = `resolution-${report?.id}-${Date.now()}.${file.name.split('.').pop()}`;
            const { data, error } = await supabase.storage
                .from('evidence')
                .upload(fileName, file, { upsert: true });
            
            if (error) throw error;
            
            const { data: urlData } = supabase.storage.from('evidence').getPublicUrl(data.path);
            setCloseEvidenceUrl(urlData.publicUrl);
            setCloseEvidencePreview(URL.createObjectURL(file));
        } catch (err) {
            console.error('Upload error:', err);
            alert('Gagal upload foto evidence');
        } finally {
            setUploading(false);
        }
    };

    const handleSaveChanges = async () => {
        if (!report) return;
        setActionLoading(true);
        try {
            const res = await fetch(`/api/reports/${report.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm)
            });
            
            if (!res.ok) throw new Error("Failed to update");

            setIsEditing(false);
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error(error);
            alert("Gagal menyimpan perubahan");
        } finally {
            setActionLoading(false);
        }
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!report) return;
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        try {
            const uploadedUrls: string[] = [];
            
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                if (file.size > 10 * 1024 * 1024) continue;
                const fileExt = file.name.split('.').pop();
                const fileName = `${report.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

                const { error: uploadError } = await supabase.storage.from('evidence').upload(fileName, file);
                if (uploadError) continue;

                const { data: { publicUrl } } = supabase.storage.from('evidence').getPublicUrl(fileName);
                uploadedUrls.push(publicUrl);
            }

            if (uploadedUrls.length > 0) {
                const currentEvidence = report.evidence_urls || (report.evidence_url ? [report.evidence_url] : []) || [];
                const newEvidence = [...currentEvidence, ...uploadedUrls];

                await fetch(`/api/reports/${report.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ evidence_urls: newEvidence })
                });

                if (onRefresh) onRefresh();
            }
        } catch (error) {
            console.error('Failed to upload evidence:', error);
        } finally {
            setUploading(false);
        }
    };

    if (!report) return <div className="flex flex-col items-center justify-center h-full text-gray-400">Pilih laporan</div>;

    // Correct Configuration Logic
    const severityKey = report.severity || report.priority || 'medium';
    const severityUI = UI_SEVERITY_CONFIG[severityKey.toLowerCase()] || UI_SEVERITY_CONFIG.medium;
    
    // Normalize evidence
    const evidenceList = report.evidence_urls && report.evidence_urls.length > 0 
        ? report.evidence_urls : report.evidence_url ? [report.evidence_url] : [];

    // Next Logical Action Calculation (Linear Flow)
    const nextActions = getAllowedTransitions(report.status, userRole);
    const primaryAction = nextActions.length > 0 ? nextActions[0] : null; // Strictly take the first one for linear flow
    
    // Check if user is a division admin
    const isDivisionAdmin = ['OT_ADMIN', 'OP_ADMIN', 'UQ_ADMIN'].includes(userRole);
    
    // Determine labels for Primary Action
    let actionLabel = "Update Status";
    if (primaryAction === 'ACKNOWLEDGED') actionLabel = "Terima Tugas";
    else if (primaryAction === 'ON_PROGRESS') actionLabel = "Mulai Kerjakan";
    else if (primaryAction === 'WAITING_VALIDATION') actionLabel = "Selesai & Lapor";
    else if (primaryAction === 'CLOSED' && isDivisionAdmin && report.status === 'ON_PROGRESS') actionLabel = "Selesaikan & Tutup";
    else if (primaryAction === 'CLOSED') actionLabel = "Validasi & Tutup";

    const isProcessing = report.status === 'ON_PROGRESS';
    const isPartner = userRole === 'PARTNER_ADMIN';
    const canEdit = ['SUPER_ADMIN', 'OS_ADMIN', 'OSC_LEAD'].includes(userRole); // Allow edit for admins

    const hasEvidence = evidenceList.length > 0 || (report.partner_evidence_urls && report.partner_evidence_urls.length > 0);

    return (
        <div className={cn("bg-white h-full flex flex-col relative", !isModal && "rounded-2xl shadow-sm border border-gray-200 overflow-hidden")}>
            
            {/* 1. COMPACT MINIMAL HEADER */}
            <div className="bg-white border-b border-gray-100 p-4 shrink-0 flex flex-col gap-3 z-20 shadow-[0_4px_20px_-12px_rgba(0,0,0,0.1)]">
                <div className="flex justify-between items-start">
                    <div className="flex gap-3 items-center">
                        {/* Status Badge */}
                        <div className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest border",
                            (STATUS_CONFIG[report.status as ReportStatus]?.textClass || 'text-gray-600').replace('text-', 'bg-').replace('600', '50').replace('700', '50'),
                            STATUS_CONFIG[report.status as ReportStatus]?.textClass || 'text-gray-600',
                            "border-opacity-50"
                        )}>
                            {STATUS_CONFIG[report.status as ReportStatus]?.label || report.status}
                        </div>
                        {/* ID */}
                        <span className="font-mono text-xs text-gray-400 font-medium">#{report.id.slice(0, 8).toUpperCase()}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {/* Priority Badge */}
                        <div className={cn("px-2.5 py-0.5 rounded-md text-[10px] font-bold border uppercase flex items-center gap-1.5", severityUI.bg, severityUI.color, severityUI.border)}>
                            <AlertCircle size={10} strokeWidth={3} />
                            {severityUI.label}
                        </div>

                         {/* Edit Button */}
                         {canEdit && (
                            <button 
                                onClick={() => isEditing ? handleSaveChanges() : setIsEditing(true)}
                                className={cn(
                                    "p-1.5 rounded-lg transition-colors ml-2",
                                    isEditing ? "bg-blue-100 text-blue-600 hover:bg-blue-200" : "hover:bg-gray-100 text-gray-500"
                                )}
                                title={isEditing ? "Simpan" : "Edit Laporan"}
                            >
                                {isEditing ? <Save size={16} /> : <Edit3 size={16} />}
                            </button>
                         )}
                         {isEditing && (
                             <button 
                                onClick={() => setIsEditing(false)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                             >
                                 <X size={16} />
                             </button>
                         )}
                    </div>
                </div>
                
                <div className="flex justify-between items-end">
                    <div className="space-y-1 w-full">
                         {isEditing ? (
                             <input 
                                value={editForm.title}
                                onChange={(e) => setEditForm(prev => ({...prev, title: e.target.value}))}
                                className="w-full text-lg font-bold text-gray-900 leading-tight border-b border-gray-200 focus:border-blue-500 outline-none py-1 bg-transparent"
                             />
                         ) : (
                             <h1 className="text-lg font-bold text-gray-900 leading-tight">{report.title}</h1>
                         )}
                         
                         <div className="flex items-center gap-3 text-xs text-gray-500">
                             <span className="flex items-center gap-1">
                                 <MapPin size={12} className="text-gray-400"/> 
                                 {report.stations?.code || 'CGK'}
                                 {isEditing && (
                                     <input 
                                        value={editForm.location}
                                        onChange={(e) => setEditForm(prev => ({...prev, location: e.target.value}))}
                                        placeholder="Lokasi spesifik..."
                                        className="ml-2 w-32 border-b border-gray-200 focus:border-blue-500 outline-none bg-transparent"
                                     />
                                 )}
                                 {!isEditing && report.location && ` - ${report.location}`}
                             </span>
                             <span className="w-1 h-1 rounded-full bg-gray-300" />
                             <span className="flex items-center gap-1"><Clock size={12} className="text-gray-400"/> {new Date(report.created_at).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'})}</span>
                         </div>
                    </div>
                </div>
            </div>

            {/* 2. SCROLLABLE CONTENT - BENTO GRID REDESIGN */}
            <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6 space-y-6 scroll-smooth" ref={scrollRef}>
                
                {/* Info Grid - Bento Style */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* 1. Main Context: Description & Immediate Action (2 Columns) */}
                    <div className="md:col-span-2 space-y-4">
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative group">
                            <div className="flex justify-between items-start mb-3">
                                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <MessageSquare size={12} />
                                    Detail Masalah & Kronologis
                                </h3>
                                {canEdit && (
                                    <button 
                                        onClick={() => isEditing ? handleSaveChanges() : setIsEditing(true)}
                                        className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-[var(--brand-primary)] transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        {isEditing ? 'Simpan' : <Edit3 size={14} />}
                                    </button>
                                )}
                            </div>

                            {isEditing ? (
                                <textarea 
                                    value={editForm.description}
                                    onChange={(e) => setEditForm(prev => ({...prev, description: e.target.value}))}
                                    className="w-full text-base text-gray-800 leading-relaxed min-h-[120px] bg-gray-50 border border-transparent focus:border-blue-100 focus:bg-white rounded-xl p-3 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                />
                            ) : (
                                <p className="text-base text-gray-700 leading-relaxed whitespace-pre-wrap font-medium">
                                    {report.description}
                                </p>
                            )}
                        </div>

                        {/* Immediate Action if available */}
                        {report.immediate_action && (
                            <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100/50">
                                <h3 className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                    <CheckCircle2 size={12} />
                                    Tindakan Pencegahan Awal
                                </h3>
                                <p className="text-sm text-emerald-900 leading-relaxed">
                                    {report.immediate_action}
                                </p>
                            </div>
                        )}

                        {/* Investigation & Analysis (Root Cause, Action Taken, Notes) */}
                        {(report.root_cause || report.action_taken || report.investigator_notes || report.manager_notes) && (
                            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-gray-100 pb-2">
                                    <Search size={12} />
                                    Analisis & Tindakan Lanjut
                                </h3>
                                
                                {report.root_cause && (
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Akar Masalah (Root Cause)</p>
                                        <p className="text-sm text-gray-700 leading-relaxed">{report.root_cause}</p>
                                    </div>
                                )}

                                {report.action_taken && (
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Tindakan Perbaikan (Corrective Action)</p>
                                        <p className="text-sm text-gray-700 leading-relaxed">{report.action_taken}</p>
                                    </div>
                                )}

                                {report.investigator_notes && (
                                    <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">
                                        <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">Catatan Investigator</p>
                                        <p className="text-sm text-blue-900 leading-relaxed italic">"{report.investigator_notes}"</p>
                                    </div>
                                )}

                                {report.manager_notes && (
                                    <div className="bg-purple-50/50 p-3 rounded-xl border border-purple-100/50">
                                        <p className="text-[10px] font-bold text-purple-600 uppercase mb-1">Catatan Manager</p>
                                        <p className="text-sm text-purple-900 leading-relaxed italic">"{report.manager_notes}"</p>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {/* Reporter Info Card */}
                         <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
                                    {report.users?.full_name?.charAt(0) || <User size={18} />}
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-0.5">Pelapor</p>
                                    <p className="text-sm font-bold text-gray-900">{report.users?.full_name || 'Anonymous'}</p>
                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                        {report.users?.email} 
                                        {report.users?.nik && <span className="text-gray-300">•</span>}
                                        {report.users?.nik && <span>NIK: {report.users.nik}</span>}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wide">
                                    {report.users?.role || 'EMPLOYEE'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 2. Side Context: Metadata & Categorization (1 Column) */}
                    <div className="md:col-span-1 space-y-4">
                        
                        {/* Categorization Card */}
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                                <Shield size={12} />
                                Klasifikasi
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-[10px] uppercase text-gray-400 font-bold mb-1">Main Category</p>
                                    <p className="text-sm font-bold text-gray-900">{report.main_category || report.category || '-'}</p>
                                </div>
                                <div className="h-px bg-gray-50" />
                                <div>
                                    <p className="text-[10px] uppercase text-gray-400 font-bold mb-1">Sub Category</p>
                                    <p className="text-sm font-medium text-gray-700">{report.sub_category || '-'}</p>
                                </div>
                                <div className="h-px bg-gray-50" />
                                <div>
                                    <p className="text-[10px] uppercase text-gray-400 font-bold mb-1">Target Division</p>
                                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-100 text-gray-700 text-xs font-bold">
                                        {report.target_division || 'GENERAL'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Operational Context Card (Flight/GSE/Location) */}
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                                <Plane size={12} />
                                Konteks Operasional
                            </h3>
                            
                            <div className="space-y-3">
                                {/* Flight Info */}
                                <div className={cn("p-3 rounded-xl border transition-colors", (report.is_flight_related || report.flight_number || report.aircraft_reg) ? "bg-blue-50/50 border-blue-100" : "bg-gray-50/50 border-gray-100 opacity-60")}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Plane size={14} className={(report.is_flight_related || report.flight_number || report.aircraft_reg) ? "text-blue-500" : "text-gray-400"} />
                                        <span className={cn("text-xs font-bold", (report.is_flight_related || report.flight_number || report.aircraft_reg) ? "text-blue-700" : "text-gray-500")}>Flight Info</span>
                                    </div>
                                    <div className="flex justify-between items-center pl-6">
                                        <div>
                                            <p className="text-[10px] text-gray-400">Flight No</p>
                                            <p className="text-xs font-bold text-gray-900">{report.flight_number || '-'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-gray-400">Reg</p>
                                            <p className="text-xs font-bold text-gray-900">{report.aircraft_reg || '-'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* GSE Info */}
                                <div className={cn("p-3 rounded-xl border transition-colors", (report.is_gse_related || report.gse_number) ? "bg-amber-50/50 border-amber-100" : "bg-gray-50/50 border-gray-100 opacity-60")}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Wrench size={14} className={(report.is_gse_related || report.gse_number) ? "text-amber-500" : "text-gray-400"} />
                                        <span className={cn("text-xs font-bold", (report.is_gse_related || report.gse_number) ? "text-amber-700" : "text-gray-500")}>GSE Info</span>
                                    </div>
                                    <div className="pl-6">
                                        <p className="text-[10px] text-gray-400">GSE Number</p>
                                        <p className="text-xs font-bold text-gray-900">{report.gse_number || '-'}</p>
                                    </div>
                                </div>

                                {/* Detailed Location */}
                                <div className="p-3 rounded-xl border border-gray-100 bg-gray-50/50">
                                    <div className="flex items-center gap-2 mb-2">
                                        <MapPin size={14} className="text-gray-500" />
                                        <span className="text-xs font-bold text-gray-700">Lokasi Detail</span>
                                    </div>
                                    <p className="text-xs text-gray-600 pl-6 leading-relaxed">
                                        {report.specific_location || report.location || '-'}
                                        <br/>
                                        <span className="text-[10px] text-gray-400 mt-1 block">
                                            {report.incident_date || '-'} • {report.incident_time || '-'}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* 3. Partner Response & Validation Section (If available) */}
                {(report.partner_response_notes || report.validation_notes || (report.status === 'CLOSED' || report.status === 'REJECTED')) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Partner Response */}
                        <div className={cn("p-5 rounded-2xl border bg-white shadow-sm", report.partner_response_notes ? "border-purple-100" : "border-gray-100")}>
                             <h3 className="text-[10px] font-bold text-purple-600 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                <CheckCircle2 size={12} />
                                Tanggapan Divisi {report.target_division}
                            </h3>
                            <p className="text-sm text-gray-700 leading-relaxed italic">
                                "{report.partner_response_notes || 'Belum ada catatan tanggapan.'}"
                            </p>
                        </div>

                        {/* Validation Notes */}
                        <div className={cn("p-5 rounded-2xl border bg-white shadow-sm", report.validation_notes ? "border-blue-100" : "border-gray-100")}>
                             <h3 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                <Shield size={12} />
                                Catatan Validasi OS
                            </h3>
                            <p className="text-sm text-gray-700 leading-relaxed italic">
                                "{report.validation_notes || 'Belum ada catatan validasi.'}"
                            </p>
                        </div>
                    </div>
                )}

                {/* Evidence Gallery */}
                <div className="space-y-6">
                    
                    {/* 1. Reporter Evidence */}
                    <div>
                         <div className="flex justify-between items-end mb-3">
                            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                <ImageIcon size={12} />
                                Bukti Pelapor
                            </h3>
                        </div>
                        
                        {evidenceList.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {evidenceList.map((url, i) => (
                                    <div key={i} className="aspect-[4/3] rounded-xl overflow-hidden border border-gray-200 relative group bg-white shadow-sm hover:shadow-md transition-all cursor-zoom-in" onClick={() => window.open(url, '_blank')}>
                                        <img src={url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                        <span className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">Bukti #{i+1}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                             <div className={cn(
                                 "py-8 rounded-2xl border border-dashed flex flex-col items-center justify-center text-center transition-all border-gray-200 bg-white"
                             )}>
                                 <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mb-3 text-gray-300">
                                     <ImageIcon size={20} />
                                 </div>
                                 <p className="text-xs text-gray-500 font-medium">Belum ada bukti foto dari pelapor.</p>
                             </div>
                        )}
                    </div>

                    {/* 2. Partner Evidence (Resolution) */}
                    {(report.partner_evidence_urls && report.partner_evidence_urls.length > 0) || (isProcessing && isPartner) ? (
                        <div>
                             <div className="flex justify-between items-end mb-3">
                                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <CheckCircle2 size={12} className="text-emerald-500" />
                                    Bukti Penyelesaian (Partner)
                                </h3>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {report.partner_evidence_urls?.map((url, i) => (
                                    <div key={i} className="aspect-[4/3] rounded-xl overflow-hidden border-2 border-emerald-100 relative group bg-white shadow-sm hover:shadow-md transition-all cursor-zoom-in" onClick={() => window.open(url, '_blank')}>
                                        <img src={url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                        <span className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">Resolved</span>
                                    </div>
                                ))}

                                {/* Upload Placeholders for Partner when Processing */}
                                {isProcessing && isPartner && (
                                    <label className="aspect-[4/3] rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/5 transition-all cursor-pointer group">
                                        {uploading ? <Loader2 size={18} className="animate-spin text-[var(--brand-primary)]"/> : <Upload size={18} className="group-hover:scale-110 transition-transform" />}
                                        <span className="text-[9px] font-bold uppercase tracking-wide">Upload Bukti</span>
                                        <input type="file" multiple className="hidden" onChange={handleImageUpload} disabled={uploading}/>
                                    </label>
                                )}
                            </div>
                        </div>
                    ) : null}

                </div>

                {/* Discussion Timeline */}
                <div className="space-y-4 pb-4">
                    <div className="flex items-center justify-center relative my-6">
                        <div className="h-px bg-gray-200 w-full absolute" />
                        <span className="bg-gray-50 px-3 text-[10px] uppercase font-bold text-gray-400 relative z-10">Riwayat Diskusi</span>
                    </div>

                    {report.comments?.map((comment) => {
                        // Debug log for comparison
                        // console.log(`[Item Check] Comment User: ${comment.users?.id} vs Current Check: ${currentUserId || user?.id}`);
                        
                        const isMe = (currentUserId && comment.users?.id === currentUserId) || (user && comment.users?.id === user.id);
                        const isSystem = comment.is_system_message;
                        
                        if (isSystem) {
                           return (
                               <div key={comment.id} className="flex justify-center my-4">
                                   <div className="bg-gray-100/80 border border-gray-200/50 rounded-full px-3 py-1 text-[10px] font-medium text-gray-500 flex items-center gap-2">
                                       <Clock size={10} />
                                       {comment.content}
                                   </div>
                               </div>
                           );
                        }
                        
                        // Own message - right aligned with contrasting color
                        if (isMe) {
                            return (
                                <div key={comment.id} className="flex gap-3 justify-end">
                                    <div className="flex-1 max-w-[85%] space-y-1">
                                        <div className="flex items-baseline justify-end gap-2">
                                            <span className="text-[10px] text-gray-400">{new Date(comment.created_at).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</span>
                                            <span className="text-xs font-bold" style={{ color: divisionColor }}>Anda</span>
                                        </div>
                                        <div 
                                            className="p-3 rounded-2xl rounded-tr-none text-sm text-white shadow-sm leading-relaxed"
                                            style={{ background: divisionColor }}
                                        >
                                            {comment.content}
                                            {comment.attachments?.map((url, idx) => (
                                                <img key={idx} src={url} className="mt-2 rounded-lg max-h-40 border border-white/20" />
                                            ))}
                                        </div>
                                    </div>
                                    <div 
                                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 select-none"
                                        style={{ background: divisionColor }}
                                    >
                                        {comment.users?.full_name?.charAt(0)}
                                    </div>
                                </div>
                            );
                        }

                        // Other's message - left aligned
                        return (
                            <div key={comment.id} className="flex gap-3">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-300 flex items-center justify-center text-[10px] font-bold text-gray-600 shrink-0 select-none">
                                    {comment.users?.full_name?.charAt(0)}
                                </div>
                                <div className="flex-1 max-w-[85%] space-y-1">
                                    <div className="flex items-baseline justify-between">
                                        <span className="text-xs font-bold text-gray-900">{comment.users?.full_name}</span>
                                        <span className="text-[10px] text-gray-400">{new Date(comment.created_at).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</span>
                                    </div>
                                    <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-gray-100 text-sm text-gray-800 shadow-sm leading-relaxed">
                                        {comment.content}
                                        {comment.attachments?.map((url, idx) => (
                                            <img key={idx} src={url} className="mt-2 rounded-lg max-h-40 border border-gray-100" />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    
                     {/* Padding for sticky footer */}
                     <div className="h-32" />
                </div>
            </div>

            {/* 3. STICKY FOOTER (Chat Input + Action Island Combined) */}
            <div className="bg-white border-t border-gray-100 p-4 shrink-0 z-30 shadow-[0_-5px_20px_-10px_rgba(0,0,0,0.05)] relative">
                
                {/* Floating Action Island (Context Aware) */}
                {onUpdateStatus && report.status !== 'CLOSED' && primaryAction && !isEditing && (
                    <div className="absolute -top-16 left-0 right-0 px-4 flex justify-center pointer-events-none">
                         <div className="bg-gray-900/95 backdrop-blur-xl text-white pl-4 pr-1.5 py-1.5 rounded-full shadow-2xl flex items-center gap-4 pointer-events-auto ring-1 ring-white/20 animate-in slide-in-from-bottom-4 duration-300">
                             <div className="flex flex-col">
                                 <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">Status Selanjutnya</span>
                                 <span className="text-xs font-bold">{actionLabel}</span>
                             </div>

                             {isProcessing && isPartner && !hasEvidence ? (
                                 <button disabled className="px-5 py-2.5 bg-gray-800 text-gray-400 rounded-full text-xs font-bold flex items-center gap-2 cursor-not-allowed">
                                     <AlertCircle size={14} /> Upload Foto Dulu
                                 </button>
                             ) : (
                                <div className="flex bg-white/10 rounded-full p-0.5">
                                    <button 
                                        onClick={() => {
                                            // If next action is CLOSED, show close form with evidence upload
                                            if (primaryAction === 'CLOSED') {
                                                setShowCloseForm(true);
                                            } else {
                                                handleUpdateStatus(primaryAction);
                                            }
                                        }}
                                        disabled={actionLoading}
                                        className="h-9 px-5 bg-white text-black hover:bg-gray-200 active:scale-95 transition-all rounded-full text-xs font-bold flex items-center gap-2 shadow-sm"
                                    >
                                        {actionLoading ? <Loader2 size={14} className="animate-spin"/> : <CheckCircle2 size={16} />}
                                        {actionLabel}
                                    </button>
                                    {/* Secondary Actions (Like Return or Reject) */}
                                    {nextActions.includes('RETURNED') && (
                                        <button 
                                            onClick={() => setShowReturnForm(true)}
                                            className="h-9 w-9 flex items-center justify-center text-orange-400 hover:text-orange-300 transition-colors ml-1"
                                            title="Kembalikan (Perlu Revisi)"
                                        >
                                            <RotateCcw size={18} />
                                        </button>
                                    )}
                                    {nextActions.includes('REJECTED') && (
                                        <button 
                                            onClick={() => setShowRejectForm(true)}
                                            className="h-9 w-9 flex items-center justify-center text-red-500 hover:text-red-400 transition-colors ml-1"
                                            title="Tolak Laporan"
                                        >
                                            <XCircle size={18} />
                                        </button>
                                    )}
                                </div>
                             )}
                         </div>
                    </div>
                )}

                {/* Modern Chat Input */}
                <CommentInput reportId={report.id} onSuccess={onRefresh} />
            </div>

             {/* Return Form Modal Overlay */}
             {showReturnForm && (
                <div className="absolute inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 animate-scale-in border border-white/20">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900">Kembalikan Laporan</h3>
                            <button onClick={() => setShowReturnForm(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <textarea 
                             value={returnNotes}
                             onChange={(e) => setReturnNotes(e.target.value)}
                             className="w-full p-4 rounded-2xl border border-gray-200 text-sm focus:ring-2 focus:ring-red-500/20 outline-none bg-gray-50 mb-4 resize-none transition-all focus:bg-white"
                             rows={4}
                             placeholder="Alasan pengembalian..."
                             autoFocus
                         />
                         <div className="flex gap-3">
                            <button onClick={() => handleUpdateStatus('RETURNED', returnNotes)} className="w-full py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20 disabled:opacity-50 flex items-center justify-center gap-2">
                                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : "Konfirmasi Pengembalian"}
                            </button>
                         </div>
                    </div>
                </div>
            )}

             {/* Reject Form Modal Overlay */}
             {showRejectForm && (
                <div className="absolute inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 animate-scale-in border border-white/20">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900">Tolak Laporan</h3>
                            <button onClick={() => setShowRejectForm(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="bg-red-50 text-red-800 p-3 rounded-xl text-xs mb-4 flex items-center gap-2">
                            <AlertCircle size={16} />
                            Penolakan ini bersifat permanen.
                        </div>
                        <textarea 
                             value={rejectNotes}
                             onChange={(e) => setRejectNotes(e.target.value)}
                             className="w-full p-4 rounded-2xl border border-gray-200 text-sm focus:ring-2 focus:ring-red-500/20 outline-none bg-gray-50 mb-4 resize-none transition-all focus:bg-white"
                             rows={4}
                             placeholder="Alasan penolakan..."
                             autoFocus
                         />
                         <div className="flex gap-3">
                            <button onClick={() => handleUpdateStatus('REJECTED', rejectNotes)} className="w-full py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20 disabled:opacity-50 flex items-center justify-center gap-2">
                                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : "Tolak Permanen"}
                            </button>
                         </div>
                    </div>
                </div>
            )}

            {/* Close Form Modal with Evidence Upload */}
            {showCloseForm && (
                <div className="absolute inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 animate-scale-in border border-white/20">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900">Selesaikan Laporan</h3>
                            <button onClick={() => setShowCloseForm(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="mb-4 p-4 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50">
                            <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                <Upload size={16} className="text-emerald-600" />
                                Foto Bukti Penyelesaian <span className="text-red-500">*</span>
                            </p>
                            
                            {closeEvidencePreview ? (
                                <div className="relative">
                                    <img 
                                        src={closeEvidencePreview} 
                                        alt="Evidence preview" 
                                        className="w-full h-48 object-cover rounded-xl"
                                    />
                                    <button 
                                        onClick={() => {
                                            setCloseEvidenceUrl('');
                                            setCloseEvidencePreview('');
                                        }}
                                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center h-32 cursor-pointer hover:bg-gray-100 rounded-xl transition-colors">
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        onChange={handleCloseEvidenceUpload}
                                        className="hidden"
                                        disabled={uploading}
                                    />
                                    {uploading ? (
                                        <Loader2 size={24} className="animate-spin text-gray-400" />
                                    ) : (
                                        <>
                                            <Upload size={24} className="text-gray-400 mb-2" />
                                            <span className="text-sm text-gray-500">Klik untuk upload foto</span>
                                        </>
                                    )}
                                </label>
                            )}
                        </div>

                        <textarea 
                             value={closeNotes}
                             onChange={(e) => setCloseNotes(e.target.value)}
                             className="w-full p-4 rounded-2xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none bg-gray-50 mb-4 resize-none transition-all focus:bg-white"
                             rows={3}
                             placeholder="Catatan penyelesaian (opsional)..."
                         />
                         
                         <div className="flex gap-3">
                            <button 
                                onClick={() => setShowCloseForm(false)} 
                                className="flex-1 py-3 border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
                            >
                                Batal
                            </button>
                            <button 
                                onClick={() => handleUpdateStatus('CLOSED', closeNotes, closeEvidenceUrl)} 
                                disabled={!closeEvidenceUrl || actionLoading}
                                className="flex-1 py-3 text-white font-bold rounded-xl transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                style={{ background: closeEvidenceUrl ? divisionColor : '#9ca3af' }}
                            >
                                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                Selesaikan
                            </button>
                         </div>
                         
                         {!closeEvidenceUrl && (
                            <p className="text-xs text-red-500 text-center mt-3 flex items-center justify-center gap-1">
                                <AlertCircle size={12} />
                                Upload foto bukti penyelesaian wajib diisi
                            </p>
                         )}
                    </div>
                </div>
            )}
        </div>
    );
}
