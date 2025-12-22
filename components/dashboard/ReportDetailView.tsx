"use client";

import { useState, useEffect, useRef } from "react";
import {
  MapPin,
  User,
  Plane,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  Loader2,
  Wrench,
  X,
  Upload,
  AlertCircle,
  XCircle,
  Edit3,
  Save,
  RotateCcw,
  FileText,
  ChevronLeft,
  Send,
} from "lucide-react";
import {
  STATUS_CONFIG,
  getAllowedTransitions,
  type ReportStatus,
} from "@/lib/constants/report-status";
import { cn } from "@/lib/utils";
import { type Report } from "@/types";
import { CommentInput } from "@/components/dashboard/reports/CommentInput";
import { supabase } from "@/lib/supabase";

// Severity UI Config
const UI_SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  urgent: { label: "URGENT", color: "text-red-600", bg: "bg-red-100" },
  high: { label: "HIGH", color: "text-orange-600", bg: "bg-orange-100" },
  medium: { label: "MEDIUM", color: "text-amber-600", bg: "bg-amber-100" },
  low: { label: "LOW", color: "text-emerald-600", bg: "bg-emerald-100" },
};

// Area ID to Label mapping
const AREA_LABELS: Record<string, string> = {
  TERMINAL: "Terminal Area",
  APRON: "Apron Area",
  GENERAL: "General",
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

// Compact Section Label
function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400 block mb-0.5">{children}</span>;
}

// Value Display
function Value({ children, empty = "Tidak ditentukan" }: { children: React.ReactNode; empty?: string }) {
  const isEmpty = !children || children === "" || children === "-" || children === "—";
  return <span className={cn("text-sm", isEmpty ? "text-gray-300 italic" : "font-medium text-gray-900")}>{isEmpty ? empty : children}</span>;
}

