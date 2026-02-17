'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Brain, Activity, TrendingUp, AlertTriangle, Clock, RefreshCw, 
  Play, Download, Database, Cpu, BarChart3, PieChart,
  AlertCircle, CheckCircle2, XCircle, Zap, Target, FileText,
  Loader2, Search, Sparkles, Gauge, Lightbulb,
  ChevronDown, ChevronUp, ArrowRight, Box, Layout
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ReportDetailModal } from '@/components/dashboard/ReportDetailModal';
import { ReportAnalysisTable } from './ReportAnalysisTable';

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
  root_cause?: string;
  action_taken?: string;
  photo_url?: string;
  flightNumber?: string;
}

interface RootCauseStats {
  total_records: number;
  classified: number;
  unknown: number;
  classification_rate: number;
  by_category: Record<string, {
    count: number;
    percentage: number;
    top_issue_categories: Record<string, number>;
    top_areas: Record<string, number>;
    top_airlines: Record<string, number>;
    description: string;
  }>;
  top_categories: Array<[string, any]>;
}

interface RootCauseMetadata {
  [category: string]: {
    name: string;
    description: string;
    keyword_count: number;
    severity_multiplier: number;
  };
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

const ReportsTable = ({ 
  title, 
  icon: Icon, 
  data, 
  page, 
  setPage, 
  rowsPerPage = 10 
}: { 
  title: string;
  icon: any;
  data: any[];
  page: number;
  setPage: (p: number | ((prev: number) => number)) => void;
  rowsPerPage?: number;
}) => (
  <Card className="p-6">
    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
       <Icon className="w-5 h-5 text-gray-500" />
       {title} ({data.length})
    </h3>
    
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 text-gray-600 font-medium border-b">
          <tr>
            <th className="px-4 py-3">Tanggal</th>
            <th className="px-4 py-3">Penerbangan</th>
            <th className="px-4 py-3">Rute</th>
            <th className="px-4 py-3">Deskripsi</th>
            <th className="px-4 py-3">Prediksi</th>
            <th className="px-4 py-3">Keparahan</th>
            <th className="px-4 py-3">Sentimen</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data
            .slice((page - 1) * rowsPerPage, page * rowsPerPage)
            .map((result: any, idx: number) => (
            <tr key={idx} className="hover:bg-gray-50/50">
              <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                {result.originalData.date ? new Date(result.originalData.date).toLocaleDateString('id-ID', {
                  day: 'numeric', month: 'short', year: 'numeric'
                }) : '-'}
              </td>
              <td className="px-4 py-3 font-medium">
                {result.originalData.flightNumber ? (
                  <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">
                    {result.originalData.flightNumber}
                  </span>
                ) : (
                  <span className="text-gray-400 text-xs text-center block">-</span>
                )}
              </td>
              <td className="px-4 py-3 text-gray-600">
                {result.originalData.route || '-'}
              </td>
              <td className="px-4 py-3 text-gray-600 max-w-[250px] truncate" title={result.originalData.report}>
                {result.originalData.report || result.originalData.issueType || '-'}
              </td>
              <td className="px-4 py-3">
                <span className={cn(
                  "font-medium",
                  result.prediction?.predictedDays > 3 ? "text-red-700" : "text-emerald-700"
                )}>
                  {result.prediction?.predictedDays?.toFixed(1)} hari
                </span>
              </td>
              <td className="px-4 py-3">
                <Badge className={getSeverityColor(result.classification?.severity)}>
                  {translateSeverity(result.classification?.severity)}
                </Badge>
              </td>
              <td className="px-4 py-3">
                {result.sentiment?.sentiment ? (
                  <Badge variant="outline" className={cn(
                    result.sentiment.sentiment.includes('Positive') ? "text-green-600 border-green-200 bg-green-50" :
                    result.sentiment.sentiment.includes('Negative') ? "text-red-600 border-red-200 bg-red-50" :
                    "text-gray-600 bg-gray-50"
                  )}>
                    {result.sentiment.sentiment}
                  </Badge>
                ) : (
                  <span className="text-xs text-gray-400">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Pagination */}
    {data.length > rowsPerPage && (
      <div className="flex justify-between items-center mt-4 pt-4 border-t">
        <span className="text-sm text-gray-500">
          Menampilkan {(page - 1) * rowsPerPage + 1} - {Math.min(page * rowsPerPage, data.length)} dari {data.length}
        </span>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="px-3 py-1 h-8"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronDown className="rotate-90 w-4 h-4" />
          </Button>
          <Button 
            variant="outline"
            className="px-3 py-1 h-8" 
            onClick={() => setPage(p => Math.min(Math.ceil(data.length / rowsPerPage), p + 1))}
            disabled={page >= Math.ceil(data.length / rowsPerPage)}
          >
            <ChevronDown className="rotate-270 w-4 h-4" />
          </Button>
        </div>
      </div>
    )}
  </Card>
);

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
  const [summaries, setSummaries] = useState<any>({ cgo: null, nonCargo: null });
  const [rootCauseStats, setRootCauseStats] = useState<RootCauseStats | null>(null);
  const [rootCauseMetadata, setRootCauseMetadata] = useState<RootCauseMetadata | null>(null);
  const [loadingRootCause, setLoadingRootCause] = useState(false);
  
  // Independent pagination states
  const [nonCargoPage, setNonCargoPage] = useState(1);
  const [cgoPage, setCgoPage] = useState(1);
  
  const resultsPerPage = 10;

  // Fetch initial data
  useEffect(() => {
    fetchHealthStatus();
    fetchModelInfo();
    fetchReports();
    fetchSummaries();
    fetchRootCauseStats();
  }, []);

  const fetchRootCauseStats = async () => {
    setLoadingRootCause(true);
    try {
      const [statsRes, metaRes] = await Promise.all([
        fetch('/api/ai/root-cause/stats'),
        fetch('/api/ai/root-cause/categories')
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setRootCauseStats(data);
      }
      
      if (metaRes.ok) {
        const meta = await metaRes.json();
        setRootCauseMetadata(meta);
      }
    } catch (err) {
      console.error('Failed to fetch Root Cause stats:', err);
    } finally {
      setLoadingRootCause(false);
    }
  };

  const fetchSummaries = async () => {
    try {
      const [cgoRes, nonCargoRes] = await Promise.all([
        fetch('/api/ai/summarize?category=cgo'),
        fetch('/api/ai/summarize?category=non_cargo')
      ]);
      
      const [cgo, nonCargo] = await Promise.all([
        cgoRes.ok ? cgoRes.json() : null,
        nonCargoRes.ok ? nonCargoRes.json() : null
      ]);
      
      setSummaries({ cgo, nonCargo });
    } catch (err) {
      console.error('Failed to fetch AI summaries:', err);
    }
  };

  const fetchHealthStatus = async () => {
    try {
      const res = await fetch('/api/ai/health');
      if (res.ok) {
        const data = await res.json();
        setHealthStatus(data);
      }
    } catch (err) {
      // Error handled silently or via state
    }
  };

  const fetchModelInfo = async () => {
    try {
      const res = await fetch('/api/ai/model-info');
      if (res.ok) {
        const data = await res.json();
        setModelInfo(data);
      }
    } catch (err) {
      // Error handled silently or via state
    }
  };

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/admin/reports');
      if (res.ok) {
        const data = await res.json();
        setReports(Array.isArray(data) ? data : []);
      } else {
        setError('Gagal mengambil data laporan dari server');
      }
    } catch (err) {
      setError('Error mengambil data laporan');
    }
  };

  const analyzeSingleReport = async (report: AIReport) => {
    setLoading(prev => ({ ...prev, single: true }));
    setError(null);
    
    // Map the report data properly
    const reportData = {
      Date_of_Event: report.created_at || new Date().toISOString(),
      Airlines: report.airlines || 'Unknown',
      Flight_Number: report.flightNumber || 'N/A',
      Branch: report.branch || 'Unknown',
      HUB: report.hub || 'Unknown',
      Irregularity_Complain_Category: report.main_category || 'Unknown',
      Report: report.description || '',
      Root_Caused: report.root_cause || '',
      Action_Taken: report.action_taken || '',
      Area: report.branch || 'Unknown',
      Status: report.status || 'Open',
      Upload_Irregularity_Photo: report.photo_url || ''
    };

    try {
      // Basic AI service URL building helper
      const buildQuery = (params: Record<string, string | number | undefined>) => {
        const q = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== null) q.set(k, String(v));
        });
        return q.toString();
      };

      // Define our parallel tasks
      const analysisPromise = fetch('/api/ai/analyze', {
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
      }).then(res => res.ok ? res.json() : Promise.reject('Main analysis failed'));

      // Similar Reports
      const similarPromise = fetch(`/api/ai/similar?${buildQuery({
        text: reportData.Report,
        top_k: 5
      })}`, { method: 'POST' }).then(res => res.ok ? res.json() : null);

      // Root Cause Classification (if root cause text provided)
      const classifyPromise = reportData.Root_Caused 
        ? fetch(`/api/ai/root-cause/classify?${buildQuery({
            root_cause: reportData.Root_Caused,
            report: reportData.Report,
            area: reportData.Area,
            category: reportData.Irregularity_Complain_Category
          })}`, { method: 'POST' }).then(res => res.ok ? res.json() : null)
        : Promise.resolve(null);

      const [analysis, similarReports, classification] = await Promise.all([
        analysisPromise,
        similarPromise,
        classifyPromise
      ]);
      
      setSingleAnalysis({ 
        report, 
        analysis, 
        similarReports,
        classification
      });
      
    } catch (err) {
      console.error('Analysis failed:', err);
      setError('Gagal menganalisis laporan secara lengkap. Beberapa fitur AI mungkin tidak tersedia.');
      // Attempt to salvage what we have if main analysis succeeded but others failed
      // (Handled by the logic above where failed optional steps return null)
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
        setBatchResults(data);
        setNonCargoPage(1);
        setCgoPage(1);
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        setError(errorData.error || `Error ${res.status}: AI service tidak tersedia`);
      }
    } catch (err) {
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
                { id: 'root-cause', label: 'Root Cause' },
                { id: 'single', label: 'Analisis Individual' },
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
                  <Card className="p-6 lg:col-span-2">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-amber-500" />
                      Aksi Cepat
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      <Button 
                        className="flex-1 min-w-[200px] justify-start" 
                        onClick={() => setActiveTab('batch')}
                      >
                        <Play size={18} className="mr-2" />
                        Analisis Semua Laporan
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-1 min-w-[200px] justify-start"
                        onClick={() => setActiveTab('single')}
                      >
                        <Search size={18} className="mr-2" />
                        Analisis Laporan Spesifik
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-1 min-w-[200px] justify-start"
                        onClick={triggerRetraining}
                        disabled={loading.train}
                      >
                        {loading.train ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Sparkles size={18} className="mr-2" />}
                        Pelatihan Ulang Model
                      </Button>
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

                {/* AI Category Summaries (CGO & Non-Cargo) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {summaries.nonCargo && (
                    <Card className="p-6 bg-emerald-50/10 border-emerald-100">
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-emerald-500" />
                        Ringkasan Landside & Airside
                      </h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 bg-white/50 rounded border border-emerald-100/50">
                            <p className="text-[10px] text-emerald-600 font-bold uppercase">Total Laporan</p>
                            <p className="text-lg font-bold text-gray-900">{summaries.nonCargo.summary?.total_records || 0}</p>
                          </div>
                          <div className="p-2 bg-white/50 rounded border border-emerald-100/50">
                            <p className="text-[10px] text-emerald-600 font-bold uppercase">Critical/High</p>
                            <p className="text-lg font-bold text-gray-900">{summaries.nonCargo.summary?.critical_high_percentage || 0}%</p>
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-[10px] text-emerald-600 font-bold uppercase mb-2">Top Kategori</p>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(summaries.nonCargo.summary?.top_categories || {})
                              .filter(([key]) => key !== "")
                              .slice(0, 3)
                              .map(([category, count], i) => (
                                <Badge key={i} variant="outline" className="bg-white/50 text-[10px]">
                                  {category}: {count as number}
                                </Badge>
                              ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] text-emerald-600 font-bold uppercase mb-2">Top Maskapai</p>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(summaries.nonCargo.summary?.top_airlines || {})
                              .slice(0, 3)
                              .map(([airline, count], i) => (
                                <Badge key={i} variant="outline" className="bg-white/50 text-[10px]">
                                  {airline}: {count as number}
                                </Badge>
                              ))}
                          </div>
                        </div>
                      </div>
                    </Card>
                  )}

                  {summaries.cgo && (
                    <Card className="p-6 bg-blue-50/10 border-blue-100">
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Database className="w-5 h-5 text-blue-500" />
                        Ringkasan Cargo (CGO)
                      </h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 bg-white/50 rounded border border-blue-100/50">
                            <p className="text-[10px] text-blue-600 font-bold uppercase">Total Laporan</p>
                            <p className="text-lg font-bold text-gray-900">{summaries.cgo.summary?.total_records || 0}</p>
                          </div>
                          <div className="p-2 bg-white/50 rounded border border-blue-100/50">
                            <p className="text-[10px] text-blue-600 font-bold uppercase">Critical/High</p>
                            <p className="text-lg font-bold text-gray-900">{summaries.cgo.summary?.critical_high_percentage || 0}%</p>
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] text-blue-600 font-bold uppercase mb-2">Top Kategori</p>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(summaries.cgo.summary?.top_categories || {})
                              .filter(([key]) => key !== "")
                              .slice(0, 3)
                              .map(([category, count], i) => (
                                <Badge key={i} variant="outline" className="bg-white/50 text-[10px]">
                                  {category}: {count as number}
                                </Badge>
                              ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] text-blue-600 font-bold uppercase mb-2">Top Maskapai</p>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(summaries.cgo.summary?.top_airlines || {})
                              .slice(0, 3)
                              .map(([airline, count], i) => (
                                <Badge key={i} variant="outline" className="bg-white/50 text-[10px]">
                                  {airline}: {count as number}
                                </Badge>
                              ))}
                          </div>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
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

                {/* Split Tables */}
                {batchResults && batchResults.results && batchResults.results.length > 0 && (
                  <div className="space-y-6">
                    {/* Non-Cargo Table */}
                    <ReportsTable
                      title="Laporan Landside & Airside (Non-Cargo)"
                      icon={FileText}
                      data={batchResults.results.filter((r: any) => r.sourceSheet.includes('NON CARGO'))}
                      page={nonCargoPage}
                      setPage={setNonCargoPage}
                      rowsPerPage={resultsPerPage}
                    />

                    {/* CGO Table */}
                    <ReportsTable
                      title="Laporan Cargo (CGO)"
                      icon={Database}
                      data={batchResults.results.filter((r: any) => r.sourceSheet.includes('CGO'))}
                      page={cgoPage}
                      setPage={setCgoPage}
                      rowsPerPage={resultsPerPage}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Root Cause Analysis Tab */}
            {activeTab === 'root-cause' && (
              <div className="space-y-6">
                {loadingRootCause ? (
                  <div className="flex flex-col items-center justify-center py-24 text-gray-500">
                    <Loader2 size={48} className="animate-spin mb-4 opacity-20" />
                    <p className="animate-pulse">Menganalisis statistik root cause...</p>
                  </div>
                ) : rootCauseStats ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-6"
                  >
                    {/* Header Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <StatCard
                        title="Total Records"
                        value={rootCauseStats.total_records}
                        icon={Database}
                        color="bg-blue-500"
                      />
                      <StatCard
                        title="Classified"
                        value={rootCauseStats.classified}
                        subtitle={`${rootCauseStats.classification_rate}% dari total`}
                        icon={CheckCircle2}
                        color="bg-emerald-500"
                      />
                      <StatCard
                        title="Unknown"
                        value={rootCauseStats.unknown}
                        icon={XCircle}
                        color="bg-gray-400"
                      />
                      <StatCard
                        title="Top Category"
                        value={rootCauseStats.top_categories[0]?.[0] || 'N/A'}
                        subtitle={`${rootCauseStats.top_categories[0]?.[1]?.count || 0} kejadian`}
                        icon={Activity}
                        color="bg-purple-500"
                      />
                    </div>

                    {/* Detailed Category Cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {rootCauseStats.top_categories.map(([category, details]: any) => (
                        <Card key={category} className="group overflow-hidden flex flex-col border-emerald-100/30 hover:shadow-md transition-all duration-300">
                          {/* Premium Header */}
                          <div className="p-5 bg-gradient-to-r from-gray-50/80 to-white border-b border-gray-100 flex justify-between items-start gap-4">
                            <div className="flex-1 space-y-1.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="font-bold text-gray-900 text-lg tracking-tight leading-tight">{category}</h4>
                                {rootCauseMetadata?.[category] && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[10px] font-bold border border-emerald-100/50">
                                      <TrendingUp size={10} strokeWidth={3} />
                                      x{rootCauseMetadata[category].severity_multiplier} RISK
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 text-[10px] font-bold border border-blue-100/50">
                                      <Cpu size={10} strokeWidth={3} />
                                      {rootCauseMetadata[category].keyword_count} KEYS
                                    </span>
                                  </div>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 leading-relaxed font-medium opacity-80">{details.description}</p>
                            </div>
                            
                            <div className="flex flex-col items-end shrink-0">
                              <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black text-emerald-600 tracking-tighter">{details.count}</span>
                              </div>
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{details.percentage}%</span>
                            </div>
                          </div>

                          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 bg-white">
                            {/* Issues Breakdown */}
                            <div className="space-y-4">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] flex items-center gap-2 opacity-70">
                                <AlertTriangle size={12} className="text-orange-500" strokeWidth={2.5} />
                                Critical Issues
                              </p>
                              <div className="space-y-2">
                                {Object.entries(details.top_issue_categories)
                                  .filter(([name]) => name !== "")
                                  .slice(0, 3)
                                  .map(([name, count]: any) => (
                                    <div key={name} className="group/item flex justify-between items-center transition-all">
                                      <span className="text-xs font-semibold text-gray-600 truncate mr-2" title={name}>
                                        {name}
                                      </span>
                                      <span className="text-[11px] font-bold text-gray-400 group-hover/item:text-emerald-600 transition-colors tabular-nums">{count}</span>
                                    </div>
                                  ))}
                              </div>
                            </div>

                            {/* Area Breakdown */}
                            <div className="space-y-4 border-l border-gray-100 pl-6">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] flex items-center gap-2 opacity-70">
                                <Layout size={12} className="text-blue-500" strokeWidth={2.5} />
                                Top Locations
                              </p>
                              <div className="space-y-2">
                                {Object.entries(details.top_areas)
                                  .slice(0, 3)
                                  .map(([name, count]: any) => (
                                    <div key={name} className="group/item flex justify-between items-center transition-all">
                                      <span className="text-xs font-semibold text-gray-600 truncate mr-2">
                                        {name}
                                      </span>
                                      <span className="text-[11px] font-bold text-gray-400 group-hover/item:text-blue-600 transition-colors tabular-nums">{count}</span>
                                    </div>
                                  ))}
                              </div>
                            </div>

                            {/* Airline Breakdown */}
                            <div className="space-y-4 border-l border-gray-100 pl-6">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] flex items-center gap-2 opacity-70">
                                <Box size={12} className="text-purple-500" strokeWidth={2.5} />
                                Key Carriers
                              </p>
                              <div className="space-y-2">
                                {Object.entries(details.top_airlines)
                                  .slice(0, 3)
                                  .map(([name, count]: any) => (
                                    <div key={name} className="group/item flex justify-between items-center transition-all">
                                      <span className="text-xs font-semibold text-gray-600 truncate mr-2">
                                        {name}
                                      </span>
                                      <span className="text-[11px] font-bold text-gray-400 group-hover/item:text-purple-600 transition-colors tabular-nums">{count}</span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <div className="text-center py-24 text-gray-500">
                    <Brain size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Statistik root cause tidak dapat dimuat atau belum dihitung.</p>
                  </div>
                )}
              </div>
            )}
            {/* Single Analysis Tab */}
            {activeTab === 'single' && (
              <ReportAnalysisTable
                title="Analisis Laporan Individual"
                reports={reports}
                onAnalyze={(report) => handleReportSelect(report.id)}
                analysisResult={singleAnalysis}
                analyzing={loading.single || false}
                selectedId={selectedReportId}
                className="min-h-[600px]"
              />
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
