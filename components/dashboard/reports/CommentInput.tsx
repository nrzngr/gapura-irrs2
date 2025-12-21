'use client';

import { useState, useRef, useEffect } from 'react';
import { 
    Send, 
    Paperclip, 
    Image as ImageIcon, 
    X, 
    Loader2, 
    AlertCircle 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface CommentInputProps {
    reportId: string;
    onSuccess?: () => void;
    placeholder?: string;
}

export function CommentInput({ reportId, onSuccess, placeholder = "Ketik pesan..." }: CommentInputProps) {
    const [content, setContent] = useState('');
    const [isClarification, setIsClarification] = useState(false);
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
            
            // Parallel uploads
            await Promise.all(Array.from(files).map(async (file) => {
                if (file.size > 5 * 1024 * 1024) return; // Skip > 5MB

                const fileExt = file.name.split('.').pop();
                const fileName = `comment-${reportId}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('evidence')
                    .upload(fileName, file);

                if (uploadError) {
                    console.error('Upload error:', uploadError);
                    return;
                }

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
            const finalContent = isClarification 
                ? `KLARIFIKASI: ${content}` 
                : content;

            const res = await fetch(`/api/reports/${reportId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    content: finalContent,
                    attachments: attachments 
                })
            });

            if (res.ok) {
                setContent('');
                setAttachments([]);
                setIsClarification(false);
                if (onSuccess) onSuccess();
                // Reset height
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

    return (
        <div className="flex flex-col gap-3">
            {/* Attachment Previews */}
            {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 px-1">
                    {attachments.map((url, i) => (
                        <div key={i} className="relative group w-16 h-16 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                            <img src={url} alt="Preview" className="w-full h-full object-cover" />
                            <button
                                type="button"
                                onClick={() => removeAttachment(i)}
                                className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-red-500 text-white rounded-full transition-colors backdrop-blur-sm"
                            >
                                <X size={10} />
                            </button>
                        </div>
                    ))}
                    {uploading && (
                        <div className="w-16 h-16 rounded-xl border border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                            <Loader2 size={16} className="animate-spin text-gray-400" />
                        </div>
                    )}
                </div>
            )}

            {/* Input Bar */}
            <div className={cn(
                "relative flex items-end gap-2 bg-gray-50/50 border border-gray-200 rounded-[24px] p-2 transition-all focus-within:ring-2 focus-within:ring-[var(--brand-primary)]/20 focus-within:border-[var(--brand-primary)]/50 focus-within:bg-white",
                isClarification && "bg-amber-50/30 border-amber-200 focus-within:ring-amber-500/20 focus-within:border-amber-500/50 focus-within:bg-amber-50/10"
            )}>
                
                {/* Mode Toggle & Attach */}
                <div className="flex items-center pb-2 pl-2 gap-1">
                    <button
                        type="button"
                        onClick={() => setIsClarification(!isClarification)}
                        className={cn(
                            "p-2 rounded-full transition-colors",
                            isClarification 
                                ? "text-amber-600 bg-amber-100 hover:bg-amber-200" 
                                : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                        )}
                        title={isClarification ? "Matikan Mode Klarifikasi" : "Mode Klarifikasi"}
                    >
                        <AlertCircle size={20} />
                    </button>
                    
                    <label className={cn(
                        "p-2 rounded-full transition-colors cursor-pointer",
                        "text-gray-400 hover:text-gray-600 hover:bg-gray-100",
                        uploading && "opacity-50 pointer-events-none"
                    )}>
                        <input 
                            type="file" 
                            accept="image/*" 
                            multiple 
                            className="hidden" 
                            onChange={handleFileUpload} 
                            disabled={uploading}
                        />
                        <Paperclip size={20} />
                    </label>
                </div>

                {/* Text Area */}
                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isClarification ? "Ajukan pertanyaan klarifikasi..." : placeholder}
                    className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 placeholder:text-gray-400 min-h-[44px] max-h-[120px] py-3 resize-none"
                    rows={1}
                />

                {/* Send Button */}
                <button
                    onClick={() => handleSubmit()}
                    disabled={(!content.trim() && attachments.length === 0) || sending}
                    className={cn(
                        "p-3 rounded-full mb-1 transition-all duration-300 shadow-sm",
                        (!content.trim() && attachments.length === 0)
                            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                            : isClarification
                                ? "bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20"
                                : "bg-black text-white hover:bg-gray-800 shadow-gray-900/20"
                    )}
                >
                    {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} fill={(!content.trim() && attachments.length === 0) ? "none" : "currentColor"} />}
                </button>
            </div>
            
            {/* Helper Text */}
            <div className="px-4 flex justify-between items-center text-[10px] text-gray-400 font-medium select-none">
                <span>Enter untuk mengirim, Shift+Enter untuk baris baru</span>
                {isClarification && <span className="text-amber-600 font-bold fade-in">Mode Klarifikasi Aktif</span>}
            </div>
        </div>
    );
}