export function ReportDetailView({
  report,
  onUpdateStatus,
  onRefresh,
  onClose,
  isModal = false,
  userRole = "PARTNER_ADMIN",
  divisionColor = "#10b981",
  currentUserId,
}: ReportDetailViewProps) {
  const [actionLoading, setActionLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [returnNotes, setReturnNotes] = useState("");
  const [rejectNotes, setRejectNotes] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [closeEvidenceUrl, setCloseEvidenceUrl] = useState("");
  const [closeEvidencePreview, setCloseEvidencePreview] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", description: "", flight_number: "", aircraft_reg: "", location: "" });
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (report) {
      setEditForm({
        title: report.title || "",
        description: report.description || "",
        flight_number: report.flight_number || "",
        aircraft_reg: report.aircraft_reg || "",
        location: report.location || "",
      });
    }
  }, [report]);

  useEffect(() => {
    if (!report?.id) return;
    const channel = supabase
      .channel(`report-${report.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "report_comments", filter: `report_id=eq.${report.id}` }, () => onRefresh?.())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [report?.id, onRefresh]);

  const handleUpdateStatus = async (status: string, notes?: string, evidenceUrl?: string) => {
    if (!onUpdateStatus || !report) return;
    setActionLoading(true);
    try {
      await onUpdateStatus(report.id, status, notes, evidenceUrl);
      setShowReturnForm(false);
      setShowRejectForm(false);
      setShowCloseForm(false);
      setReturnNotes("");
      setRejectNotes("");
      setCloseNotes("");
      setCloseEvidenceUrl("");
      setCloseEvidencePreview("");
    } finally { setActionLoading(false); }
  };

  const handleCloseEvidenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileName = `resolution-${report?.id}-${Date.now()}.${file.name.split(".").pop()}`;
      const { data, error } = await supabase.storage.from("evidence").upload(fileName, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("evidence").getPublicUrl(data.path);
      setCloseEvidenceUrl(urlData.publicUrl);
      setCloseEvidencePreview(URL.createObjectURL(file));
    } catch (err) {
      console.error("Upload error:", err);
      alert("Gagal upload foto evidence");
    } finally { setUploading(false); }
  };

  const handleSaveChanges = async () => {
    if (!report) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/reports/${report.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm) });
      if (!res.ok) throw new Error("Failed to update");
      setIsEditing(false);
      onRefresh?.();
    } catch (error) {
      console.error(error);
      alert("Gagal menyimpan perubahan");
    } finally { setActionLoading(false); }
  };

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
        const fileExt = file.name.split(".").pop();
        const fileName = `${report.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from("evidence").upload(fileName, file);
        if (uploadError) continue;
        const { data: { publicUrl } } = supabase.storage.from("evidence").getPublicUrl(fileName);
        uploadedUrls.push(publicUrl);
      }
      if (uploadedUrls.length > 0) {
        const currentEvidence = report.evidence_urls || (report.evidence_url ? [report.evidence_url] : []) || [];
        const newEvidence = [...currentEvidence, ...uploadedUrls];
        await fetch(`/api/reports/${report.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ evidence_urls: newEvidence }) });
        onRefresh?.();
      }
    } catch (error) { console.error("Failed to upload evidence:", error); }
    finally { setUploading(false); }
  };

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
        <FileText size={32} strokeWidth={1} className="opacity-30" />
        <p className="text-xs">Pilih laporan untuk melihat detail</p>
      </div>
    );
  }

  // Derived values
  const severityKey = report.severity || report.priority || "medium";
  const severityUI = UI_SEVERITY_CONFIG[severityKey.toLowerCase()] || UI_SEVERITY_CONFIG.medium;
  const evidenceList = report.evidence_urls?.length ? report.evidence_urls : report.evidence_url ? [report.evidence_url] : [];
  const allEvidence = [...evidenceList, ...(report.partner_evidence_urls || [])];
  const nextActions = getAllowedTransitions(report.status, userRole);
  const primaryAction = nextActions[0] || null;
  const canEdit = ["SUPER_ADMIN", "OS_ADMIN", "OSC_LEAD"].includes(userRole);
  const isProcessing = report.status === "ON_PROGRESS";
  const isPartner = userRole === "PARTNER_ADMIN";
  const hasEvidence = allEvidence.length > 0;

  let actionLabel = "Update Status";
  if (primaryAction === "ACKNOWLEDGED") actionLabel = "Terima Tugas";
  else if (primaryAction === "ON_PROGRESS") actionLabel = "Mulai Kerjakan";
  else if (primaryAction === "WAITING_VALIDATION") actionLabel = "Selesai & Lapor";
  else if (primaryAction === "CLOSED") actionLabel = "Validasi & Tutup";

  return (
    <div className="h-full flex flex-col bg-gray-50/50 relative">
      {/* =============================================
          HEADER BAR — Breadcrumb + Actions
          ============================================= */}
      <header className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center gap-3 shrink-0 shadow-sm z-10">
        {onClose && (
          <button onClick={onClose} className="p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <ChevronLeft size={18} />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Semua Laporan &gt; Detail</p>
          <h1 className="text-base font-bold text-gray-900 truncate leading-tight">#{report.id.slice(0, 8).toUpperCase()}</h1>
        </div>
        {/* Status Badges — Right aligned */}
        <div className="flex items-center gap-2">
          <div className={cn("px-2 py-1 rounded-md text-[10px] font-bold uppercase", severityUI.bg, severityUI.color)}>
            {severityUI.label}
          </div>
          <div className={cn(
            "px-2 py-1 rounded-md text-[10px] font-bold uppercase",
            (STATUS_CONFIG[report.status as ReportStatus]?.textClass || "text-gray-600").replace("text-", "bg-").replace("600", "100").replace("700", "100"),
            STATUS_CONFIG[report.status as ReportStatus]?.textClass || "text-gray-600",
          )}>
            {STATUS_CONFIG[report.status as ReportStatus]?.label || report.status}
          </div>
          {canEdit && (
            <button onClick={() => isEditing ? handleSaveChanges() : setIsEditing(true)} className={cn("p-1.5 rounded-lg transition-colors", isEditing ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100 text-gray-400")}>
              {isEditing ? <Save size={16} /> : <Edit3 size={16} />}
            </button>
          )}
          {isEditing && <button onClick={() => setIsEditing(false)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400"><X size={16} /></button>}
        </div>
      </header>

      {/* =============================================
          MAIN CONTENT — 70:30 Split Layout
          ============================================= */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN — Main Content (70%) */}
        <div className="flex-1 overflow-y-auto" ref={scrollRef}>
          <div className="p-5 space-y-5">

            {/* HEADER CARD */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              {/* Title Row */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <input
                      value={editForm.title}
                      onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                      className="w-full text-xl font-bold text-gray-900 border-b-2 border-blue-500 focus:outline-none bg-transparent pb-1"
                    />
                  ) : (
                    <h2 className="text-xl font-bold text-gray-900 leading-tight">{report.title}</h2>
                  )}
                  <p className="text-sm text-gray-500 mt-1">{report.airline || ""} {report.airline && "•"} {report.main_category || report.category || "Irregularity"}</p>
                </div>
              </div>

              {/* Reporter Compact */}
              <div className="flex items-center gap-3 py-3 px-4 bg-gray-50 rounded-lg mb-4">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm">
                  {report.users?.full_name?.charAt(0) || report.reporter_name?.charAt(0) || <User size={14} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{report.users?.full_name || report.reporter_name || "Anonymous"}</p>
                  <p className="text-xs text-gray-500">{report.users?.email || "Pelapor"}</p>
                </div>
                <span className="px-2 py-1 rounded-md bg-gray-200 text-[10px] font-bold text-gray-600 uppercase">
                  {report.users?.role?.replace("_ADMIN", "").replace("_", " ") || "EMPLOYEE"}
                </span>
              </div>

              {/* Info Grid — 3 Columns, Compact */}
              <div className="grid grid-cols-3 gap-4 pb-4 border-b border-gray-100">
                <div>
                  <Label>Flight</Label>
                  <Value>{report.flight_number}{report.aircraft_reg && ` (${report.aircraft_reg})`}</Value>
                </div>
                <div>
                  <Label>Route</Label>
                  <Value>{report.route}</Value>
                </div>
                <div>
                  <Label>Airline</Label>
                  <Value>{report.airline}</Value>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 py-4 border-b border-gray-100">
                <div>
                  <Label>Area</Label>
                  <Value>{AREA_LABELS[report.area || ""] || report.area}</Value>
                </div>
                <div>
                  <Label>Area Category</Label>
                  <Value>{report.area_category || report.sub_category}</Value>
                </div>
                <div>
                  <Label>Target Divisi</Label>
                  <Value>{report.target_division}</Value>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4">
                <div>
                  <Label>Station</Label>
                  <Value>{report.stations?.code || report.branch}{report.stations?.name && ` - ${report.stations.name}`}</Value>
                </div>
                <div>
                  <Label>Lokasi Detail</Label>
                  <Value>{report.specific_location || report.location}</Value>
                </div>
                <div>
                  <Label>Tanggal Kejadian</Label>
                  <Value>{report.incident_date || report.event_date || new Date(report.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</Value>
                </div>
              </div>
            </div>

            {/* DESCRIPTION CARD */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <Label>Deskripsi Masalah</Label>
              {isEditing ? (
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full mt-2 text-sm bg-gray-50 border border-gray-200 rounded-lg p-3 focus:border-blue-300 outline-none resize-none"
                  rows={4}
                />
              ) : (
                <p className="mt-2 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{report.description || <span className="text-gray-300 italic">Tidak ada deskripsi</span>}</p>
              )}
            </div>

            {/* ROOT CAUSE & ACTION */}
            {(report.root_cause || report.action_taken || report.immediate_action) && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
                {report.immediate_action && (
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                    <Label>Tindakan Pencegahan</Label>
                    <p className="text-sm text-emerald-800 mt-1">{report.immediate_action}</p>
                  </div>
                )}
                {report.root_cause && (
                  <div>
                    <Label>Akar Masalah</Label>
                    <p className="text-sm text-gray-700 mt-1">{report.root_cause}</p>
                  </div>
                )}
                {report.action_taken && (
                  <div>
                    <Label>Tindakan Perbaikan</Label>
                    <p className="text-sm text-gray-700 mt-1">{report.action_taken}</p>
                  </div>
                )}
              </div>
            )}

            {/* EVIDENCE GALLERY — Thumbnail Grid */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <Label>Bukti Foto ({allEvidence.length})</Label>
                {isProcessing && isPartner && (
                  <label className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer text-xs font-medium text-gray-600 transition-colors">
                    {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                    <span>Upload</span>
                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                  </label>
                )}
              </div>

              {allEvidence.length > 0 ? (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                  {allEvidence.map((url, i) => {
                    const isPartnerEvidence = report.partner_evidence_urls?.includes(url);
                    return (
                      <div
                        key={i}
                        onClick={() => setLightboxUrl(url)}
                        className={cn(
                          "aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer hover:ring-2 hover:ring-offset-1 transition-all relative group",
                          isPartnerEvidence ? "ring-2 ring-emerald-400" : "hover:ring-blue-400"
                        )}
                      >
                        <img src={url} alt={`Evidence ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        {isPartnerEvidence && (
                          <span className="absolute bottom-1 right-1 bg-emerald-500 text-white text-[8px] font-bold px-1 rounded">✓</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-gray-300">
                  <ImageIcon size={24} strokeWidth={1} />
                  <p className="text-xs mt-2">Tidak ada bukti foto</p>
                </div>
              )}
            </div>

            {/* Spacer for scroll */}
            <div className="h-4" />
          </div>
        </div>

        {/* RIGHT COLUMN — Action Sidebar (30%), Sticky */}
        <div className="w-[320px] min-w-[280px] border-l border-gray-200 bg-white flex flex-col shrink-0">
          {/* Tab Header */}
          <div className="px-4 py-3 border-b border-gray-100 shrink-0">
            <h3 className="text-sm font-bold text-gray-900">Tindak Lanjut</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">{report.comments?.length || 0} aktivitas tercatat</p>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Quick Action Card */}
            {onUpdateStatus && report.status !== "CLOSED" && report.status !== "REJECTED" && primaryAction && !isEditing && (
              <div className="bg-gray-900 text-white p-4 rounded-xl shadow-lg">
                <p className="text-[10px] uppercase text-gray-400 mb-2 tracking-wide">Status Selanjutnya</p>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{actionLabel}</span>
                  {isProcessing && isPartner && !hasEvidence ? (
                    <span className="text-[10px] text-gray-400 flex items-center gap-1"><AlertCircle size={10} />Upload bukti dulu</span>
                  ) : (
                    <button
                      onClick={() => primaryAction === "CLOSED" ? setShowCloseForm(true) : handleUpdateStatus(primaryAction)}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-white text-gray-900 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-gray-100 transition-colors shadow-sm"
                    >
                      {actionLoading ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      {actionLabel}
                    </button>
                  )}
                </div>
                {/* Secondary Actions */}
                {(nextActions.includes("RETURNED") || nextActions.includes("REJECTED")) && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-700">
                    {nextActions.includes("RETURNED") && (
                      <button onClick={() => setShowReturnForm(true)} className="flex-1 py-2 text-xs font-medium text-orange-400 hover:bg-white/10 rounded-lg flex items-center justify-center gap-1 transition-colors">
                        <RotateCcw size={12} /> Kembalikan
                      </button>
                    )}
                    {nextActions.includes("REJECTED") && (
                      <button onClick={() => setShowRejectForm(true)} className="flex-1 py-2 text-xs font-medium text-red-400 hover:bg-white/10 rounded-lg flex items-center justify-center gap-1 transition-colors">
                        <XCircle size={12} /> Tolak
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Comment Input Card */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-[10px] uppercase text-gray-400 mb-3 tracking-wide font-medium">Tambah Tindak Lanjut</p>
              <CommentInput reportId={report.id} onSuccess={onRefresh} />
            </div>

            {/* Activity Log */}
            <div>
              <p className="text-[10px] uppercase text-gray-400 mb-3 tracking-wide font-medium">Riwayat Aktivitas</p>
              {report.comments && report.comments.length > 0 ? (
                <div className="space-y-3">
                  {report.comments.slice().reverse().map((comment) => {
                    if (comment.is_system_message) {
                      return (
                        <div key={comment.id} className="flex items-start gap-2 text-[11px] text-gray-400 italic">
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 shrink-0" />
                          <div>
                            <span>{comment.content}</span>
                            <span className="ml-2 text-[10px] text-gray-300">{new Date(comment.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={comment.id} className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 shrink-0">
                            {comment.users?.full_name?.charAt(0) || "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-semibold text-gray-900">{comment.users?.full_name}</span>
                            <span className="text-[10px] text-gray-400 ml-2">{new Date(comment.created_at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed">{comment.content}</p>
                        {comment.attachments && comment.attachments.length > 0 && (
                          <div className="flex gap-1.5 mt-2">
                            {comment.attachments.slice(0, 3).map((url, idx) => (
                              <div key={idx} className="w-12 h-12 rounded overflow-hidden border border-gray-200 cursor-pointer" onClick={() => setLightboxUrl(url)}>
                                <img src={url} alt="" className="w-full h-full object-cover" />
                              </div>
                            ))}
                            {comment.attachments.length > 3 && (
                              <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center text-[10px] text-gray-500 font-medium">+{comment.attachments.length - 3}</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic text-center py-6">Belum ada aktivitas</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =============================================
          LIGHTBOX
          ============================================= */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
          <button className="absolute top-4 right-4 p-2 text-white/80 hover:text-white"><X size={24} /></button>
          <img src={lightboxUrl} alt="Evidence" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
        </div>
      )}

      {/* =============================================
          MODALS
          ============================================= */}
      {showReturnForm && (
        <div className="absolute inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-900">Kembalikan Laporan</h3>
              <button onClick={() => setShowReturnForm(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <textarea value={returnNotes} onChange={(e) => setReturnNotes(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-orange-500/20 outline-none bg-gray-50 mb-4 resize-none" rows={3} placeholder="Alasan pengembalian..." autoFocus />
            <button onClick={() => handleUpdateStatus("RETURNED", returnNotes)} disabled={actionLoading} className="w-full py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-colors text-sm flex items-center justify-center gap-2">
              {actionLoading ? <Loader2 size={14} className="animate-spin" /> : "Konfirmasi Pengembalian"}
            </button>
          </div>
        </div>
      )}

      {showRejectForm && (
        <div className="absolute inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-900">Tolak Laporan</h3>
              <button onClick={() => setShowRejectForm(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs mb-4 flex items-center gap-2"><AlertCircle size={14} />Penolakan ini bersifat permanen.</div>
            <textarea value={rejectNotes} onChange={(e) => setRejectNotes(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-red-500/20 outline-none bg-gray-50 mb-4 resize-none" rows={3} placeholder="Alasan penolakan..." autoFocus />
            <button onClick={() => handleUpdateStatus("REJECTED", rejectNotes)} disabled={actionLoading} className="w-full py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors text-sm flex items-center justify-center gap-2">
              {actionLoading ? <Loader2 size={14} className="animate-spin" /> : "Tolak Permanen"}
            </button>
          </div>
        </div>
      )}

      {showCloseForm && (
        <div className="absolute inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-900">Selesaikan Laporan</h3>
              <button onClick={() => setShowCloseForm(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="mb-4 p-4 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50">
              <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2"><Upload size={14} className="text-emerald-600" />Foto Bukti Penyelesaian <span className="text-red-500">*</span></p>
              {closeEvidencePreview ? (
                <div className="relative">
                  <img src={closeEvidencePreview} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
                  <button onClick={() => { setCloseEvidenceUrl(""); setCloseEvidencePreview(""); }} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"><X size={12} /></button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-24 cursor-pointer hover:bg-gray-100 rounded-lg transition-colors">
                  <input type="file" accept="image/*" onChange={handleCloseEvidenceUpload} className="hidden" disabled={uploading} />
                  {uploading ? <Loader2 size={20} className="animate-spin text-gray-400" /> : <><Upload size={20} className="text-gray-400 mb-1" /><span className="text-xs text-gray-500">Klik untuk upload</span></>}
                </label>
              )}
            </div>
            <textarea value={closeNotes} onChange={(e) => setCloseNotes(e.target.value)} className="w-full p-3 rounded-xl border border-gray-200 text-sm outline-none bg-gray-50 mb-4 resize-none" rows={2} placeholder="Catatan penyelesaian (opsional)..." />
            <div className="flex gap-3">
              <button onClick={() => setShowCloseForm(false)} className="flex-1 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm">Batal</button>
              <button onClick={() => handleUpdateStatus("CLOSED", closeNotes, closeEvidenceUrl)} disabled={!closeEvidenceUrl || actionLoading} className="flex-1 py-3 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors" style={{ background: closeEvidenceUrl ? divisionColor : "#9ca3af" }}>
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}Selesaikan
              </button>
            </div>
            {!closeEvidenceUrl && <p className="text-xs text-red-500 text-center mt-3 flex items-center justify-center gap-1"><AlertCircle size={12} />Upload foto bukti wajib diisi</p>}
          </div>
        </div>
      )}
    </div>
  );
}
