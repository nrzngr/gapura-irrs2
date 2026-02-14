'use client';

import { useState, useRef, useEffect } from 'react';
import {
    Send,
    X,
    Loader2,
    Link,
    Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommentInputProps {
    reportId: string;
    onSuccess?: () => void;
    placeholder?: string;
    compact?: boolean;
}

export function CommentInput({
    reportId,
    onSuccess,
    placeholder = "Ketik pesan...",
}: CommentInputProps) {
    const [content, setContent] = useState('');
    const [sending, setSending] = useState(false);
    const [attachments, setAttachments] = useState<string[]>([]);
    const [linkInput, setLinkInput] = useState('');
    const [showLinkInput, setShowLinkInput] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [content]);

    const handleAddLink = () => {
        const link = linkInput.trim();
        if (!link) return;

        try {
            new URL(link);
        } catch {
            return;
        }

        setAttachments(prev => [...prev, link]);
        setLinkInput('');
        setShowLinkInput(false);
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if ((!content.trim() && attachments.length === 0) || sending) return;

        setSending(true);
        try {
            const res = await fetch(`/api/reports/${reportId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content,
                    attachments
                })
            });

            if (res.ok) {
                setContent('');
                setAttachments([]);
                if (onSuccess) onSuccess();
                if (textareaRef.current) textareaRef.current.style.height = 'auto';
            }
        } catch (err) {
            console.error('Failed to send comment', err);
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const canSubmit = content.trim() || attachments.length > 0;

    return (
        <div className="space-y-3">
            {/* Textarea */}
            <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] outline-none transition-all resize-none"
                rows={3}
            />

            {/* Attachments Preview */}
            {attachments.length > 0 && (
                <div className="space-y-1.5">
                    {attachments.map((url, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                            <Link size={12} className="text-blue-500 shrink-0" />
                            <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate flex-1">{url}</a>
                            <button
                                type="button"
                                onClick={() => removeAttachment(i)}
                                className="p-0.5 hover:bg-red-100 text-red-500 rounded transition-colors"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Link Input */}
            {showLinkInput && (
                <div className="flex gap-2">
                    <input
                        type="url"
                        value={linkInput}
                        onChange={(e) => setLinkInput(e.target.value)}
                        placeholder="https://drive.google.com/..."
                        className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] outline-none"
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddLink(); } }}
                        autoFocus
                    />
                    <button
                        type="button"
                        onClick={handleAddLink}
                        className="px-3 py-2 bg-[var(--brand-primary)] text-white rounded-lg text-xs font-semibold hover:brightness-110 transition-all"
                    >
                        <Plus size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={() => { setShowLinkInput(false); setLinkInput(''); }}
                        className="px-2 py-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2">
                {/* Add Link Button */}
                <button
                    type="button"
                    onClick={() => setShowLinkInput(true)}
                    className={cn(
                        "flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer transition-colors text-sm text-gray-600",
                        showLinkInput && "opacity-50 pointer-events-none"
                    )}
                >
                    <Link size={14} />
                    <span className="text-xs font-medium">Lampiran</span>
                </button>

                <div className="flex-1" />

                {/* Submit Button */}
                <button
                    onClick={() => handleSubmit()}
                    disabled={!canSubmit || sending}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                        canSubmit && !sending
                            ? "bg-[var(--brand-primary)] text-white hover:brightness-110 shadow-sm"
                            : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    )}
                >
                    {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    <span>Kirim</span>
                </button>
            </div>
        </div>
    );
}
