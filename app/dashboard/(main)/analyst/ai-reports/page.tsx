'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Brain, Activity, TrendingUp, AlertTriangle, Clock, RefreshCw, 
  Play, Download, Database, Cpu, BarChart3, PieChart,
  AlertCircle, CheckCircle2, XCircle, Zap, Target, FileText,
  Loader2, Search, Sparkles, Gauge, Lightbulb,
  ChevronDown, ChevronUp, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ReportDetailModal } from '@/components/dashboard/ReportDetailModal';

// --- Types ---
interface ModelInfo {
  regression: {
    version: string;
    type: string;
    status: string;
    metrics: {
      train_mae: number;
      train_rmse: number;
      train_r2: number;
      test_mae: number;
      test_rmse: number;
      test_r2: number;
      n_samples: number;
      n_features: number;
      feature_importance: Record<string, number>;
    };
  };
  nlp: {
    version: string;
    type: string;
    status: string;
  };
}

interface HealthStatus {
  status: string;
  models: {
    regression: {
      version: string;
      loaded: boolean;
      metrics: {
        test_mae: number;
        test_rmse: number;
        test_r2: number;
      };
    };
    nlp: {
      version: string;
      status: string;
    };
  };
  cache: {
    status: string;
    used_memory: string;
  };
}

interface BatchAnalysisResult {
  status: string;
  metadata: {
    totalRecords: number;
    processingTimeSeconds: number;
  };
  summary: {
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
  }>;
}

interface AIReport {
  id: string;
  title: string;
  airlines?: string;
  main_category?: string;
  status: string;
  severity?: string;
  created_at: string;
  description?: string;
  branch?: string;
  hub?: string;
}

// --- Utility Functions ---
const translateSeverity = (severity: string): string => {
  const map: Record<string, string> = {
    'Critical': 'Kritis',
    'High': 'Tinggi',
    'Medium': 'Sedang',
    'Low': 'Rendah',
    'critical': 'Kritis',
    'high': 'Tinggi',
    'medium': 'Sedang',
    'low': 'Rendah'
  };
  return map[severity] || severity;
};

const getSeverityColor = (severity: string): string => {
  const map: Record<string, string> = {
    'Critical': 'bg-red-100 text-red-700 border-red-200',
    'High': 'bg-orange-100 text-orange-700 border-orange-200',
    'Medium': 'bg-amber-100 text-amber-700 border-amber-200',
    'Low': 'bg-green-100 text-green-700 border-green-200',
  };
  return map[severity] || 'bg-gray-100 text-gray-700 border-gray-200';
};

// --- Components ---
const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("bg-white rounded-xl border border-gray-200 shadow-sm", className)}>
    {children}
  </div>
);

const Badge = ({ children, className, variant = 'default' }: { children: React.ReactNode; className?: string; variant?: 'default' | 'outline' | 'secondary' | 'destructive' }) => {
  const variants = {
    default: 'bg-emerald-100 text-emerald-700',
    outline: 'border border-gray-200 text-gray-700',
    secondary: 'bg-gray-100 text-gray-700',
    destructive: 'bg-red-100 text-red-700'
  };
  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium", variants[variant], className)}>
      {children}
    </span>
  );
};

