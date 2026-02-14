import { Sparkles, TrendingUp, TrendingDown, AlertCircle, Lightbulb, CheckCircle, BarChart3, Search, AlertTriangle, Minus } from 'lucide-react';
import { ChartVisualization, QueryDefinition } from '@/types/builder';

interface AIInsight {
  ringkasan: string;
  temuanUtama: string[];
  tren: Array<{
    label: string;
    arah: string;
    persentase: number;
    deskripsi: string;
  }>;
  rekomendasi: string[];
  anomali: Array<{
    label: string;
    nilai: number | string;
    deskripsi: string;
  }>;
  kesimpulan: string;
  saranEksplorasi?: string[];
  supportingCharts?: Array<{
    visualization: ChartVisualization;
    query: QueryDefinition;
    explanation: string;
  }>;
}

interface AIInsightsPanelProps {
  insights: AIInsight | null;
  loading: boolean;
}

export function AIInsightsPanel({ insights, loading }: AIInsightsPanelProps) {
  if (loading) {
    return (
      <div className="p-6 h-full">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="w-5 h-5 text-[#6b8e3d] animate-pulse" />
          <h3 className="text-sm font-semibold text-[#6b8e3d] uppercase tracking-wide">
            Insight AI
          </h3>
        </div>
        
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-[#e0e0e0] rounded w-3/4 mb-2" />
              <div className="h-3 bg-[#f0f0f0] rounded w-full" />
              <div className="h-3 bg-[#f0f0f0] rounded w-5/6 mt-1" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="p-6 h-full flex flex-col items-center justify-center text-center">
        <AlertCircle className="w-12 h-12 text-[#999] mb-4" />
        <p className="text-sm text-[#666]">
          Gagal memuat insight AI. Silakan coba lagi nanti.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#e0e0e0]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#6b8e3d]" />
          <h3 className="text-sm font-semibold text-[#6b8e3d] uppercase tracking-wide">
            Insight AI
          </h3>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#e8f5e9] border border-[#c8e6c9] rounded-full">
          <div className="w-1.5 h-1.5 bg-[#4caf50] rounded-full animate-pulse" />
          <span className="text-[10px] font-bold text-[#2e7d32] uppercase tracking-tighter">Deep Analysis</span>
        </div>
      </div>

      <div className="space-y-6">
        {/* Executive Summary */}
        <section className="bg-gradient-to-br from-[#e8f5e9] to-[#f1f8e9] rounded-xl p-4 border border-[#c8e6c9]">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 text-[#5a7a3a]" />
            <h4 className="text-xs font-semibold text-[#5a7a3a] uppercase tracking-wide">
              Ringkasan Eksekutif
            </h4>
          </div>
          <p className="text-sm text-[#333] leading-relaxed">
            {insights.ringkasan}
          </p>
        </section>

        {/* Key Findings */}
        {insights.temuanUtama?.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Search className="w-5 h-5 text-[#5a7a3a]" />
              <h4 className="text-xs font-semibold text-[#5a7a3a] uppercase tracking-wide">
                Temuan Utama
              </h4>
            </div>
            <ul className="space-y-2">
              {insights.temuanUtama.map((temuan, idx) => (
                <li 
                  key={idx}
                  className="flex items-start gap-2 text-sm text-[#444] bg-[#f9f9f9] p-3 rounded-lg"
                >
                  <CheckCircle className="w-4 h-4 text-[#6b8e3d] mt-0.5 flex-shrink-0" />
                  <span>{temuan}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Trends */}
        {insights.tren?.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-[#5a7a3a]" />
              <h4 className="text-xs font-semibold text-[#5a7a3a] uppercase tracking-wide">
                Tren Penting
              </h4>
            </div>
            <div className="space-y-2">
              {insights.tren.map((tren, idx) => (
                <div 
                  key={idx}
                  className="bg-[#f9f9f9] p-3 rounded-lg flex items-start gap-3"
                >
                  {tren.arah === 'naik' ? (
                    <TrendingUp className="w-5 h-5 text-[#4caf50] flex-shrink-0" />
                  ) : tren.arah === 'turun' ? (
                    <TrendingDown className="w-5 h-5 text-[#f44336] flex-shrink-0" />
                  ) : (
                    <Minus className="w-5 h-5 text-[#999] flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[#333]">{tren.label}</span>
                      <span className={`text-sm font-bold ${
                        tren.arah === 'naik' ? 'text-[#4caf50]' : 
                        tren.arah === 'turun' ? 'text-[#f44336]' : 
                        'text-[#666]'
                      }`}>
                        {tren.persentase > 0 && tren.arah === 'naik' ? '+' : ''}
                        {tren.persentase}%
                      </span>
                    </div>
                    <p className="text-xs text-[#666] mt-1">{tren.deskripsi}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recommendations */}
        {insights.rekomendasi?.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-5 h-5 text-[#5a7a3a]" />
              <h4 className="text-xs font-semibold text-[#5a7a3a] uppercase tracking-wide">
                Rekomendasi
              </h4>
            </div>
            <ul className="space-y-2">
              {insights.rekomendasi.map((rekomendasi, idx) => (
                <li 
                  key={idx}
                  className="flex items-start gap-2 text-sm text-[#444] bg-[#fff8e1] p-3 rounded-lg border border-[#ffecb3]"
                >
                  <Lightbulb className="w-4 h-4 text-[#ff8f00] mt-0.5 flex-shrink-0" />
                  <span>{rekomendasi}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Anomalies */}
        {insights.anomali?.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-[#5a7a3a]" />
              <h4 className="text-xs font-semibold text-[#5a7a3a] uppercase tracking-wide">
                Anomali Terdeteksi
              </h4>
            </div>
            <div className="space-y-2">
              {insights.anomali.map((anomali, idx) => (
                <div 
                  key={idx}
                  className="bg-[#ffebee] p-3 rounded-lg border border-[#ffcdd2]"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-[#c62828]" />
                    <span className="text-sm font-medium text-[#c62828]">{anomali.label}</span>
                    <span className="text-sm font-bold text-[#c62828]">
                      {anomali.nilai.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <p className="text-xs text-[#666] mt-1">{anomali.deskripsi}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Conclusion */}
        {insights.kesimpulan && (
          <section className="pt-4 border-t border-[#e0e0e0]">
            <p className="text-sm text-[#333] font-medium text-center italic mb-4">
              &quot;{insights.kesimpulan}&quot;
            </p>
            
            {insights.saranEksplorasi && insights.saranEksplorasi.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center">
                {insights.saranEksplorasi.map((saran, idx) => (
                  <button 
                    key={idx}
                    className="text-[10px] bg-white border border-[#e0e0e0] text-[#666] px-3 py-1 rounded-full hover:border-[#6b8e3d] hover:text-[#6b8e3d] transition-all"
                  >
                    {saran}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
