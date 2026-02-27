'use client';

import { useState, useEffect } from 'react';
import {
  Brain, Database, AlertTriangle, Clock, RefreshCw, 
  Download, PieChart, FileText, Loader2,
  X, ChevronRight, Calendar, MapPin, Plane, MessageSquare, Activity, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ResponsiveBarChart } from '@/components/charts/ResponsiveBarChart';

interface BatchAnalysisResult {
  status: string;
  metadata: {
    totalRecords: number;
    processingTimeSeconds: number;
    recordsPerSecond?: number;
    modelVersions?: {
      regression: string;
      nlp: string;
    };
  };
  sheets?: Record<string, { rows_fetched: number; status: string }>;
  summary: {
    totalRecords?: number;
    sheetsProcessed?: number;
    regressionEnabled?: boolean;
    nlpEnabled?: boolean;
    severityDistribution: Record<string, number>;
    predictionStats: {
      min: number;
      max: number;
      mean: number;
    };
  };
  results: Array<{
    rowId: string;
    sourceSheet: string;
    originalData: any;
    prediction: any;
    classification: any;
    sentiment?: any;
    summary?: any;
    entities?: any;
  }>;
}

const Card = ({ children, className, variant = 'default', onClick }: { children: React.ReactNode; className?: string; variant?: 'default' | 'frosted' | 'glass'; onClick?: () => void }) => {
  const variants = {
    default: "bg-white border-[oklch(0.15_0.02_200_/_0.05)] shadow-spatial-sm",
    frosted: "bg-white/50 backdrop-blur-xl border-white/40 shadow-spatial-md",
    glass: "bg-white/30 backdrop-blur-md border border-white/20 shadow-inner-rim"
  };
  return (
    <motion.div 
      whileHover={{ y: -2 }}
      onClick={onClick}
      className={cn("rounded-3xl transition-all duration-300", variants[variant], className)}
    >
      {children}
    </motion.div>
  );
};

const Badge = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[oklch(0.98_0.01_200)] text-[oklch(0.15_0.02_200)] border border-[oklch(0.15_0.02_200_/_0.1)] shadow-sm", className)}>
    {children}
  </span>
);

const Button = ({ children, onClick, disabled, variant = 'primary', className, type = 'button' }: any) => {
  const variants = {
    primary: 'bg-[oklch(0.40_0.15_160)] text-white hover:bg-[oklch(0.35_0.15_160)] shadow-spatial-sm',
    secondary: 'bg-[oklch(0.98_0.01_200)] text-[oklch(0.15_0.02_200)] hover:bg-[oklch(0.95_0.01_200)] border border-[oklch(0.15_0.02_200_/_0.1)]',
    outline: 'bg-transparent border border-[oklch(0.15_0.02_200_/_0.2)] text-[oklch(0.15_0.02_200)] hover:bg-[oklch(0.15_0.02_200_/_0.05)]',
  };
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "px-5 py-2.5 rounded-2xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm tracking-tight",
        variants[variant as keyof typeof variants],
        className
      )}
    >
      {children}
    </motion.button>
  );
};

const translateSeverity = (severity: string): string => {
  const map: Record<string, string> = {
    'Critical': 'Kritis',
    'High': 'Tinggi',
    'Medium': 'Sedang',
    'Low': 'Rendah',
  };
  return map[severity] || severity;
};

const getSeverityColor = (severity: string): string => {
  const map: Record<string, string> = {
    'Critical': 'bg-red-50 text-red-600 border-red-100',
    'High': 'bg-orange-50 text-orange-600 border-orange-100',
    'Medium': 'bg-amber-50 text-amber-600 border-amber-100',
    'Low': 'bg-emerald-50 text-emerald-600 border-emerald-100',
  };
  return map[severity] || 'bg-stone-50 text-stone-600 border-stone-100';
};

