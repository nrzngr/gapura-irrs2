'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  data: any[];
  title: string;
  columns: string[];
}

export const InvestigativeAIInsights: React.FC<Props> = ({ data, title, columns }) => {
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previousDataRef = React.useRef<string>('');

  useEffect(() => {
    const fetchInsights = async () => {
      if (!data || data.length === 0) return;
      
      // Prevent redundant fetches if data hasn't changed
      // Stability fix: JSON sample comparison to avoid infinite loops on re-renders
      const dataHash = JSON.stringify(data.slice(0, 10)); 
      if (dataHash === previousDataRef.current) return;
      previousDataRef.current = dataHash;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/investigative-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data,
            context: { title, columns }
          }),
        });

        if (!response.ok) throw new Error('Failed to fetch AI insights');
        
        const result = await response.json();
        setInsights(result.insights || []);
      } catch (err) {
        console.error('AI Insight Error:', err);
        setError('Gagal memuat kecerdasan AI.');
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [data, title, columns]);

  return (
    <div className="bg-[#6b8e3d]/5 rounded-xl border border-[#6b8e3d]/10 p-5 h-full min-h-[300px] flex flex-col">
      <div className="flex items-center gap-2 mb-4 shrink-0">
        <Sparkles size={16} className="text-[#6b8e3d]" />
        <h4 className="text-sm font-bold text-[#5a7a3a]">Kecerdasan Investigasi</h4>
      </div>

      <div className="flex-1">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12 gap-3"
            >
              <Loader2 className="w-5 h-5 text-[#6b8e3d] animate-spin" />
              <p className="text-[11px] font-medium text-[#6b8e3d]/60 uppercase tracking-widest">Menganalisis Pola...</p>
            </motion.div>
          ) : error ? (
            <motion.div 
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-red-500 bg-red-50 p-3 rounded-lg border border-red-100"
            >
              <AlertCircle size={14} />
              <p className="text-[11px] font-medium">{error}</p>
            </motion.div>
          ) : (
            <motion.div 
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              {insights.length > 0 ? (
                insights.map((insight, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ x: 10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex gap-3 text-xs leading-relaxed text-gray-700 bg-white/50 p-3 rounded-lg border border-white shadow-sm"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-[#6b8e3d] mt-1.5 shrink-0" />
                    <p>{insight}</p>
                  </motion.div>
                ))
              ) : (
                <p className="text-[11px] text-gray-500 italic text-center py-8">
                  Tidak ada insight yang ditemukan untuk data ini.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-6 pt-4 border-t border-[#6b8e3d]/10 shrink-0">
        <div className="flex items-center justify-between text-[10px] font-bold text-[#6b8e3d]/40 uppercase tracking-tighter">
          <span>Engine: Llama 3.1 8B</span>
          <span>Provider: Groq</span>
        </div>
      </div>
    </div>
  );
};
