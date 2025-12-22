'use client';

import { useState, useRef, useEffect } from 'react';
import { 
    Send, 
    Paperclip, 
    Image as ImageIcon, 
    X, 
    Loader2, 
    AlertCircle,
    Plus 
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
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-50">
                <div className="bg-gray-100 p-1.5 rounded-lg">
                    <Send size={16} className="text-gray-500" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Tambah Tindak Lanjut</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: Description Input */}
                <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Deskripsi / Tindakan</label>
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onKeyDown={handleKeyDown} 
                        placeholder="Deskripsikan tindakan yang dilakukan..."
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)]/50 outline-none transition-all resize-none min-h-[120px]"
                        rows={5}
                    />
                </div>

                {/* Right: Evidence Upload */}
                <div className="space-y-2 border-t md:border-t-0 md:border-l border-gray-100 md:pl-6 pt-4 md:pt-0 flex flex-col">
                     <div className="flex justify-between items-center">
                        <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Bukti / Lampiran</label>
                        <span className="text-[10px] text-gray-400">{attachments.length} file attached</span>
                     </div>
                    
                    <div className="flex-1 bg-gray-50/50 rounded-xl border border-dashed border-gray-200 p-2">
                        {attachments.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2">
                                {attachments.map((url, i) => (
                                    <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-white">
                                        <img src={url} alt="Preview" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removeAttachment(i)}
                                            className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-red-500 text-white rounded-full transition-colors backdrop-blur-sm"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                                <label className={cn(
                                    "aspect-square rounded-lg border border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-white transition-colors",
                                    uploading && "opacity-50 pointer-events-none"
                                )}>
                                    {uploading ? <Loader2 size={16} className="animate-spin text-gray-400" /> : <Plus size={16} className="text-gray-400" />}
                                    <span className="text-[9px] text-gray-400 font-medium">Add</span>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        multiple 
                                        className="hidden" 
                                        onChange={handleFileUpload} 
                                        disabled={uploading}
                                    />
                                </label>
                            </div>
                        ) : (
                            <label className={cn(
                                "h-full w-full flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-white transition-colors rounded-lg",
                                uploading && "opacity-50 pointer-events-none"
                            )}>
                                <div className="p-3 bg-white rounded-full shadow-sm">
                                    {uploading ? <Loader2 size={20} className="animate-spin text-[var(--brand-primary)]" /> : <Paperclip size={20} className="text-[var(--brand-primary)]" />}
                                </div>
                                <div className="text-center">
                                    <p className="text-xs font-bold text-gray-700">Upload Evidence</p>
                                    <p className="text-[10px] text-gray-400">Click or drag images here</p>
                                </div>
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    multiple 
                                    className="hidden" 
                                    onChange={handleFileUpload} 
                                    disabled={uploading}
                                />
                            </label>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-50">
                <button
                    onClick={() => handleSubmit()}
                    disabled={(!content.trim() && attachments.length === 0) || sending}
                    className={cn(
                        "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-sm",
                        (!content.trim() && attachments.length === 0) || sending
                            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                            : "bg-[var(--brand-primary)] hover:brightness-110 shadow-[var(--brand-primary)]/30"
                    )}
                >
                    {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    Submit Update
                </button>
            </div>
        </div>
    );
}