export default function BranchAIReportsPage() {
  const [batchResults, setBatchResults] = useState<BatchAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [branchInfo, setBranchInfo] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCriticalModal, setShowCriticalModal] = useState(false);

  useEffect(() => {
    analyzeAllReports();
  }, []);

  const analyzeAllReports = async () => {
    setLoading(true);
    setProgress(0);
    setError(null);
    
    try {
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 500);
      
      let res = await fetch(`/api/ai/analyze-all?max_rows_per_sheet=10000&exclude_closed=true&source=local`);
      if (!res.ok) {
        res = await fetch(`/api/ai/analyze-all?max_rows_per_sheet=10000&exclude_closed=true`);
      }
      clearInterval(progressInterval);
      setProgress(100);
      
      if (res.ok) {
        const data = await res.json();
        setBatchResults(data);
        if (data._pagination) {
          setTotal(Number(data._pagination.total || data.results?.length || 0));
        } else {
          setTotal(data.results?.length || 0);
        }
        
        if (data._proxy?.branch_filter) {
          setBranchInfo(data._proxy.branch_filter);
        }
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        setError(errorData.error || `Error ${res.status}: AI service tidak tersedia`);
      }
    } catch (err) {
      setError('Gagal menganalisis laporan. Pastikan AI service berjalan.');
    } finally {
      setLoading(false);
    }
  };

  const exportResults = () => {
    if (!batchResults) return;
    
    const data = {
      summary: batchResults.summary,
      results: batchResults.results,
      branch: branchInfo,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-analysis-branch-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const criticalAndHighReports = batchResults?.results.filter((r: any) => 
    r.classification?.severity === 'Critical' || r.classification?.severity === 'High'
  ) || [];

  const highPriorityCount = criticalAndHighReports.length;

  const totalRecordsDerived = (() => {
    if (!batchResults) return 0;
    return batchResults.summary?.totalRecords ?? batchResults.results?.length ?? 0;
  })();
  const processingTimeSeconds = batchResults?.metadata?.processingTimeSeconds;

  const anomalyCount = batchResults?.results.filter((r: any) => 
    r?.prediction?.anomalyDetection?.isAnomaly ||
    ((r?.prediction?.anomalyDetection?.anomalies || []).length > 0)
  ).length || 0;

  const avgSeverityConfidence = (() => {
    if (!batchResults) return 0;
    const vals = batchResults.results
      .map((r: any) => r.classification?.severityConfidence)
      .filter((x: any) => typeof x === 'number');
    if (vals.length === 0) return 0;
    return vals.reduce((a: number, b: number) => a + b, 0) / vals.length;
  })();

  const severityChartData = (() => {
    if (!batchResults) return [];
    const dist = batchResults.summary.severityDistribution || {};
    const order = ['Critical', 'High', 'Medium', 'Low'];
    return order.map((level) => ({
      name: level,
      Count: dist[level] || 0,
    }));
  })();

  return (
    <div className="min-h-screen bg-[oklch(0.98_0.01_200)] text-[oklch(0.15_0.02_200)] selection:bg-emerald-500/10 font-body">
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-50 mix-blend-overlay">
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noise)" />
        </svg>
      </div>

      {/* Header */}
      <div className="bg-white/70 backdrop-blur-xl border-b border-[oklch(0.15_0.02_200_/_0.05)] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="p-3 bg-white border border-[oklch(0.15_0.02_200_/_0.1)] rounded-2xl shadow-spatial-sm">
                <Brain className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="space-y-0.5">
                <h1 className="text-3xl font-display font-black tracking-tight leading-none">AI Analytics</h1>
                <p className="text-sm font-medium text-[oklch(0.40_0.02_200)] opacity-80">
                  {branchInfo ? `Stasiun ${branchInfo}` : 'Inteligensi Operasional'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => analyzeAllReports()}
                disabled={loading}
                className="h-12 px-6"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                <span className="hidden sm:inline italic font-black">Re-sync Engine</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3"
            >
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <p className="text-red-700">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading */}
        {loading && (
          <Card className="p-6 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <div>
                <p className="font-medium">Menganalisis laporan...</p>
                <p className="text-sm text-stone-500">Mengambil data dari Engine Analitik</p>
              </div>
            </div>
            <div className="w-full bg-stone-100 rounded-full h-2">
              <div 
                className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-stone-500 mt-2">{Math.round(progress)}% selesai</p>
          </Card>
        )}

        {/* Results */}
        {batchResults && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Summary Stats Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { 
                  label: 'TOTAL ANALISIS', 
                  value: total || totalRecordsDerived, 
                  color: 'emerald', 
                  icon: Database,
                  desc: 'Total data laporan yang berhasil dianalisis oleh AI'
                },
                { 
                  label: 'ESTIMASI SELESAI', 
                  value: `${batchResults.summary.predictionStats.mean.toFixed(1)}d`, 
                  color: 'amber', 
                  icon: Sparkles,
                  desc: 'Prediksi rata-rata waktu penyelesaian laporan'
                },
                { 
                  id: 'critical',
                  label: 'JALUR KRITIS', 
                  value: highPriorityCount, 
                  color: 'red', 
                  icon: AlertTriangle,
                  desc: 'Laporan prioritas tinggi yang butuh atensi segera',
                  action: () => setShowCriticalModal(true)
                },
              ].map((stat, i) => (
                <Card 
                  key={i} 
                  className={cn(
                    "p-6 relative overflow-hidden group",
                    stat.id === 'critical' && "cursor-pointer hover:ring-2 hover:ring-red-100 transition-all border-red-50"
                  )}
                  onClick={stat.action}
                >
                  <div className={`absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity`}>
                    <stat.icon className="w-full h-full rotate-12" />
                  </div>
                  <div className="relative z-10 space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[oklch(0.40_0.02_200)] opacity-60">{stat.label}</p>
                    <div className="flex items-end justify-between">
                      <div className="space-y-1">
                        <p className={cn("text-4xl font-display font-black tracking-tighter", 
                          stat.color === 'red' ? 'text-red-600' : 'text-[oklch(0.15_0.05_200)]'
                        )}>
                          {stat.value}
                        </p>
                        <p className="text-[10px] font-medium text-[oklch(0.40_0.02_200)] opacity-70 leading-tight max-w-[180px]">
                          {stat.desc}
                        </p>
                      </div>
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border shadow-inner-rim shrink-0", 
                        stat.color === 'emerald' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                        stat.color === 'blue' ? 'bg-blue-50 border-blue-100 text-blue-600' :
                        stat.color === 'amber' ? 'bg-amber-50 border-amber-100 text-amber-600' :
                        'bg-red-50 border-red-100 text-red-600'
                      )}>
                        <stat.icon size={18} />
                      </div>
                    </div>
                  </div>
                  {stat.id === 'critical' && (
                    <div className="absolute bottom-4 right-4 text-[8px] font-black uppercase tracking-widest text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      Click to View <ChevronRight size={8} />
                    </div>
                  )}
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-8 group">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-emerald-50 rounded-xl">
                    <Sparkles className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-display font-black tracking-tight">Quick Insights</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Avg Pred', value: `${batchResults.summary.predictionStats.mean.toFixed(1)}d`, icon: Clock, bg: 'bg-emerald-50', text: 'text-emerald-700' },
                    { label: 'Anomalies', value: anomalyCount, icon: AlertTriangle, bg: 'bg-red-50', text: 'text-red-700' },
                    { label: 'Confidence', value: `${(avgSeverityConfidence * 100).toFixed(0)}%`, icon: Activity, bg: 'bg-blue-50', text: 'text-blue-700' },
                    { label: 'Complexity', value: 'High', icon: Brain, bg: 'bg-amber-50', text: 'text-amber-700' },
                  ].map((item, i) => (
                    <div key={i} className={cn("p-4 rounded-2xl border border-transparent hover:border-white/50 transition-all", item.bg)}>
                      <p className="text-[10px] font-black uppercase tracking-wider opacity-40 mb-1">{item.label}</p>
                      <p className={cn("text-xl font-display font-black", item.text)}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-8">
                 <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-blue-50 rounded-xl">
                    <PieChart className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-display font-black tracking-tight">Severity Map</h3>
                </div>
                <div className="h-[180px]">
                  <ResponsiveBarChart 
                    data={severityChartData}
                    xAxisKey="name"
                    dataKeys={['Count']}
                    layout="vertical"
                    height="h-full"
                    showLegend={false}
                  />
                </div>
              </Card>
            </div>

            {/* List Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-display font-black tracking-tight flex items-center gap-3">
                <FileText className="text-stone-400" size={20} />
                Analytical Records
              </h3>
              <Button variant="outline" onClick={exportResults}>
                <Download size={16} />
                <span className="italic font-black">Export Analysis</span>
              </Button>
            </div>

            {/* Data Table Section */}
            <Card className="overflow-hidden border-stone-200/60 shadow-spatial-md">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-stone-50/50">
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 border-b border-stone-100">Identity / Route</th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 border-b border-stone-100">Severity</th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 border-b border-stone-100">ETA</th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 border-b border-stone-100 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-50">
                    {batchResults.results.map((report, idx) => (
                      <motion.tr 
                        key={report.rowId || idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        onClick={() => {
                          setSelectedReport(report);
                          setShowDetailModal(true);
                        }}
                        className="group hover:bg-[oklch(0.98_0.01_200)] cursor-pointer transition-colors"
                      >
                        <td className="px-8 py-5">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-stone-800 tracking-tight group-hover:text-emerald-700 transition-colors">
                              {report.originalData.airline || report.originalData.Airlines || 'Unknown Carrier'}
                            </span>
                            <span className="text-[10px] font-bold text-stone-400 italic">
                              {report.originalData.route || 'No route defined'}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <Badge className={cn(getSeverityColor(report.classification?.severity), "px-3 py-1")}>
                            {translateSeverity(report.classification?.severity)}
                          </Badge>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2">
                             <Clock size={12} className="text-stone-300" />
                             <span className={cn("text-xs font-black italic", 
                               report.prediction?.predictedDays > 3 ? "text-red-500" : "text-emerald-600"
                             )}>
                               {report.prediction?.predictedDays?.toFixed(1)}d
                             </span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex justify-end">
                            <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all transform group-hover:rotate-90">
                              <ChevronRight size={14} />
                            </div>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="p-4 bg-stone-50/50 border-t border-stone-100 text-[10px] font-black uppercase tracking-widest text-stone-400 text-center">
                Reflecting {batchResults.results.length} total analytical units
              </div>
            </Card>
          </motion.div>
        )}

        {/* Empty State */}
        {!batchResults && !loading && !error && (
          <Card className="p-20 text-center border-dashed border-2 border-stone-200">
            <Database size={48} className="mx-auto mb-6 text-stone-200" />
            <h3 className="text-xl font-display font-black mb-2">No Active Packets</h3>
            <p className="text-stone-400 italic text-sm mb-8">Synchronize with the analysis engine to begin.</p>
            <Button onClick={() => analyzeAllReports()} className="mx-auto">
              Initialize Engine
            </Button>
          </Card>
        )}
      </div>

      {/* Critical Reports Modal */}
      <AnimatePresence>
        {showCriticalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[oklch(0.15_0.02_200_/_0.3)] backdrop-blur-md"
              onClick={() => setShowCriticalModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative z-10 w-full max-w-xl max-h-[80vh] overflow-hidden bg-white rounded-[2.5rem] shadow-spatial-lg border border-red-50 flex flex-col"
            >
              <div className="p-6 border-b border-red-50 flex items-center justify-between bg-red-50/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-50 rounded-xl border border-red-100">
                    <AlertTriangle size={18} className="text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-display font-black tracking-tight">Laporan Jalur Kritis</h2>
                    <p className="text-[10px] font-black uppercase tracking-widest text-red-400">Ditemukan {highPriorityCount} Isu Prioritas</p>
                  </div>
                </div>
                <button onClick={() => setShowCriticalModal(false)} className="p-2 hover:bg-white rounded-full transition-colors">
                  <X size={20} className="text-stone-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {criticalAndHighReports.map((report: any, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => {
                      setSelectedReport(report);
                      setShowDetailModal(true);
                      setShowCriticalModal(false);
                    }}
                    className="p-4 rounded-2xl bg-[oklch(0.98_0.01_200)] border border-[oklch(0.15_0.02_200_/_0.05)] hover:border-red-200 hover:bg-red-50/30 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge className={cn(getSeverityColor(report.classification?.severity), "px-2 py-0.5")}>
                            {translateSeverity(report.classification?.severity)}
                          </Badge>
                          <span className="text-[10px] font-black italic text-stone-400">
                            {report.originalData.airline || report.originalData.Airlines}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-stone-800 line-clamp-1 group-hover:text-red-700 transition-colors">
                          {report.originalData.route || report.originalData.issueType || 'Detail Operasional'}
                        </p>
                        <p className="text-[10px] text-stone-500 italic opacity-60">
                          ETA: {report.prediction?.predictedDays?.toFixed(1)} hari
                        </p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-white border border-stone-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                        <ChevronRight size={14} className="text-red-600" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[oklch(0.15_0.02_200_/_0.4)] backdrop-blur-md"
              onClick={() => setShowDetailModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative z-10 w-full max-w-4xl max-h-[90vh] overflow-hidden bg-white rounded-[2.5rem] shadow-spatial-lg border border-white flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-8 border-b border-[oklch(0.15_0.02_200_/_0.05)] flex items-center justify-between bg-stone-50/30">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-2xl shadow-spatial-sm border border-stone-100">
                    <Database size={20} className="text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-display font-black tracking-tight">Data Sheet View</h2>
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">UUID: {selectedReport.rowId?.slice(0, 8)}</p>
                  </div>
                </div>
                <motion.button 
                  whileHover={{ rotate: 90 }}
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-stone-100"
                >
                  <X className="w-6 h-6 text-stone-400" />
                </motion.button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
                  <div className="space-y-8">
                    {/* ID & Origin */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Database className="w-4 h-4 text-emerald-600" />
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Source Identity</span>
                      </div>
                      <div className="p-6 bg-[oklch(0.98_0.01_200)] rounded-3xl border border-[oklch(0.15_0.02_200_/_0.05)] space-y-4">
                        {[
                          { label: 'Airline', value: selectedReport.originalData.airline || selectedReport.originalData.Airlines, icon: Plane },
                          { label: 'Route', value: selectedReport.originalData.route, icon: MapPin },
                          { label: 'Timestamp', value: selectedReport.originalData.date ? new Date(selectedReport.originalData.date).toLocaleDateString('id-ID') : '-', icon: Calendar },
                          { label: 'Category', value: selectedReport.originalData.issueType || selectedReport.originalData.Irregularity_Complain_Category, icon: FileText }
                        ].map((item, i) => item.value && (
                          <div key={i} className="flex items-center justify-between group/item">
                            <span className="text-xs font-bold text-[oklch(0.40_0.02_200)] flex items-center gap-2">
                              <item.icon className="w-3.5 h-3.5 opacity-40 group-hover/item:opacity-100 transition-opacity" /> {item.label}
                            </span>
                            <span className="text-xs font-black italic">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Report Description */}
                    {selectedReport.originalData.report && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4 text-stone-400" />
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Observation Details</span>
                        </div>
                        <div className="p-6 bg-white rounded-3xl border border-stone-100 shadow-inner-rim">
                          <p className="text-xs leading-relaxed text-stone-600 font-medium">
                            {selectedReport.originalData.report}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Sentiment Analysis */}
                    {selectedReport.sentiment?.sentiment && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="w-4 h-4 text-blue-600" />
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Affective Computing</span>
                        </div>
                        <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100/50">
                          <div className="flex items-center justify-between mb-4">
                            <Badge className={cn(
                              selectedReport.sentiment.sentiment.includes('Positive') ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                              selectedReport.sentiment.sentiment.includes('Negative') ? "bg-red-100 text-red-700 border-red-200" :
                              "bg-blue-100 text-blue-700 border-blue-200"
                            )}>
                              {selectedReport.sentiment.sentiment}
                            </Badge>
                            <span className="text-[10px] font-black italic text-blue-600">Urgency: {(selectedReport.sentiment.urgencyScore * 100).toFixed(0)}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-blue-100/50 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(selectedReport.sentiment.urgencyScore * 100) || 0}%` }}
                              className="h-full bg-blue-600"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-8">
                    {/* Metrics Overlay */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-6 bg-white rounded-3xl border border-[oklch(0.15_0.02_200_/_0.05)] shadow-spatial-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">Resolution</p>
                        <p className={cn("text-3xl font-display font-black tracking-tighter", 
                          selectedReport.prediction?.predictedDays > 3 ? "text-red-600" : "text-emerald-600"
                        )}>
                          {selectedReport.prediction?.predictedDays?.toFixed(1)}<span className="text-sm italic ml-1 opacity-40">days</span>
                        </p>
                      </div>
                      <div className="p-6 bg-white rounded-3xl border border-[oklch(0.15_0.02_200_/_0.05)] shadow-spatial-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">Severity</p>
                        <Badge className={cn(getSeverityColor(selectedReport.classification?.severity), "px-4 py-1.5 text-[11px]")}>
                          {translateSeverity(selectedReport.classification?.severity)}
                        </Badge>
                      </div>
                    </div>

                    {/* Entities */}
                    {Array.isArray(selectedReport.entities?.entities) && selectedReport.entities.entities.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Activity className="w-4 h-4 text-emerald-600" />
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Core Entities</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedReport.entities.entities.map((e: any, idx: number) => (
                            <span key={idx} className="px-3 py-1.5 bg-[oklch(0.98_0.01_200)] text-[oklch(0.15_0.05_200)] text-[10px] font-black italic rounded-xl border border-[oklch(0.15_0.02_200_/_0.1)] shadow-sm">
                              {e.label}: {e.text}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI Executive Summary */}
                    {(selectedReport.summary?.executiveSummary || selectedReport.summary?.summary) && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-4 h-4 text-amber-600" />
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-40">AI Generation</span>
                        </div>
                        <div className="p-8 bg-emerald-50 rounded-[2rem] border border-emerald-100/50 relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                            <Brain size={48} />
                          </div>
                          <p className="text-sm leading-relaxed text-[oklch(0.15_0.05_160)] font-medium relative z-10 italic">
                            &ldquo;{selectedReport.summary.executiveSummary || selectedReport.summary.summary}&rdquo;
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-8 bg-stone-50/50 border-t border-stone-100 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                  Close Sheet
                </Button>
                <Button onClick={() => window.print()} className="bg-stone-800 hover:bg-black">
                   Print PDF
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
