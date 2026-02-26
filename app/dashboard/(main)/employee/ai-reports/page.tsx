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

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("bg-white rounded-xl border border-gray-200 shadow-sm", className)}>
    {children}
  </div>
);

const Badge = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700", className)}>
    {children}
  </span>
);

const Button = ({ children, onClick, disabled, variant = 'primary', className, type = 'button' }: any) => {
  const variants = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2",
        variants[variant as keyof typeof variants],
        className
      )}
    >
      {children}
    </button>
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
    'Critical': 'bg-red-100 text-red-700',
    'High': 'bg-orange-100 text-orange-700',
    'Medium': 'bg-amber-100 text-amber-700',
    'Low': 'bg-green-100 text-green-700',
  };
  return map[severity] || 'bg-gray-100 text-gray-700';
};

export default function BranchAIReportsPage() {
  const [batchResults, setBatchResults] = useState<BatchAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [branchInfo, setBranchInfo] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    analyzeAllReports(1, pageSize);
  }, []);

  const analyzeAllReports = async (p?: number, ps?: number) => {
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
          setPage(Number(data._pagination.page || 1));
          setPageSize(Number(data._pagination.pageSize || data.results?.length || 0));
          setTotal(Number(data._pagination.total || data.results?.length || 0));
        } else {
          setPage(1);
          setPageSize(data.results?.length || 0);
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

  const highPriorityCount = batchResults?.results.filter((r: any) => 
    r.classification?.severity === 'Critical' || r.classification?.severity === 'High'
  ).length || 0;

  const totalRecordsDerived = (() => {
    if (!batchResults) return 0;
    return batchResults.summary?.totalRecords ?? batchResults.results?.length ?? 0;
  })();
  const processingTimeSeconds = batchResults?.metadata?.processingTimeSeconds;

  const anomalyCount = batchResults?.results.filter((r: any) => 
    r?.prediction?.anomalyDetection?.isAnomaly ||
    ((r?.prediction?.anomalyDetection?.anomalies || []).length > 0)
  ).length || 0;

  const topIssueTypes = (() => {
    if (!batchResults) return [];
    const counts: Record<string, number> = {};
    for (const r of batchResults.results) {
      const key = r.originalData?.issueType || r.originalData?.Irregularity_Complain_Category || 'Unknown';
      counts[key] = (counts[key] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  })();

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

  const predictedDaysHistogram = (() => {
    if (!batchResults) return [];
    const bins = [
      { label: '<=2', min: -Infinity, max: 2 },
      { label: '2–3', min: 2, max: 3 },
      { label: '3–4', min: 3, max: 4 },
      { label: '4–5', min: 4, max: 5 },
      { label: '>5', min: 5, max: Infinity },
    ];
    const counts: Record<string, number> = Object.fromEntries(bins.map(b => [b.label, 0]));
    for (const r of batchResults.results) {
      const v = r?.prediction?.predictedDays;
      if (typeof v !== 'number') continue;
      const bin = bins.find(b => v > b.min && v <= b.max) || bins[bins.length - 1];
      counts[bin.label] = (counts[bin.label] || 0) + 1;
    }
    return bins.map(b => ({ name: b.label, Cases: counts[b.label] || 0 }));
  })();

  return (
    <div className="min-h-screen bg-gray-50/50 pb-12">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">AI Reports</h1>
                <p className="text-sm text-gray-500">
                  Analisis laporan {branchInfo ? `untuk stasiun ${branchInfo}` : 'stasiun Anda'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={analyzeAllReports}
                disabled={loading}
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                <span className="ml-2 hidden sm:inline">Refresh</span>
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
                <p className="text-sm text-gray-500">Mengambil data dari Google Sheets</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">{Math.round(progress)}% selesai</p>
          </Card>
        )}

        {/* Results */}
        {batchResults && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-5 border-l-4 border-emerald-500">
                <p className="text-xs font-semibold uppercase text-gray-500 mb-1">Total Laporan</p>
                <p className="text-2xl font-bold text-gray-900">{total || totalRecordsDerived}</p>
              </Card>
              
              <Card className="p-5 border-l-4 border-blue-500">
                <p className="text-xs font-semibold uppercase text-gray-500 mb-1">Waktu Proses</p>
                <p className="text-2xl font-bold text-gray-900">
                  {typeof processingTimeSeconds === 'number' ? `${processingTimeSeconds.toFixed(1)}s` : 'N/A'}
                </p>
              </Card>
              
              <Card className="p-5 border-l-4 border-purple-500">
                <p className="text-xs font-semibold uppercase text-gray-500 mb-1">Rata-rata Prediksi</p>
                <p className="text-2xl font-bold text-gray-900">{batchResults.summary.predictionStats.mean.toFixed(1)} hari</p>
              </Card>
              
              <Card className="p-5 border-l-4 border-red-500">
                <p className="text-xs font-semibold uppercase text-gray-500 mb-1">Prioritas Tinggi</p>
                <p className="text-2xl font-bold text-red-600">{highPriorityCount}</p>
              </Card>
            </div>

            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-bold">Quick Insights</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                  <div className="text-xs text-gray-600 uppercase font-semibold">Prediksi Rata-rata</div>
                  <div className="text-2xl font-bold text-emerald-700">{batchResults.summary.predictionStats.mean.toFixed(1)} hari</div>
                </div>
                <div className="p-4 rounded-xl bg-red-50 border border-red-100">
                  <div className="text-xs text-gray-600 uppercase font-semibold">Anomali Terdeteksi</div>
                  <div className="text-2xl font-bold text-red-600">{anomalyCount}</div>
                </div>
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                  <div className="text-xs text-gray-600 uppercase font-semibold">Top Kategori</div>
                  <div className="text-sm font-medium text-blue-700">
                    {topIssueTypes.map(([k, v], i) => (
                      <span key={k} className="mr-2">{i === 0 ? `${k} (${v})` : `• ${k} (${v})`}</span>
                    ))}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
                  <div className="text-xs text-gray-600 uppercase font-semibold">Kepercayaan Klasifikasi</div>
                  <div className="text-2xl font-bold text-amber-700">{(avgSeverityConfidence * 100).toFixed(0)}%</div>
                </div>
              </div>
            </Card>

            {/* Severity Distribution */}
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-gray-500" />
                Distribusi Tingkat Keparahan
              </h3>
              <ResponsiveBarChart 
                data={severityChartData}
                xAxisKey="name"
                dataKeys={['Count']}
                layout="vertical"
                height="h-[260px]"
                showLegend={false}
              />
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-gray-500" />
                Distribusi Prediksi (Hari)
              </h3>
              <ResponsiveBarChart 
                data={predictedDaysHistogram}
                xAxisKey="name"
                dataKeys={['Cases']}
                layout="vertical"
                height="h-[260px]"
                showLegend={false}
              />
            </Card>

            {/* High Priority Reports */}
            {highPriorityCount > 0 && (
              <Card className="p-6 border-red-200">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                  Laporan Prioritas Tinggi ({highPriorityCount})
                </h3>
                
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {batchResults.results
                    .filter((r: any) => r.classification?.severity === 'Critical' || r.classification?.severity === 'High')
                    .slice(0, 20)
                    .map((result: any, idx: number) => (
                      <div key={idx} className="p-4 bg-red-50 rounded-lg border border-red-100">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {result.originalData.airline || result.originalData.Airlines || 'Unknown'}
                            </p>
                            <p className="text-sm text-gray-600 truncate">
                              {result.originalData.issueType || result.originalData.Irregularity_Complain_Category || '-'}
                            </p>
                          </div>
                          <Badge className={getSeverityColor(result.classification?.severity)}>
                            {translateSeverity(result.classification?.severity)}
                          </Badge>
                        </div>
                        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Prediksi: {result.prediction?.predictedDays?.toFixed(1)} hari
                          </span>
                          {result.originalData.route && (
                            <span className="truncate">Rute: {result.originalData.route}</span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </Card>
            )}

            {/* Recent Reports Table */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-500" />
                  Semua Laporan AI
                </h3>
                <div className="flex items-center gap-3">
                  <Button variant="outline" onClick={exportResults}>
                    <Download size={16} className="mr-2" />
                    Export
                  </Button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                    <tr>
                      <th className="px-4 py-3 text-left">Maskapai</th>
                      <th className="px-4 py-3 text-left">Kategori</th>
                      <th className="px-4 py-3 text-left">Rute</th>
                      <th className="px-4 py-3 text-left">Prediksi</th>
                      <th className="px-4 py-3 text-left">Keparahan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {batchResults.results.map((result: any, idx: number) => (
                      <tr 
                        key={idx} 
                        className="hover:bg-gray-50/50 cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedReport(result);
                          setShowDetailModal(true);
                        }}
                      >
                        <td className="px-4 py-3 font-medium">
                          {result.originalData.airline || result.originalData.Airlines || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {result.originalData.issueType || result.originalData.Irregularity_Complain_Category || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {result.originalData.route || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "font-medium",
                            result.prediction?.predictedDays > 3 ? "text-red-600" : "text-emerald-600"
                          )}>
                            {result.prediction?.predictedDays?.toFixed(1)} hari
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={getSeverityColor(result.classification?.severity)}>
                            {translateSeverity(result.classification?.severity)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 text-sm text-gray-500">Menampilkan {batchResults.results.length} laporan</div>
            </Card>
          </motion.div>
        )}

        {/* Empty State */}
        {!batchResults && !loading && !error && (
          <Card className="p-12 text-center">
            <Database size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">Belum ada data. Klik refresh untuk menganalisis.</p>
          </Card>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowDetailModal(false)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Detail Laporan AI</h2>
                <p className="text-sm text-gray-500">Analisis otomatis menggunakan kecerdasan buatan</p>
              </div>
              <button 
                onClick={() => setShowDetailModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Severity & Prediction */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Tingkat Keparahan</p>
                  <Badge className={cn(getSeverityColor(selectedReport.classification?.severity), "text-sm px-3 py-1")}>
                    {translateSeverity(selectedReport.classification?.severity)}
                  </Badge>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Prediksi Waktu Penyelesaian</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    selectedReport.prediction?.predictedDays > 3 ? "text-red-600" : "text-emerald-600"
                  )}>
                    {selectedReport.prediction?.predictedDays?.toFixed(1)} hari
                  </p>
                </div>
              </div>

              {/* Original Data */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Data Laporan
                </h3>
                <div className="bg-gray-50 rounded-xl border border-gray-100 divide-y divide-gray-100">
                  {selectedReport.originalData.airline && (
                    <div className="flex items-center justify-between p-3">
                      <span className="text-sm text-gray-500 flex items-center gap-2">
                        <Plane className="w-4 h-4" /> Maskapai
                      </span>
                      <span className="text-sm font-medium">{selectedReport.originalData.airline}</span>
                    </div>
                  )}
                  {selectedReport.originalData.route && (
                    <div className="flex items-center justify-between p-3">
                      <span className="text-sm text-gray-500 flex items-center gap-2">
                        <MapPin className="w-4 h-4" /> Rute
                      </span>
                      <span className="text-sm font-medium">{selectedReport.originalData.route}</span>
                    </div>
                  )}
                  {selectedReport.originalData.date && (
                    <div className="flex items-center justify-between p-3">
                      <span className="text-sm text-gray-500 flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> Tanggal
                      </span>
                      <span className="text-sm font-medium">
                        {new Date(selectedReport.originalData.date).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                  )}
                  {selectedReport.originalData.issueType && (
                    <div className="flex items-center justify-between p-3">
                      <span className="text-sm text-gray-500">Kategori</span>
                      <span className="text-sm font-medium">{selectedReport.originalData.issueType}</span>
                    </div>
                  )}
                  {selectedReport.originalData.report && (
                    <div className="p-3">
                      <span className="text-sm text-gray-500 block mb-2">Deskripsi</span>
                      <p className="text-sm text-gray-900 bg-white p-3 rounded-lg border border-gray-100">
                        {selectedReport.originalData.report}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Sentiment Analysis */}
              {selectedReport.sentiment?.sentiment && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Analisis Sentimen
                  </h3>
                  <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
                    <Badge className={cn(
                      selectedReport.sentiment.sentiment.includes('Positive') ? "bg-green-100 text-green-700" :
                      selectedReport.sentiment.sentiment.includes('Negative') ? "bg-red-100 text-red-700" :
                      "bg-gray-100 text-gray-700"
                    )}>
                      {selectedReport.sentiment.sentiment}
                    </Badge>
                    {typeof selectedReport.sentiment.urgencyScore === 'number' && (
                      <p className="text-xs text-gray-500 mt-2">
                        Urgency: {(selectedReport.sentiment.urgencyScore * 100).toFixed(0)}%
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* AI Summary */}
              {(selectedReport.summary?.executiveSummary || selectedReport.summary?.summary) && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    Ringkasan AI
                  </h3>
                  <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4">
                    <p className="text-sm text-gray-900">
                      {selectedReport.summary.executiveSummary || selectedReport.summary.summary}
                    </p>
                    {Array.isArray(selectedReport.summary.keyPoints) && selectedReport.summary.keyPoints.length > 0 && (
                      <div className="mt-3">
                        <div className="text-xs font-bold text-emerald-700 uppercase mb-2">Poin Kunci</div>
                        <ul className="list-disc list-inside text-sm text-emerald-900">
                          {selectedReport.summary.keyPoints.map((kp: string, i: number) => (
                            <li key={i}>{kp}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Entities */}
              {Array.isArray(selectedReport.entities?.entities) && selectedReport.entities.entities.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Entitas yang Dikenali</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedReport.entities.entities.map((e: any, idx: number) => (
                      <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                        {e.label}: {e.text}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(selectedReport.prediction?.shapExplanation?.topFactors?.length > 0 ||
                selectedReport.prediction?.anomalyDetection?.anomalies?.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedReport.prediction?.shapExplanation?.topFactors?.length > 0 && (
                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="text-xs font-semibold text-gray-600 uppercase mb-2">Faktor Utama (SHAP)</div>
                      <ul className="text-sm text-gray-800 space-y-1">
                        {selectedReport.prediction.shapExplanation.topFactors.slice(0, 5).map((f: any, i: number) => (
                          <li key={i} className="flex items-center justify-between">
                            <span>{f.feature}</span>
                            <span className={cn(
                              "text-xs font-bold",
                              f.direction === 'increases' ? 'text-red-600' : 'text-emerald-600'
                            )}>
                              {f.direction} • {Math.abs(f.abs_contribution || f.shap_value).toFixed(2)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {selectedReport.prediction?.anomalyDetection?.anomalies?.length > 0 && (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-100">
                      <div className="text-xs font-semibold text-red-700 uppercase mb-2">Anomali</div>
                      <ul className="text-sm text-red-800 space-y-1">
                        {selectedReport.prediction.anomalyDetection.anomalies.map((a: any, i: number) => (
                          <li key={i}>{a.message || a.type}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 flex justify-end">
              <Button onClick={() => setShowDetailModal(false)}>
                Tutup
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
