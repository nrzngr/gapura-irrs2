"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  User,
  CheckCircle2,
  Loader2,
  X,
  AlertCircle,
  Edit3,
  Save,
  RotateCcw,
  FileText,
  ChevronLeft,
  ChevronRight,
  Plane,
  MapPin,
  Calendar,
  Clock,
  Building2,
  Tag,
  MessageSquare,
  Link,
  Plus,
  ExternalLink,
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

/* ============================================
   DESIGN TOKENS — PRISM v3 Compliant
   ============================================ */

const SEVERITY_BADGES: Record<string, { label: string; classes: string }> = {
  urgent: { label: "URGENT", classes: "bg-red-100 text-red-700 ring-red-200" },
  high: { label: "HIGH", classes: "bg-orange-100 text-orange-700 ring-orange-200" },
  medium: { label: "MEDIUM", classes: "bg-amber-100 text-amber-700 ring-amber-200" },
  low: { label: "LOW", classes: "bg-emerald-100 text-emerald-700 ring-emerald-200" },
};

const AREA_LABELS: Record<string, string> = {
  TERMINAL: "Terminal Area",
  APRON: "Apron Area",
  GENERAL: "General",
};

/* ============================================
   COMPONENT: DataField (Definition List Item)
   ============================================ */
function DataField({ 
  label, 
  value, 
  icon: Icon,
  span = 1 
}: { 
  label: string; 
  value: React.ReactNode; 
  icon?: React.ElementType;
  span?: 1 | 2;
}) {
  const isEmpty = !value || value === "" || value === "-" || value === "—";
  return (
    <div className={cn("group", span === 2 && "col-span-2")}>
      <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
        {Icon && <Icon size={12} strokeWidth={2} className="opacity-60" />}
        {label}
      </dt>
      <dd className={cn(
        "text-[15px] leading-snug",
        isEmpty ? "text-gray-300 italic" : "text-[var(--text-primary)] font-medium"
      )}>
        {isEmpty ? "Tidak ditentukan" : value}
      </dd>
    </div>
  );
}

/* ============================================
   COMPONENT: SectionCard
   ============================================ */
