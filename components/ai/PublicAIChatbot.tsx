'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Bot, Send, Paperclip, Mic } from 'lucide-react';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: ReactNode;
  ts: number;
};


export function PublicAIChatbot() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'm0',
      role: 'assistant',
      content: (
        <>
          Halo! Saya <span className="italic font-bold">&ldquo;I&apos;m in Charge&rdquo;</span> Virtual AI Assistant. Ada yang bisa saya bantu terkait operasional?
        </>
      ),
      ts: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const canSend = input.trim().length > 0 && !sending;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, sending]);

  const handleSend = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || sending) return;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content, ts: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);
    try {
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content:
          content.toLowerCase().includes('lapor') || content.toLowerCase().includes('buat laporan')
            ? 'Untuk membuat laporan secara cepat, gunakan menu Quick Access. Pilih kategori area, lalu deskripsi singkat dan unggah bukti. Jika butuh, saya bisa jelaskan kategori yang tepat.'
            : content.toLowerCase().includes('status')
            ? 'Status laporan publik dapat dicek melalui dashboard setelah diverifikasi. Pastikan Anda menyimpan nomor referensi setelah pengiriman.'
            : content.toLowerCase().includes('kategori')
            ? 'Kategori: Terminal (area penumpang), Apron ( ramp/GSE), Cargo (acceptance/delivery). Pilih sesuai lokasi kejadian.'
            : 'Saya akan membantu menjawab pertanyaan Anda dengan panduan praktis Quick Access. Coba ketik: “Cara buat laporan irregularity”.',
        ts: Date.now()
      };
      await new Promise((r) => setTimeout(r, 600));
      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] w-full max-w-2xl mx-auto rounded-3xl overflow-hidden bg-white/40 backdrop-blur-xl border border-[oklch(0.15_0.02_200_/_0.05)] shadow-spatial-lg animate-in fade-in zoom-in duration-500">

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar custom-scrollbar">
        {messages.map((m) => (
          <div key={m.id} className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`h-10 w-10 rounded-2xl flex items-center justify-center flex-shrink-0 border ${
              m.role === 'assistant' 
                ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                : 'bg-stone-100 border-stone-200 text-stone-600'
            }`}>
              {m.role === 'assistant' ? <Bot size={20} /> : <span className="text-[10px] font-black">YOU</span>}
            </div>
            <div className={`flex flex-col ${m.role === 'user' ? 'items-end' : ''} max-w-[80%]`}>
              <div className={`px-5 py-3.5 rounded-2xl shadow-sm transition-all ${
                m.role === 'assistant'
                  ? 'bg-white border border-[oklch(0.15_0.02_200_/_0.1)] text-[oklch(0.15_0.02_200)] rounded-tl-sm'
                  : 'bg-emerald-600 border border-emerald-500 text-white rounded-tr-sm'
              }`}>
                <div className="text-sm leading-relaxed">{m.content}</div>
              </div>
              <span className="mt-1.5 text-[10px] font-medium text-[oklch(0.15_0.02_200_/_0.3)] px-1">
                {new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex gap-4">
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center animate-pulse">
              <Bot size={20} />
            </div>
            <div className="bg-white/[0.03] border border-white/10 px-5 py-3.5 rounded-2xl rounded-tl-sm flex gap-1 items-center">
              <span className="w-1.5 h-1.5 bg-emerald-500/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-emerald-500/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-emerald-500/50 rounded-full animate-bounce" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 bg-white/[0.01] border-t border-white/5">
        <div className="relative group">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ketik pertanyaan Anda..."
            className="w-full bg-white border border-[oklch(0.15_0.02_200_/_0.1)] focus:border-emerald-500/50 rounded-2xl px-6 py-4 pr-14 text-sm text-black placeholder:text-[oklch(0.15_0.02_200_/_0.3)] outline-none transition-all shadow-spatial-sm focus:shadow-spatial-lg"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canSend) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            disabled={!canSend}
            onClick={() => handleSend()}
            className="absolute right-2 top-2 h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 active:scale-95 disabled:opacity-30 disabled:hover:bg-emerald-600 disabled:active:scale-100 transition-all"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
