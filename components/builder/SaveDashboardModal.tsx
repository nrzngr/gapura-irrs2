'use client';

import { useState } from 'react';
import { X, Save, Link2, Check, Loader2 } from 'lucide-react';

interface SaveDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialName: string;
  initialDescription: string;
  onSave: (name: string, description: string) => Promise<{ embedUrl: string } | null>;
}

export function SaveDashboardModal({
  isOpen,
  onClose,
  initialName,
  initialDescription,
  onSave,
}: SaveDashboardModalProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [saving, setSaving] = useState(false);
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const result = await onSave(name, description);
    setSaving(false);
    if (result) {
      setSavedUrl(result.embedUrl);
    }
  };

  const handleCopy = () => {
    if (!savedUrl) return;
    const fullUrl = `${window.location.origin}${savedUrl}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--surface-1)] border border-[var(--surface-4)] rounded-2xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--surface-4)]">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Simpan Dashboard</h3>
          <button onClick={onClose} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {!savedUrl ? (
            <>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1 block">
                  Nama Dashboard
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Contoh: Weekly Performance"
                  className="w-full px-3 py-2 text-sm bg-[var(--surface-2)] border border-[var(--surface-4)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1 block">
                  Deskripsi (Opsional)
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Deskripsi singkat dashboard..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-[var(--surface-2)] border border-[var(--surface-4)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] resize-none"
                />
              </div>
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold bg-[var(--brand-primary)] text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                {saving ? 'Menyimpan...' : 'Simpan Dashboard'}
              </button>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check size={24} className="text-emerald-600" />
              </div>
              <p className="text-sm font-bold text-[var(--text-primary)] mb-1">Dashboard Tersimpan!</p>
              <p className="text-xs text-[var(--text-muted)] mb-4">Embed URL untuk PowerPoint:</p>
              <div className="flex items-center gap-2 p-2 bg-[var(--surface-2)] border border-[var(--surface-4)] rounded-lg">
                <Link2 size={14} className="text-[var(--text-muted)] shrink-0" />
                <span className="text-xs text-[var(--text-secondary)] truncate flex-1">{savedUrl}</span>
                <button
                  onClick={handleCopy}
                  className="px-2 py-1 text-[10px] font-bold bg-[var(--brand-primary)] text-white rounded-md hover:opacity-90"
                >
                  {copied ? 'Disalin!' : 'Salin'}
                </button>
              </div>
              <div className="flex gap-2 mt-4">
                <a
                  href={savedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-3 py-2 text-xs font-bold text-[var(--brand-primary)] border border-[var(--brand-primary)] rounded-lg text-center hover:bg-blue-50 transition-colors"
                >
                  Preview
                </a>
                <button
                  onClick={onClose}
                  className="flex-1 px-3 py-2 text-xs font-bold text-[var(--text-secondary)] border border-[var(--surface-4)] rounded-lg hover:bg-[var(--surface-2)] transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