const Button = ({ children, onClick, disabled, variant = 'primary', className, type = 'button' }: any) => {
  const variants = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
    ghost: 'text-gray-600 hover:bg-gray-100'
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

const Progress = ({ value, className }: { value: number; className?: string }) => (
  <div className={cn("w-full bg-gray-200 rounded-full overflow-hidden", className)}>
    <div 
      className="bg-emerald-500 h-full transition-all duration-300"
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
);

const StatCard = ({ title, value, subtitle, icon: Icon, trend, color }: any) => (
  <Card className="p-5 border-l-4 hover:shadow-lg transition-shadow">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        {trend && (
          <div className={cn("flex items-center gap-1 text-xs mt-2", trend > 0 ? 'text-green-600' : 'text-red-600')}>
            <TrendingUp size={14} className={trend > 0 ? '' : 'rotate-180'} />
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <div className={cn("p-3 rounded-xl", color)}>
        <Icon size={20} className="text-white" />
      </div>
    </div>
  </Card>
);

const FeatureImportanceChart = ({ features }: { features: Record<string, number> }) => {
  const sortedFeatures = Object.entries(features)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  return (
    <div className="space-y-3">
      {sortedFeatures.map(([feature, importance], idx) => (
        <div key={feature} className="flex items-center gap-3">
          <span className="text-xs font-mono w-6">{idx + 1}</span>
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium">{feature.replace(/_/g, ' ')}</span>
              <span className="text-gray-500">{(importance * 100).toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${importance * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const SeverityDistribution = ({ distribution }: { distribution: Record<string, number> }) => {
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);
  const colors: Record<string, string> = {
    'Critical': 'bg-red-500',
    'High': 'bg-orange-500',
    'Medium': 'bg-amber-500',
    'Low': 'bg-green-500'
  };
  
  return (
    <div className="space-y-2">
      {Object.entries(distribution).map(([severity, count]) => (
        <div key={severity} className="flex items-center gap-3">
          <div className={cn("w-3 h-3 rounded-full", colors[severity] || 'bg-gray-400')} />
          <span className="text-sm flex-1">{translateSeverity(severity)}</span>
          <span className="text-sm font-bold">{count}</span>
          <span className="text-xs text-gray-500 w-12 text-right">
            {((count / total) * 100).toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
};

// --- Main Component ---
export default function AIReportsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [reports, setReports] = useState<AIReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string>('');
  const [selectedReport, setSelectedReport] = useState<AIReport | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [singleAnalysis, setSingleAnalysis] = useState<any>(null);
  const [batchResults, setBatchResults] = useState<BatchAnalysisResult | null>(null);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Fetch initial data
  useEffect(() => {
    fetchHealthStatus();
    fetchModelInfo();
    fetchReports();
  }, []);

  const fetchHealthStatus = async () => {
    try {
      const res = await fetch('/api/ai/health');
      if (res.ok) {
        const data = await res.json();
        console.log('[AI Health] Response:', data);
        setHealthStatus(data);
      } else {
        console.error('[AI Health] Error:', res.status);
      }
    } catch (err) {
      console.error('[AI Health] Failed to fetch:', err);
    }
  };

  const fetchModelInfo = async () => {
    try {
      const res = await fetch('/api/ai/model-info');
      if (res.ok) {
        const data = await res.json();
        console.log('[AI Model Info] Response:', data);
        console.log('[AI Model Info] Test MAE:', data.regression?.metrics?.test_mae);
        console.log('[AI Model Info] Test R2:', data.regression?.metrics?.test_r2);
        console.log('[AI Model Info] Samples:', data.regression?.metrics?.n_samples);
        setModelInfo(data);
      } else {
        console.error('[AI Model Info] Error:', res.status);
      }
    } catch (err) {
      console.error('[AI Model Info] Failed to fetch:', err);
    }
  };

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/admin/reports');
      if (res.ok) {
        const data = await res.json();
        console.log('[AI Reports] Fetched reports:', data.length);
        setReports(Array.isArray(data) ? data : []);
      } else {
        console.error('[AI Reports] Failed to fetch reports:', res.status);
        setError('Gagal mengambil data laporan dari server');
      }
    } catch (err) {
      console.error('[AI Reports] Error fetching reports:', err);
      setError('Error mengambil data laporan');
    }
  };

  const analyzeSingleReport = async (report: AIReport) => {
    setLoading(prev => ({ ...prev, single: true }));
    setError(null);
    
    // Log the report data being sent
    console.log('[AI Single Analysis] Report data:', report);
    
    // Map the report data properly
    const reportData = {
      Date_of_Event: report.created_at || new Date().toISOString(),
      Airlines: report.airlines || 'Unknown',
      Flight_Number: report.title || 'N/A',
      Branch: report.branch || 'Unknown',
      HUB: report.hub || 'Unknown',
      Irregularity_Complain_Category: report.main_category || 'Unknown',
      Report: report.description || '',
      Area: report.branch || 'Unknown',
      Status: report.status || 'Open'
    };
    
    console.log('[AI Single Analysis] Mapped data:', reportData);
    
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: [reportData],
          options: {
            predictResolutionTime: true,
            classifySeverity: true,
            extractEntities: true,
            generateSummary: true,
            analyzeTrends: true
          }
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log('[AI Single Analysis] Response:', JSON.stringify(data, null, 2));
        console.log('[AI Single Analysis] Report ID:', report.id);
        console.log('[AI Single Analysis] Predicted days:', data.regression?.predictions?.[0]?.predictedDays);
        console.log('[AI Single Analysis] Confidence Interval:', data.regression?.predictions?.[0]?.confidenceInterval);
        console.log('[AI Single Analysis] Severity:', data.nlp?.classifications?.[0]?.severity);
        console.log('[AI Single Analysis] Summary:', data.nlp?.summaries?.[0]?.executiveSummary);
        setSingleAnalysis({ report, analysis: data });
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[AI Analysis] Error:', errorData);
        setError(errorData.error || `Error ${res.status}: AI service tidak tersedia`);
        setSingleAnalysis(null);
      }
    } catch (err) {
      console.error('[AI Analysis] Exception:', err);
      setError('Gagal menganalisis laporan. Pastikan AI service berjalan di localhost:8000');
      setSingleAnalysis(null);
    } finally {
      setLoading(prev => ({ ...prev, single: false }));
    }
  };

  const analyzeAllReports = async () => {
    setLoading(prev => ({ ...prev, batch: true }));
    setProgress(0);
    setError(null);
    
    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 500);
      
      const res = await fetch('/api/ai/analyze-all?max_rows_per_sheet=10000');
      clearInterval(progressInterval);
      setProgress(100);
      
      if (res.ok) {
        const data = await res.json();
        console.log('[AI Batch Analysis] Response:', JSON.stringify(data, null, 2));
        console.log('[AI Batch Analysis] Total records:', data.metadata?.totalRecords);
        console.log('[AI Batch Analysis] Severity distribution:', data.summary?.severityDistribution);
        setBatchResults(data);
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[AI Batch] Error:', errorData);
        setError(errorData.error || `Error ${res.status}: AI service tidak tersedia`);
      }
    } catch (err) {
      console.error('[AI Batch] Exception:', err);
      setError('Gagal menganalisis semua laporan. Pastikan AI service berjalan di localhost:8000');
    } finally {
      setLoading(prev => ({ ...prev, batch: false }));
    }
  };

  const refreshCache = async () => {
    setLoading(prev => ({ ...prev, cache: true }));
    setError(null);
    try {
      const res = await fetch('/api/ai/cache/invalidate', { method: 'POST' });
      if (res.ok) {
        await fetchHealthStatus();
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        setError(errorData.error || 'Gagal me-refresh cache');
      }
    } catch (err) {
      console.error('[AI Cache] Exception:', err);
      setError('Gagal me-refresh cache. AI service mungkin tidak tersedia.');
    } finally {
      setLoading(prev => ({ ...prev, cache: false }));
    }
  };

  const triggerRetraining = async () => {
    setLoading(prev => ({ ...prev, train: true }));
    try {
      const res = await fetch('/api/ai/train', { method: 'POST' });
      if (res.ok) {
        await fetchModelInfo();
      }
    } catch (err) {
      setError('Gagal memulai pelatihan ulang');
    } finally {
      setLoading(prev => ({ ...prev, train: false }));
    }
  };

  const exportResults = () => {
    if (!batchResults) return;
    
    const data = {
      summary: batchResults.summary,
      results: batchResults.results,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-analysis-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReportSelect = async (reportId: string) => {
    setSelectedReportId(reportId);
    const report = reports.find(r => r.id === reportId);
    if (report) {
      setSelectedReport(report);
      await analyzeSingleReport(report);
    }
  };

  const modelLoaded = healthStatus?.models?.regression?.loaded || false;
  const testMae = modelInfo?.regression?.metrics?.test_mae || 0;
  const testR2 = modelInfo?.regression?.metrics?.test_r2 || 0;
  const nSamples = modelInfo?.regression?.metrics?.n_samples || 0;

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
                <h1 className="text-2xl font-bold text-gray-900">Laporan AI</h1>
                <p className="text-sm text-gray-500">Analisis Cerdas dengan Kecerdasan Buatan</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge 
                className={cn(
                  "px-3 py-1",
                  modelLoaded 
                    ? "bg-emerald-100 text-emerald-700" 
                    : "bg-red-100 text-red-700"
                )}
              >
                {modelLoaded ? (
                  <><CheckCircle2 size={14} className="mr-1 inline" /> Model Aktif</>
                ) : (
                  <><XCircle size={14} className="mr-1 inline" /> Model Tidak Aktif</>
                )}
              </Badge>
              
              <Button
                variant="outline"
                onClick={refreshCache}
                disabled={loading.cache}
              >
                {loading.cache ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                <span className="ml-2 hidden sm:inline">Refresh Cache</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard 
            title="Akurasi Model"
            value={`${(testR2 * 100).toFixed(0)}%`}
            subtitle={`MAE: ${testMae.toFixed(2)} hari`}
            icon={Target}
            color="bg-emerald-500"
          />
          <StatCard 
            title="Total Data Latih"
            value={nSamples.toLocaleString()}
            subtitle="Records dari Google Sheets"
            icon={Database}
            color="bg-blue-500"
          />
          <StatCard 
            title="Fitur Model"
            value={modelInfo?.regression?.metrics?.n_features || 0}
            subtitle="Feature engineering"
            icon={Cpu}
            color="bg-purple-500"
          />
          <StatCard 
            title="Versi Model"
            value={modelInfo?.regression?.version?.split('-')[0] || 'N/A'}
            subtitle={modelInfo?.regression?.type || 'Unknown'}
            icon={Activity}
            color="bg-orange-500"
          />
        </div>

        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-red-700">{error}</p>
              <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">
                <XCircle size={18} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Custom Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <div className="flex">
              {[
                { id: 'overview', label: 'Ringkasan' },
                { id: 'batch', label: 'Analisis Batch' },
                { id: 'single', label: 'Analisis Individual' },
                { id: 'model', label: 'Info Model' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "px-6 py-3 text-sm font-medium border-b-2 transition-colors",
                    activeTab === tab.id
                      ? "border-emerald-500 text-emerald-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Quick Actions */}
                  <Card className="p-6">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-amber-500" />
                      Aksi Cepat
                    </h3>
                    <div className="space-y-3">
                      <Button 
                        className="w-full justify-start" 
                        onClick={() => setActiveTab('batch')}
                      >
                        <Play size={18} className="mr-2" />
                        Analisis Semua Laporan
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => setActiveTab('single')}
                      >
                        <Search size={18} className="mr-2" />
                        Analisis Laporan Spesifik
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={triggerRetraining}
                        disabled={loading.train}
                      >
                        {loading.train ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Sparkles size={18} className="mr-2" />}
                        Pelatihan Ulang Model
                      </Button>
                    </div>
                  </Card>

                  {/* Model Status */}
                  <Card className="p-6">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Gauge className="w-5 h-5 text-blue-500" />
                      Status Model
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-gray-600">Status Regresi</span>
                        <Badge className={modelLoaded ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                          {modelLoaded ? 'Aktif' : 'Tidak Aktif'}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-gray-600">Status NLP</span>
                        <Badge variant="outline">{healthStatus?.models?.nlp?.status || 'Unknown'}</Badge>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-gray-600">Cache Status</span>
                        <Badge variant="outline">{healthStatus?.cache?.status || 'Unknown'}</Badge>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-gray-600">Memory Cache</span>
                        <span className="font-mono text-sm">{healthStatus?.cache?.used_memory || 'N/A'}</span>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Feature Importance */}
                {modelInfo?.regression?.metrics?.feature_importance && (
                  <Card className="p-6">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-purple-500" />
                      Fitur Paling Penting
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Fitur-fitur ini memiliki pengaruh terbesar terhadap prediksi waktu penyelesaian.
                    </p>
                    <FeatureImportanceChart features={modelInfo.regression.metrics.feature_importance} />
                  </Card>
                )}
              </div>
            )}

            {/* Batch Analysis Tab */}
            {activeTab === 'batch' && (
              <div className="space-y-6">
                <Card className="p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        <Database className="w-5 h-5 text-blue-500" />
                        Analisis Batch
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Analisis semua laporan dari Google Sheets menggunakan AI
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={analyzeAllReports}
                        disabled={loading.batch}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        {loading.batch ? (
                          <><Loader2 size={18} className="mr-2 animate-spin" /> Menganalisis...</>
                        ) : (
                          <><Play size={18} className="mr-2" /> Mulai Analisis</>
                        )}
                      </Button>
                      {batchResults && (
                        <Button variant="outline" onClick={exportResults}>
                          <Download size={18} className="mr-2" />
                          Export
                        </Button>
                      )}
                    </div>
                  </div>

                  {loading.batch && (
                    <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                      <div className="flex justify-between text-sm mb-2">
                        <span>Progress Analisis</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}

                  {batchResults && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                    >
                      {/* Summary Stats */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-emerald-50 rounded-lg">
                          <p className="text-sm text-gray-600">Total Laporan</p>
                          <p className="text-2xl font-bold text-emerald-700">
                            {batchResults.metadata.totalRecords}
                          </p>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <p className="text-sm text-gray-600">Waktu Proses</p>
                          <p className="text-2xl font-bold text-blue-700">
                            {batchResults.metadata.processingTimeSeconds.toFixed(1)}s
                          </p>
                        </div>
                        <div className="p-4 bg-purple-50 rounded-lg">
                          <p className="text-sm text-gray-600">Rata-rata Prediksi</p>
                          <p className="text-2xl font-bold text-purple-700">
                            {batchResults.summary.predictionStats.mean.toFixed(1)} hari
                          </p>
                        </div>
                      </div>

                      {/* Severity Distribution */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-bold mb-4 flex items-center gap-2">
                            <PieChart size={18} />
                            Distribusi Tingkat Keparahan
                          </h4>
                          <SeverityDistribution distribution={batchResults.summary.severityDistribution} />
                        </div>

                        <div className="p-4 border rounded-lg">
                          <h4 className="font-bold mb-4">Statistik Prediksi</h4>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Minimum</span>
                              <span className="font-bold">{batchResults.summary.predictionStats.min.toFixed(1)} hari</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Maksimum</span>
                              <span className="font-bold">{batchResults.summary.predictionStats.max.toFixed(1)} hari</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Rata-rata</span>
                              <span className="font-bold">{batchResults.summary.predictionStats.mean.toFixed(1)} hari</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* High Priority Reports */}
                      {batchResults.results.filter((r: any) => 
                        r.classification?.severity === 'Critical' || r.classification?.severity === 'High'
                      ).length > 0 && (
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-bold mb-4 flex items-center gap-2 text-red-600">
                            <AlertTriangle size={18} />
                            Laporan Prioritas Tinggi
                          </h4>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {batchResults.results
                              .filter((r: any) => r.classification?.severity === 'Critical' || r.classification?.severity === 'High')
                              .slice(0, 10)
                              .map((result: any, idx: number) => (
                                <div key={idx} className="p-3 bg-red-50 rounded-lg border border-red-200">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="font-medium">{result.originalData.airline}</p>
                                      <p className="text-sm text-gray-600">{result.originalData.issueType}</p>
                                    </div>
                                    <Badge className={getSeverityColor(result.classification.severity)}>
                                      {translateSeverity(result.classification.severity)}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-gray-500 mt-1">
                                    Prediksi: {result.prediction?.predictedDays?.toFixed(1)} hari
                                  </p>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {!batchResults && !loading.batch && (
                    <div className="text-center py-12 text-gray-500">
                      <Database size={48} className="mx-auto mb-4 opacity-50" />
                      <p>Belum ada analisis batch. Klik "Mulai Analisis" untuk menganalisis semua laporan.</p>
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* Single Analysis Tab */}
            {activeTab === 'single' && (
              <div className="space-y-6">
                <Card className="p-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Search className="w-5 h-5 text-blue-500" />
                    Analisis Laporan Individual
                  </h3>
                  
                  <div className="mb-6">
                    <label className="block text-sm font-medium mb-2">Pilih Laporan</label>
                    {reports.length === 0 ? (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-amber-700">
                          Tidak ada laporan tersedia. Pastikan data Google Sheets sudah di-import.
                        </p>
                        <button 
                          onClick={fetchReports}
                          className="mt-2 text-sm text-amber-600 underline hover:text-amber-800"
                        >
                          Muat Ulang Data
                        </button>
                      </div>
                    ) : (
                      <select
                        value={selectedReportId}
                        onChange={(e) => handleReportSelect(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        <option value="">Pilih laporan untuk dianalisis... ({reports.length} tersedia)</option>
                        {reports.slice(0, 100).map((report) => (
                          <option key={report.id} value={report.id}>
                            {report.airlines || 'Unknown'} - {report.title?.substring(0, 50) || 'No Title'}...
                          </option>
                        ))}
                      </select>
                    )}
                    {reports.length > 100 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Menampilkan 100 dari {reports.length} laporan
                      </p>
                    )}
                  </div>

                  {loading.single && (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 size={32} className="animate-spin text-emerald-600" />
                      <span className="ml-3 text-gray-600">Menganalisis laporan...</span>
                    </div>
                  )}

                  {singleAnalysis && !loading.single && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                    >
                      {/* Model Status Warning */}
                      {!singleAnalysis.analysis.regression?.modelMetrics?.model_loaded && (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-amber-700 text-sm">
                            <strong>Perhatian:</strong> {singleAnalysis.analysis.regression?.modelMetrics?.note || 'Model AI tidak tersedia. Menampilkan prediksi fallback.'}
                          </p>
                        </div>
                      )}

                      {/* Report Info */}
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h4 className="font-bold text-gray-800 mb-2">Detail Laporan</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Maskapai</p>
                            <p className="font-medium">{singleAnalysis.report.airlines || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Kategori</p>
                            <p className="font-medium">{singleAnalysis.report.main_category || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Branch</p>
                            <p className="font-medium">{singleAnalysis.report.branch || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Status</p>
                            <p className="font-medium">{singleAnalysis.report.status || 'N/A'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Prediction Result */}
                      <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                        <h4 className="font-bold text-emerald-800 mb-2">Hasil Prediksi AI</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Waktu Penyelesaian</p>
                            <p className="text-2xl font-bold text-emerald-700">
                              {singleAnalysis.analysis.regression?.predictions?.[0]?.predictedDays?.toFixed(1)} hari
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Interval Kepercayaan</p>
                            <p className="text-lg font-bold text-emerald-700">
                              [{singleAnalysis.analysis.regression?.predictions?.[0]?.confidenceInterval?.[0]?.toFixed(1)} - {singleAnalysis.analysis.regression?.predictions?.[0]?.confidenceInterval?.[1]?.toFixed(1)}]
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Tingkat Keparahan</p>
                            <Badge className={getSeverityColor(singleAnalysis.analysis.nlp?.classifications?.[0]?.severity)}>
                              {translateSeverity(singleAnalysis.analysis.nlp?.classifications?.[0]?.severity)}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* SHAP Explanation */}
                      {singleAnalysis.analysis.regression?.predictions?.[0]?.shapExplanation && (
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-bold mb-2 flex items-center gap-2">
                            <Lightbulb className="w-4 h-4 text-amber-500" />
                            Penjelasan Prediksi (SHAP)
                          </h4>
                          <p className="text-sm text-gray-600 mb-3">
                            {singleAnalysis.analysis.regression.predictions[0].shapExplanation.explanation}
                          </p>
                          <div className="space-y-2">
                            {singleAnalysis.analysis.regression.predictions[0].shapExplanation.topFactors.map((factor: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                <span className={cn(
                                  "w-2 h-2 rounded-full",
                                  factor.direction === 'increases' ? 'bg-red-500' : 'bg-green-500'
                                )} />
                                <span className="flex-1">{factor.feature.replace(/_/g, ' ')}</span>
                                <span className={cn(
                                  "font-medium",
                                  factor.direction === 'increases' ? 'text-red-600' : 'text-green-600'
                                )}>
                                  {factor.direction === 'increases' ? '+' : '-'}{factor.abs_contribution.toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Summary */}
                      {singleAnalysis.analysis.nlp?.summaries?.[0] && (
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-bold mb-2">Ringkasan AI</h4>
                          <p className="text-sm text-gray-700 mb-3">
                            {singleAnalysis.analysis.nlp.summaries[0].executiveSummary !== 'Unknown: ' 
                              ? singleAnalysis.analysis.nlp.summaries[0].executiveSummary
                              : 'Ringkasan tidak tersedia untuk laporan ini.'}
                          </p>
                          {singleAnalysis.analysis.nlp.summaries[0].keyPoints.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {singleAnalysis.analysis.nlp.summaries[0].keyPoints
                                .filter((point: string) => !point.includes('Unknown'))
                                .map((point: string, idx: number) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {point}
                                  </Badge>
                                ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Sentiment */}
                      {singleAnalysis.analysis.nlp?.sentiment?.[0] && (
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-bold mb-2">Analisis Sentimen</h4>
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="text-sm text-gray-600">Skor Urgensi</p>
                              <p className="text-xl font-bold">
                                {(singleAnalysis.analysis.nlp.sentiment[0].urgencyScore * 100).toFixed(0)}%
                              </p>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-gray-600">Kata Kunci Terdeteksi</p>
                               <div className="flex flex-wrap gap-1 mt-1">
                                 {singleAnalysis.analysis.nlp.sentiment[0].keywords.length > 0 ? (
                                   singleAnalysis.analysis.nlp.sentiment[0].keywords.map((kw: string, idx: number) => (
                                     <Badge key={idx} variant="secondary" className="text-xs">
                                       {kw}
                                     </Badge>
                                   ))
                                 ) : (
                                   <span className="text-sm text-gray-400">Tidak ada kata kunci terdeteksi</span>
                                 )}
                               </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {!singleAnalysis && !loading.single && (
                    <div className="text-center py-12 text-gray-500">
                      <Search size={48} className="mx-auto mb-4 opacity-50" />
                      <p>Pilih laporan dari dropdown untuk melihat analisis AI detail.</p>
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* Model Info Tab */}
            {activeTab === 'model' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Regression Model */}
                <Card className="p-6">
                  <h3 className="text-lg font-bold mb-4">Model Regresi</h3>
                  {modelInfo?.regression ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500">Versi</p>
                          <p className="font-bold">{modelInfo.regression.version}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500">Tipe</p>
                          <p className="font-bold">{modelInfo.regression.type}</p>
                        </div>
                      </div>
                      
                      {modelInfo.regression?.metrics && (
                        <>
                          <div className="border-t pt-4">
                            <h4 className="font-semibold mb-3">Metrik Training</h4>
                            <div className="grid grid-cols-3 gap-3">
                              <div className="text-center p-2 bg-blue-50 rounded">
                                <p className="text-xs text-gray-500">MAE</p>
                                <p className="font-bold text-blue-700">{modelInfo.regression.metrics.train_mae?.toFixed(3) || 'N/A'}</p>
                              </div>
                              <div className="text-center p-2 bg-blue-50 rounded">
                                <p className="text-xs text-gray-500">RMSE</p>
                                <p className="font-bold text-blue-700">{modelInfo.regression.metrics.train_rmse?.toFixed(3) || 'N/A'}</p>
                              </div>
                              <div className="text-center p-2 bg-blue-50 rounded">
                                <p className="text-xs text-gray-500">R²</p>
                                <p className="font-bold text-blue-700">{modelInfo.regression.metrics.train_r2?.toFixed(3) || 'N/A'}</p>
                              </div>
                            </div>
                          </div>

                          <div className="border-t pt-4">
                            <h4 className="font-semibold mb-3">Metrik Testing</h4>
                            <div className="grid grid-cols-3 gap-3">
                              <div className="text-center p-2 bg-emerald-50 rounded">
                                <p className="text-xs text-gray-500">MAE</p>
                                <p className="font-bold text-emerald-700">{modelInfo.regression.metrics.test_mae?.toFixed(3) || 'N/A'}</p>
                              </div>
                              <div className="text-center p-2 bg-emerald-50 rounded">
                                <p className="text-xs text-gray-500">RMSE</p>
                                <p className="font-bold text-emerald-700">{modelInfo.regression.metrics.test_rmse?.toFixed(3) || 'N/A'}</p>
                              </div>
                              <div className="text-center p-2 bg-emerald-50 rounded">
                                <p className="text-xs text-gray-500">R²</p>
                                <p className="font-bold text-emerald-700">{modelInfo.regression.metrics.test_r2?.toFixed(3) || 'N/A'}</p>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500">Tidak ada informasi model tersedia</p>
                  )}
                </Card>

                {/* NLP Model */}
                <Card className="p-6">
                  <h3 className="text-lg font-bold mb-4">Model NLP</h3>
                  {modelInfo?.nlp ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500">Versi</p>
                          <p className="font-bold">{modelInfo.nlp.version}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500">Tipe</p>
                          <p className="font-bold">{modelInfo.nlp.type}</p>
                        </div>
                      </div>
                      
                      <div className="border-t pt-4">
                        <h4 className="font-semibold mb-3">Kemampuan</h4>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">Klasifikasi</Badge>
                          <Badge variant="outline">NER</Badge>
                          <Badge variant="outline">Ringkasan</Badge>
                          <Badge variant="outline">Sentimen</Badge>
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <h4 className="font-semibold mb-3">Status</h4>
                        <Badge className={modelInfo.nlp.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                          {modelInfo.nlp.status}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">Tidak ada informasi model tersedia</p>
                  )}
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Report Detail Modal */}
      {showReportModal && selectedReport && (
        <ReportDetailModal
          report={selectedReport as any}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}
