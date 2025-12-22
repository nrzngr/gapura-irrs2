'use client';

import { useState, useRef, useEffect } from 'react';
import { 
    Send, 
    Paperclip, 
    X, 
    Loader2, 
    Plus 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

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
    compact = false 
}: CommentInputProps) {
    const [content, setContent] = useState('');
    const [sending, setSending] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [attachments, setAttachments] = useState<string[]>([]);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [content]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        try {
            const uploadedUrls: string[] = [];
            
            await Promise.all(Array.from(files).map(async (file) => {
                if (file.size > 5 * 1024 * 1024) return;

                const fileExt = file.name.split('.').pop();
                const fileName = `comment-${reportId}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('evidence')
                    .upload(fileName, file);

                if (uploadError) return;

                const { data: { publicUrl } } = supabase.storage
                    .from('evidence')
                    .getPublicUrl(fileName);

                uploadedUrls.push(publicUrl);
            }));

            setAttachments(prev => [...prev, ...uploadedUrls]);
        } catch (error) {
            console.error('Failed to upload attachment:', error);
        } finally {
            setUploading(false);
        }
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
                <div className="flex gap-2 flex-wrap">
                    {attachments.map((url, i) => (
                        <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                            <img src={url} alt="Preview" className="w-full h-full object-cover" />
                            <button
                                type="button"
                                onClick={() => removeAttachment(i)}
                                className="absolute top-0.5 right-0.5 p-1 bg-black/60 hover:bg-red-500 text-white rounded-full transition-colors"
                            >
                                <X size={10} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2">
                {/* Upload Button */}
                <label className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer transition-colors text-sm text-gray-600",
                    uploading && "opacity-50 pointer-events-none"
                )}>
                    {uploading ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
                    <span className="text-xs font-medium">Lampiran</span>
                    <input 
                        type="file" 
                        accept="image/*" 
                        multiple 
                        className="hidden" 
                        onChange={handleFileUpload} 
                        disabled={uploading}
                    />
                </label>

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