function SectionCard({ 
  title, 
  children, 
  className,
  headerAction
}: { 
  title?: string; 
  children: React.ReactNode; 
  className?: string;
  headerAction?: React.ReactNode;
}) {
  return (
    <section className={cn(
      "bg-[var(--surface-2)] rounded-2xl border border-gray-200/80 shadow-[var(--shadow-sm)]",
      "transition-shadow duration-200 hover:shadow-[var(--shadow-md)]",
      className
    )}>
      {title && (
        <header className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h3 className="text-[13px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">{title}</h3>
          {headerAction}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

/* ============================================
   PROPS INTERFACE
   ============================================ */
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

/* ============================================
   MAIN COMPONENT: ReportDetailView
   ============================================ */
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
  // State
  const [actionLoading, setActionLoading] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [closeNotes, setCloseNotes] = useState("");
  const [reopenNotes, setReopenNotes] = useState("");
  const [closeEvidenceUrl, setCloseEvidenceUrl] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", description: "", flight_number: "", aircraft_reg: "", location: "" });
  const [headerShadow, setHeaderShadow] = useState(false);
  const [newEvidenceLink, setNewEvidenceLink] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync edit form with report
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

  // Realtime subscription
  useEffect(() => {
    if (!report?.id) return;
    const channel = supabase
      .channel(`report-${report.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "report_comments", filter: `report_id=eq.${report.id}` }, () => onRefresh?.())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [report?.id, onRefresh]);

  // Scroll shadow detection
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setHeaderShadow(e.currentTarget.scrollTop > 8);
  }, []);

  // Handlers
  const handleUpdateStatus = async (status: string, notes?: string, evidenceUrl?: string) => {
    if (!onUpdateStatus || !report) return;
    setActionLoading(true);
    try {
      await onUpdateStatus(report.id, status, notes, evidenceUrl);
      setShowCloseModal(false);
      setShowReopenModal(false);
      setCloseNotes("");
      setReopenNotes("");
      setCloseEvidenceUrl("");
    } finally { setActionLoading(false); }
  };

  const handleAddEvidenceLink = async () => {
    if (!report || !newEvidenceLink.trim()) return;
    try {
      new URL(newEvidenceLink.trim());
    } catch {
      alert("Link tidak valid");
      return;
    }
    const currentEvidence = report.evidence_urls || (report.evidence_url ? [report.evidence_url] : []);
    const newEvidence = [...currentEvidence, newEvidenceLink.trim()];
    try {
      await fetch(`/api/reports/${report.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ evidence_urls: newEvidence }) });
      setNewEvidenceLink("");
      onRefresh?.();
    } catch (error) { console.error("Failed to add evidence link:", error); }
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


  // Empty State
  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] gap-3 p-8">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
          <FileText size={28} strokeWidth={1.5} />
        </div>
        <p className="text-sm">Pilih laporan untuk melihat detail</p>
      </div>
    );
  }

  // Derived values
  const severityKey = (report.severity || report.priority || "medium").toLowerCase();
  const severityBadge = SEVERITY_BADGES[severityKey] || SEVERITY_BADGES.medium;
  const statusConfig = STATUS_CONFIG[report.status as ReportStatus];
  const evidenceList = report.evidence_urls?.length ? report.evidence_urls : report.evidence_url ? [report.evidence_url] : [];
  const allEvidence = [...evidenceList, ...(report.partner_evidence_urls || [])];
  const nextActions = getAllowedTransitions(report.status, userRole);
  const primaryAction = nextActions[0] || null;
  const canEdit = ["SUPER_ADMIN", "DIVISI_OS", "ANALYST"].includes(userRole);
  const isClosed = report.status === "SELESAI";

  let actionLabel = "Update Status";
  if (primaryAction === "SUDAH_DIVERIFIKASI") actionLabel = "Verifikasi Laporan";
  else if (primaryAction === "SELESAI") actionLabel = "Selesaikan Kasus";
  else if (primaryAction === "MENUNGGU_FEEDBACK") actionLabel = "Buka Kembali";

  return (
    <div className="h-full flex flex-col bg-[var(--surface-1)] p-4 gap-4 overflow-hidden">
      {/* =============================================
          HEADER CARD
          ============================================= */}
      <header className="shrink-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Progress Indicator */}
        <div className="h-1 w-full bg-gradient-to-r from-[var(--brand-primary)] via-emerald-400 to-teal-500" />
        
        <div className="px-5 py-3 flex items-center gap-4">
          {/* Back Button */}
          {onClose && (
            <button 
              onClick={onClose} 
              className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
              aria-label="Kembali"
            >
              <ChevronLeft size={20} />
            </button>
          )}

          {/* Title */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                value={editForm.title}
                onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                className="w-full text-base font-semibold text-gray-900 border-b-2 border-[var(--brand-primary)] focus:outline-none bg-transparent"
                placeholder="Judul laporan..."
              />
            ) : (
              <h1 className="text-base font-semibold text-gray-900 truncate">
                {report.title || `${report.airline || ""} ${report.flight_number || ""}`.trim() || "Laporan"}
              </h1>
            )}
            <p className="text-xs text-gray-400 truncate">
              {report.main_category || report.category || "Irregularity"} • #{report.id.slice(0, 8).toUpperCase()}
            </p>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn(
              "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide",
              severityBadge.classes
            )}>
              {severityBadge.label}
            </span>
            <span className={cn(
              "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide",
              statusConfig?.bgClass || "bg-gray-100",
              statusConfig?.textClass || "text-gray-600"
            )}>
              {statusConfig?.label || report.status}
            </span>
          </div>

          {/* Edit Actions */}
          {canEdit && !isClosed && (
            <div className="flex items-center gap-1">
              <button 
                onClick={() => isEditing ? handleSaveChanges() : setIsEditing(true)} 
                className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                  isEditing 
                    ? "bg-[var(--brand-primary)] text-white" 
                    : "bg-gray-100 hover:bg-gray-200 text-gray-500"
                )}
                aria-label={isEditing ? "Simpan" : "Edit"}
              >
                {isEditing ? <Save size={16} /> : <Edit3 size={16} />}
              </button>
              {isEditing && (
                <button 
                  onClick={() => setIsEditing(false)} 
                  className="w-9 h-9 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors"
                  aria-label="Batal"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* =============================================
          MAIN CONTENT CARD
          ============================================= */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-0">
          
          {/* LEFT COLUMN — Report Detail (8 cols) */}
          <main 
            className="lg:col-span-8 overflow-y-auto scroll-smooth border-r border-gray-100" 
            ref={scrollRef}
            onScroll={handleScroll}
          >
            <div className="p-6 space-y-5">

              {/* REPORTER */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-sm">
                  {report.users?.full_name?.charAt(0) || report.reporter_name?.charAt(0) || <User size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">
                    {report.users?.full_name || report.reporter_name || "Anonymous"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {report.users?.email || "Pelapor"}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-[10px] font-bold text-gray-500 uppercase">
                  {report.users?.role?.replace("_ADMIN", "").replace("_", " ") || "EMPLOYEE"}
                </span>
              </div>

              {/* RINGKASAN — Summary Grid */}
              <SectionCard title="Ringkasan">
                <dl className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
                  <DataField label="Flight" value={`${report.flight_number || ""}${report.aircraft_reg ? ` (${report.aircraft_reg})` : ""}`} icon={Plane} />
                  <DataField label="Route" value={report.route} icon={MapPin} />
                  <DataField label="Airline" value={report.airline} icon={Building2} />
                  <DataField label="Area" value={AREA_LABELS[report.area || ""] || report.area} icon={Tag} />
                  <DataField label="Area Category" value={report.area_category || report.sub_category} />
                  <DataField label="Target Divisi" value={report.target_division} />
                  <DataField label="Station" value={`${report.stations?.code || report.branch || ""}${report.stations?.name ? ` - ${report.stations.name}` : ""}`} icon={Building2} />
                  <DataField label="Lokasi Detail" value={report.specific_location || report.location} icon={MapPin} />
                  <DataField label="Tanggal Kejadian" value={report.incident_date || report.event_date || new Date(report.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })} icon={Calendar} />
                </dl>
              </SectionCard>

              {/* DESKRIPSI MASALAH */}
              <SectionCard title="Deskripsi Masalah">
                {isEditing ? (
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                    className="w-full text-[15px] bg-gray-50 border border-gray-200 rounded-xl p-4 focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 outline-none resize-none transition-all"
                    rows={5}
                    placeholder="Deskripsikan masalah secara detail..."
                  />
                ) : (
                  <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                    {report.description || <span className="text-gray-300 italic">Tidak ada deskripsi</span>}
                  </p>
                )}
              </SectionCard>

              {/* AKAR MASALAH & TINDAKAN */}
              {(report.root_cause || report.action_taken || report.immediate_action) && (
                <SectionCard title="Analisis & Tindakan">
                  <div className="space-y-5">
                    {report.immediate_action && (
                      <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 mb-1">Tindakan Pencegahan</p>
                        <p className="text-[15px] text-emerald-800">{report.immediate_action}</p>
                      </div>
                    )}
                    {report.root_cause && (
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Akar Masalah</p>
                        <p className="text-[15px] text-[var(--text-secondary)]">{report.root_cause}</p>
                      </div>
                    )}
                    {report.action_taken && (
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Tindakan Perbaikan</p>
                        <p className="text-[15px] text-[var(--text-secondary)]">{report.action_taken}</p>
                      </div>
                    )}
                  </div>
                </SectionCard>
              )}

              {/* LAMPIRAN — Evidence Links */}
              <SectionCard title={`Lampiran (${allEvidence.length})`}>
                {allEvidence.length > 0 ? (
                  <div className="space-y-2">
                    {allEvidence.map((url, i) => {
                      const isPartnerEvidence = report.partner_evidence_urls?.includes(url);
                      return (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl border transition-colors hover:bg-gray-50",
                            isPartnerEvidence ? "border-emerald-200 bg-emerald-50/50" : "border-gray-200"
                          )}
                        >
                          <Link size={16} className={isPartnerEvidence ? "text-emerald-600 shrink-0" : "text-blue-500 shrink-0"} />
                          <span className="text-sm text-[var(--text-secondary)] truncate flex-1">{url}</span>
                          {isPartnerEvidence && (
                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-emerald-500 text-white rounded-md shrink-0">Partner</span>
                          )}
                          <ExternalLink size={14} className="text-gray-400 shrink-0" />
                        </a>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-300">
                    <Link size={32} strokeWidth={1.5} />
                    <p className="text-sm mt-3">Tidak ada lampiran</p>
                  </div>
                )}
                {/* Add new link */}
                {!isClosed && (
                  <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                    <input
                      type="url"
                      value={newEvidenceLink}
                      onChange={(e) => setNewEvidenceLink(e.target.value)}
                      placeholder="https://drive.google.com/..."
                      className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] outline-none"
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddEvidenceLink(); } }}
                    />
                    <button
                      onClick={handleAddEvidenceLink}
                      className="px-3 py-2 bg-[var(--brand-primary)] text-white rounded-lg text-xs font-semibold hover:brightness-110 transition-all flex items-center gap-1.5"
                    >
                      <Plus size={14} />
                      Tambah
                    </button>
                  </div>
                )}
              </SectionCard>
            </div>
          </main>

          {/* RIGHT COLUMN — Tindak Lanjut (4 cols) */}
          <aside className="lg:col-span-4 border-l border-gray-200 bg-gray-50/50 flex flex-col overflow-hidden">
            {/* Aside Header */}
            <header className="px-5 py-4 border-b border-gray-200 bg-white shrink-0">
              <h2 className="text-[15px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                <MessageSquare size={18} className="text-[var(--brand-primary)]" />
                Tindak Lanjut
              </h2>
              <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
                {report.comments?.length || 0} aktivitas tercatat
              </p>
            </header>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              
              {/* Quick Action Card */}
              {onUpdateStatus && primaryAction && !isEditing && (
                <div className="bg-gray-900 text-white p-5 rounded-2xl shadow-xl">
                  <p className="text-[10px] uppercase text-gray-400 tracking-wider mb-3">Status Selanjutnya</p>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold">{actionLabel}</span>
                    <button
                      onClick={() => {
                        if (primaryAction === "SELESAI") setShowCloseModal(true);
                        else if (primaryAction === "MENUNGGU_FEEDBACK") setShowReopenModal(true);
                        else handleUpdateStatus(primaryAction);
                      }}
                      disabled={actionLoading}
                      className="px-4 py-2.5 bg-white text-gray-900 rounded-xl text-[13px] font-bold flex items-center gap-2 hover:bg-gray-100 active:scale-95 transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white"
                    >
                      {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={16} />}
                      {actionLabel}
                    </button>
                  </div>
                </div>
              )}

              {/* Comment Input */}
              <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                <CommentInput reportId={report.id} onSuccess={onRefresh} placeholder="Tambahkan tindak lanjut..." />
              </div>

              {/* Activity Feed */}
              <div>
                <p className="text-[11px] uppercase text-[var(--text-muted)] tracking-wider font-semibold mb-4">Riwayat Aktivitas</p>
                {report.comments && report.comments.length > 0 ? (
                  <div className="space-y-3">
                    {report.comments.slice().reverse().map((comment) => {
                      if (comment.is_system_message) {
                        return (
                          <div key={comment.id} className="flex items-start gap-2.5 text-[12px] text-[var(--text-muted)] italic">
                            <div className="w-2 h-2 rounded-full bg-gray-300 mt-1.5 shrink-0" />
                            <div className="flex-1">
                              <span>{comment.content}</span>
                              <span className="ml-2 text-[11px] opacity-60">
                                {new Date(comment.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div key={comment.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                          <div className="flex items-center gap-2.5 mb-2.5">
                            <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-[11px] font-bold text-gray-500">
                              {comment.users?.full_name?.charAt(0) || "?"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-[13px] font-semibold text-[var(--text-primary)]">{comment.users?.full_name}</span>
                              <span className="text-[11px] text-[var(--text-muted)] ml-2">
                                {new Date(comment.created_at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          </div>
                          <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{comment.content}</p>
                          {comment.attachments && comment.attachments.length > 0 && (
                            <div className="space-y-1.5 mt-3">
                              {comment.attachments.map((url, idx) => (
                                <a
                                  key={idx}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-[12px] text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  <Link size={12} className="shrink-0" />
                                  <span className="truncate">{url}</span>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[13px] text-[var(--text-muted)] italic text-center py-8">Belum ada aktivitas</p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>


      {/* =============================================
          MODALS
          ============================================= */}
      {/* Reopen Modal */}
      {showReopenModal && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Buka Kembali Laporan</h3>
              <button onClick={() => setShowReopenModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X size={20} /></button>
            </div>
            <div className="bg-amber-50 text-amber-700 p-4 rounded-xl text-[13px] mb-5 flex items-center gap-3 border border-amber-100">
              <AlertCircle size={18} className="shrink-0" />
              <span>Kasus akan dibuka kembali dan status berubah ke Menunggu Feedback. Semua catatan dan komentar sebelumnya tetap tersimpan.</span>
            </div>
            <textarea
              value={reopenNotes}
              onChange={(e) => setReopenNotes(e.target.value)}
              className="w-full p-4 rounded-xl border border-gray-200 text-[15px] focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none bg-gray-50 mb-5 resize-none"
              rows={4}
              placeholder="Jelaskan alasan pembukaan kembali..."
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowReopenModal(false)}
                className="flex-1 py-3.5 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-[15px]"
              >
                Batal
              </button>
              <button
                onClick={() => handleUpdateStatus("MENUNGGU_FEEDBACK", reopenNotes)}
                disabled={actionLoading}
                className="flex-1 py-3.5 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 active:scale-[0.98] transition-all text-[15px] flex items-center justify-center gap-2"
              >
                {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <RotateCcw size={16} />}
                Buka Kembali
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-scale-in">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Selesaikan Laporan</h3>
              <button onClick={() => setShowCloseModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X size={20} /></button>
            </div>
            
            {/* Evidence Link Input */}
            <div className="mb-5 space-y-3">
              <p className="text-[14px] font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <Link size={16} className="text-emerald-600" />
                Link Bukti Penyelesaian
                <span className="text-red-500">*</span>
              </p>
              <input
                type="url"
                value={closeEvidenceUrl}
                onChange={(e) => setCloseEvidenceUrl(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="w-full p-4 rounded-xl border border-gray-200 text-[15px] focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 outline-none bg-gray-50"
              />
              {closeEvidenceUrl && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <Link size={14} className="text-emerald-600 shrink-0" />
                  <a href={closeEvidenceUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-700 hover:underline truncate flex-1">{closeEvidenceUrl}</a>
                  <button onClick={() => setCloseEvidenceUrl("")} className="p-1 hover:bg-red-100 text-red-500 rounded-lg"><X size={14} /></button>
                </div>
              )}
            </div>

            <textarea 
              value={closeNotes} 
              onChange={(e) => setCloseNotes(e.target.value)} 
              className="w-full p-4 rounded-xl border border-gray-200 text-[15px] outline-none bg-gray-50 mb-5 resize-none" 
              rows={3} 
              placeholder="Catatan penyelesaian (opsional)..." 
            />

            <div className="flex gap-3">
              <button 
                onClick={() => setShowCloseModal(false)} 
                className="flex-1 py-3.5 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-[15px]"
              >
                Batal
              </button>
              <button 
                onClick={() => handleUpdateStatus("SELESAI", closeNotes, closeEvidenceUrl)}
                disabled={!closeEvidenceUrl || actionLoading} 
                className="flex-1 py-3.5 text-white font-bold rounded-xl text-[15px] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
                style={{ background: closeEvidenceUrl ? divisionColor : "#9ca3af" }}
              >
                {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                Selesaikan
              </button>
            </div>
            {!closeEvidenceUrl && (
              <p className="text-[12px] text-red-500 text-center mt-4 flex items-center justify-center gap-1.5">
                <AlertCircle size={14} />Link bukti penyelesaian wajib diisi
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
