'use client';

import React, { useState } from 'react';
import { Search, TrendingUp, Info, Bot, Loader2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types from User's Schema ---
interface RootCauseCategoryDetail {
  count: number;
  percentage: number;
  top_issue_categories: Record<string, number>;
  top_areas: Record<string, number>;
  top_airlines: Record<string, number>;
  description: string;
}

interface RootCauseAnalysisResult {
  total_records: number;
  classified: number;
  unknown: number;
  classification_rate: number;
  by_category: Record<string, RootCauseCategoryDetail>;
  top_categories: [string, RootCauseCategoryDetail][];
}

// Legacy props for existing chart fallback
interface RootCauseChartProps {
  data: any[]; // Retaining simplified type for fallback
  title?: string;
  explanation?: string;
  limit?: number;
}

const CAUSE_COLORS = [
  '#ef5350', '#ffa726', '#fdd835', '#7cb342', '#42a5f5', 
  '#ab47bc', '#26c6da', '#ec407a', '#8d6e63', '#78909c'
];

export function RootCauseChart({ 
  data, 
  title = 'Analisis Akar Masalah',
  explanation,
  limit = 8
}: RootCauseChartProps) {
  const [aiMode, setAiMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiData, setAiData] = useState<RootCauseAnalysisResult | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const handleAnalyzeWithAI = async () => {
    setAiMode(true);
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/root-cause/stats');
      if (!res.ok) {
        throw new Error(`Failed to fetch data: ${res.statusText}`);
      }
      const result: RootCauseAnalysisResult = await res.json();
      setAiData(result);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCard = (categoryName: string) => {
    setExpandedCard(expandedCard === categoryName ? null : categoryName);
  };

  // --- Render AI View ---
  const renderAIView = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center h-[400px]">
          <Loader2 className="w-10 h-10 text-[#6b8e3d] animate-spin mb-4" />
          <h4 className="text-sm font-bold text-slate-700">Menganalisis Data...</h4>
          <p className="text-xs text-slate-500 mt-2 max-w-[200px]">
            Menggunakan AI untuk mengklasifikasikan dan mencari akar masalah...
          </p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center h-[400px]">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <h4 className="text-sm font-bold text-slate-700">Analisis Gagal</h4>
          <p className="text-xs text-slate-500 mt-2 mb-4 max-w-[250px]">{error}</p>
          <button 
            onClick={handleAnalyzeWithAI}
            className="text-xs px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      );
    }

    if (!aiData) return null;

    return (
      <div className="flex flex-col h-[500px] overflow-hidden">
        {/* Header Stats */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 bg-gradient-to-r from-[#6b8e3d]/10 to-transparent border-b border-[#e0e0e0]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 sm:mb-2 gap-2 sm:gap-0">
            <div>
              <h5 className="text-xs font-bold text-[#6b8e3d] uppercase tracking-wider">AI Classification Results</h5>
              <div className="text-[10px] text-slate-500 mt-0.5 flex gap-2">
                <span>Total: <span className="font-mono font-bold text-slate-700">{aiData.total_records}</span></span>
                <span className="text-slate-300">|</span>
                <span>Unclassified: <span className="font-mono font-bold text-slate-700">{aiData.unknown}</span></span>
              </div>
            </div>
            <div className="text-left sm:text-right w-full sm:w-auto flex justify-between sm:block items-center">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight sm:hidden">Rate</span>
              <div>
                <span className="text-xl font-black text-slate-700 mr-1 sm:mr-0 inline-block">
                    {aiData.classification_rate.toFixed(1)}%
                </span>
                <div className="hidden sm:block text-[9px] font-bold text-slate-400 uppercase tracking-tight">Classification Rate</div>
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
            <div 
              className="h-full bg-[#6b8e3d]" 
              style={{ width: `${aiData.classification_rate}%` }} 
            />
            <div 
              className="h-full bg-slate-200" 
              style={{ width: `${100 - aiData.classification_rate}%` }} 
            />
          </div>
        </div>

        {/* Categories List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8f9fa]">
          {aiData.top_categories.map(([name, detail], idx) => {
            const isExpanded = expandedCard === name;
            
            return (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={name} 
                className={`bg-white rounded-lg border transition-all ${
                  isExpanded ? 'border-[#6b8e3d] shadow-md ring-1 ring-[#6b8e3d]/20' : 'border-[#e0e0e0] hover:border-[#b0b0b0]'
                }`}
              >
                {/* Card Header */}
                <button 
                  onClick={() => toggleCard(name)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      #{idx + 1}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{name}</h4>
                      <div className="text-[10px] text-slate-500 line-clamp-1">{detail.description}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                     <div className="text-right hidden sm:block">
                        <div className="text-xs font-bold text-slate-700">{detail.count}</div>
                        <div className="text-[9px] text-slate-400">Kasus</div>
                     </div>
                     <div className="text-right min-w-[40px]">
                        <div className="text-xs font-bold text-[#6b8e3d]">{detail.percentage.toFixed(1)}%</div>
                     </div>
                     {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </div>
                </button>

                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-0 border-t border-dashed border-slate-100">
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                            {/* Top Issues */}
                            <div className="bg-slate-50 rounded p-2">
                               <div className="text-[9px] font-bold text-slate-400 uppercase mb-2 tracking-wider">Top Issues</div>
                               <div className="space-y-1">
                                  {Object.entries(detail.top_issue_categories)
                                    .sort(([,a], [,b]) => b - a)
                                    .slice(0, 3)
                                    .map(([k, v]) => (
                                      <div key={k} className="flex justify-between text-[10px]">
                                        <span className="text-slate-600 truncate max-w-[100px]">{k || '(Blank)'}</span>
                                        <span className="font-mono font-medium text-slate-400">{v}</span>
                                      </div>
                                  ))}
                               </div>
                            </div>

                            {/* Top Areas */}
                            <div className="bg-slate-50 rounded p-2">
                               <div className="text-[9px] font-bold text-slate-400 uppercase mb-2 tracking-wider">Top Areas</div>
                               <div className="space-y-1">
                                  {Object.entries(detail.top_areas)
                                    .sort(([,a], [,b]) => b - a)
                                    .slice(0, 3)
                                    .map(([k, v]) => (
                                      <div key={k} className="flex justify-between text-[10px]">
                                        <span className="text-slate-600 truncate max-w-[100px]">{k}</span>
                                        <span className="font-mono font-medium text-slate-400">{v}</span>
                                      </div>
                                  ))}
                               </div>
                            </div>

                            {/* Top Airlines */}
                            <div className="bg-slate-50 rounded p-2">
                               <div className="text-[9px] font-bold text-slate-400 uppercase mb-2 tracking-wider">Top Airlines</div>
                               <div className="space-y-1">
                                  {Object.entries(detail.top_airlines)
                                    .sort(([,a], [,b]) => b - a)
                                    .slice(0, 3)
                                    .map(([k, v]) => (
                                      <div key={k} className="flex justify-between text-[10px]">
                                        <span className="text-slate-600 truncate max-w-[100px]">{k}</span>
                                        <span className="font-mono font-medium text-slate-400">{v}</span>
                                      </div>
                                  ))}
                               </div>
                            </div>
                         </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  };

  // --- Render Initial State (Button Only) ---
  const renderInitialView = () => {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[300px] bg-gradient-to-b from-white to-slate-50">
        <div className="w-16 h-16 bg-[#6b8e3d]/10 rounded-2xl flex items-center justify-center mb-4 transition-transform hover:scale-110 duration-500">
          <Bot className="w-8 h-8 text-[#6b8e3d]" />
        </div>
        
        <h3 className="text-sm font-bold text-slate-800 mb-2">
          AI Root Cause Analysis
        </h3>
        
        <p className="text-xs text-slate-500 max-w-[240px] leading-relaxed mb-6">
          Gunakan kecerdasan buatan untuk menganalisis dan mengklasifikasikan ribuan laporan insiden secara otomatis.
        </p>

        <button 
            onClick={handleAnalyzeWithAI}
            className="group relative flex items-center gap-2.5 px-6 py-2.5 bg-[#6b8e3d] text-white rounded-full shadow-[0_4px_14px_-4px_#6b8e3d] hover:shadow-[0_6px_20px_-4px_#6b8e3d] hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
        >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <Bot className="w-4 h-4 relative z-10" />
            <span className="text-xs font-bold tracking-wide relative z-10">Deep Analysis with AI</span>
        </button>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-[#e0e0e0] flex flex-col overflow-hidden h-full transition-all hover:shadow-lg">
      <div className="px-4 py-3 border-b border-[#f0f0f0] flex items-center justify-between bg-white relative z-10">
        <div className="flex items-center gap-2">
            <h4 className="text-[11px] font-bold text-[#333] uppercase tracking-tight">
            {title}
            </h4>
            {aiMode && <span className="bg-[#6b8e3d] text-white text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wide">AI MODE</span>}
        </div>
        
        {/* Toggle Back to Standard View if in AI Mode */}
        {aiMode ? (
            <button 
                onClick={() => setAiMode(false)}
                className="text-[9px] text-slate-400 hover:text-slate-600 underline decoration-dotted"
            >
                Kembali ke Grafik Standar
            </button>
        ) : (
            <div className="w-1.5 h-1.5 rounded-full bg-[#6b8e3d]" />
        )}
      </div>
      
      {/* Content Area */}
      {aiMode ? renderAIView() : renderInitialView()}

      {/* Legacy Explanation Footer */}
      {!aiMode && explanation && (
        <div className="px-4 py-3 bg-[#fcfcfc] border-t border-[#f0f0f0] flex gap-2.5 items-start">
          <Info className="w-3.5 h-3.5 text-[#6b8e3d] mt-0.5 flex-shrink-0" />
          <p className="text-[10px] text-[#777] leading-relaxed italic">
            {explanation}
          </p>
        </div>
      )}
    </div>
  );
}
