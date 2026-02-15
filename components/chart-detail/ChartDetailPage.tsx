'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, X, Loader2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { saveAs } from 'file-saver';
import { Download, FileText, Link as LinkIcon, Check } from 'lucide-react';
import type { DashboardTile, QueryResult } from '@/types/builder';
import { EnlargedChart } from './EnlargedChart';
import { DataTableWithPagination } from './DataTableWithPagination';
import { AIInsightsPanel } from './AIInsightsPanel';
import { SummaryCards } from './SummaryCards';
import { SupportingCharts } from './SupportingCharts';

interface ChartDetailData {
  tile: DashboardTile;
  result: QueryResult;
  dashboardId?: string;
}

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
    visualization: DashboardTile['visualization'];
    query: DashboardTile['query'];
    explanation: string;
  }>;
}

// Helper to format chart type for AI context
const formatChartType = (type: string) => {
  return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export default function ChartDetailPage() {
  const router = useRouter();
  const [data, setData] = useState<ChartDetailData | null>(null);
  const [insights, setInsights] = useState<AIInsight | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [supportingData, setSupportingData] = useState<Record<number, QueryResult>>({});
  const [fullData, setFullData] = useState<QueryResult | null>(null);
  const [copied, setCopied] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  const fetchFullData = useCallback(async (tile: DashboardTile): Promise<QueryResult> => {
    try {
      // Normalize query before sending
      const normalizedQuery = {
        ...tile.query,
        dimensions: tile.query.dimensions || [],
        measures: tile.query.measures || [],
        filters: tile.query.filters || [],
        joins: tile.query.joins || [],
        sorts: tile.query.sorts || [],
        limit: 100000 // Unlimited
      };

      const response = await fetch('/api/dashboards/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: normalizedQuery
        })
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Failed to fetch full data:', error);
    }
    
    // Fallback to stored data
    return data?.result || { columns: [], rows: [], rowCount: 0, executionTimeMs: 0 };
  }, [data?.result]);

  const generateInsights = useCallback(async (detailData: ChartDetailData): Promise<AIInsight | null> => {
    setInsightsLoading(true);
    try {
      // Calculate statistics
      const result = detailData.result;
      
      // Determine metric column safely
      const viz = detailData.tile.visualization;
      // 1. explicit metric
      let metricCol = viz.colorField;
      
      // 2. or find first numeric column that isn't an axis
      if (!metricCol && result.rows.length > 0) {
        const x = viz.xAxis;
        const y = Array.isArray(viz.yAxis) ? viz.yAxis : [viz.yAxis];
        metricCol = result.columns.find(c => 
          c !== x && 
          !y.includes(c) && 
          (typeof result.rows[0][c] === 'number' || (!isNaN(Number(result.rows[0][c])) && result.rows[0][c] !== ''))
        );
      }
      
      // 3. fallback to last column
      if (!metricCol) {
        metricCol = result.columns[result.columns.length - 1];
      }

      const values = result.rows.map((row: Record<string, unknown>) => {
        const val = Number(row[metricCol!]);
        return isNaN(val) ? 0 : val;
      });
      
      const total = values.reduce((a, b) => a + b, 0);
      const avg = total / values.length || 0;
      const max = Math.max(...values);
      const min = Math.min(...values);
      
      // Clear previous insights and set loading
      setInsights(null);
      setInsightsLoading(true);

      const response = await fetch('/api/dashboards/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chartTitle: detailData.tile.visualization.title,
          chartType: detailData.tile.visualization.chartType,
          dashboardId: detailData.dashboardId,
          tileId: detailData.tile.id,
          totalRows: result.rows.length,
          dataSample: result.rows.slice(0, 100), // Increase sample for better context
          statistics: {
            total,
            average: avg,
            maximum: max,
            minimum: min,
            variance: max - min, // Add range/variance context
            rowCount: result.rows.length
          },
          context: `Berikan analisis SANGAT MENDALAM untuk ${formatChartType(detailData.tile.visualization.chartType)} berjudul "${detailData.tile.visualization.title}". 
          Gunakan pendekatan data storytelling. Hubungkan total volume (${total.toLocaleString('id-ID')}) dengan rata-rata (${avg.toLocaleString('id-ID')}). 
          Identifikasi siapa atau apa yang menjadi penyumbang terbesar (Pareto) dan berikan rekomendasi strategis tanpa batasan panjang analisis.`
        })
      });

      const responseData = await response.json();
      
      if (response.ok && responseData.insights) {
        const insights = responseData.insights as AIInsight;
        
        // Fetch data for supporting charts if any
        if (insights.supportingCharts && insights.supportingCharts.length > 0) {
          const suppPromises = insights.supportingCharts.map(async (sc, idx) => {
            try {
              // CRITICAL FIX: Merge filters from the main tile to ensure data consistency
              // This ensures AI charts respect the same Date Range, Status, etc. as the main chart
              const parentFilters = detailData.tile.query.filters || [];
              const aiFilters = sc.query.filters || [];
              
              // Deduplicate filters based on field and operator
              const mergedFilters = [...aiFilters];
              parentFilters.forEach(pf => {
                const exists = mergedFilters.some(af => af.field === pf.field && af.operator === pf.operator);
                if (!exists) {
                  mergedFilters.push(pf);
                }
              });

              const mergedQuery = {
                ...sc.query,
                filters: mergedFilters
              };

              const res = await fetch('/api/dashboards/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: mergedQuery })
              });
              if (res.ok) {
                const result = await res.json();
                return { idx, result };
              }
            } catch (e) {
              console.error(`Failed to fetch supporting chart ${idx}:`, e);
            }
            return null;
          });

          const results = await Promise.all(suppPromises);
          const newDataMap: Record<number, QueryResult> = {};
          results.forEach(r => {
            if (r) newDataMap[r.idx] = r.result;
          });
          setSupportingData(newDataMap);
        }

        return insights;
      } else if (responseData.fallback) {
        console.warn('Using fallback insights due to API error:', responseData.error);
        return responseData.fallback;
      }
    } catch (error) {
      console.error('Failed to generate insights:', error);
      // Fallback insights structure
      return {
        ringkasan: "Tidak dapat memuat analisis AI saat ini. Silakan coba beberapa saat lagi.",
        temuanUtama: [
          "Data visualisasi telah berhasil dimuat.",
          "Analisis mendalam membutuhkan koneksi ke layanan AI.", 
          "Periksa koneksi internet Anda."
        ],
        tren: [],
        rekomendasi: ["Lakukan analisis manual berdasarkan data tabel."],
        anomali: [],
        kesimpulan: "Data tabel tersedia untuk direview secara manual."
      };
    } finally {
      setInsightsLoading(false);
    }
    
    return null;
  }, []);

  const handleDownloadImage = async () => {
    if (chartRef.current) {
      try {
        const dataUrl = await toPng(chartRef.current, { cacheBust: true, backgroundColor: '#ffffff' });
        saveAs(dataUrl, `${data?.tile.visualization.title || 'chart'}.png`);
      } catch (err) {
        console.error('Failed to download image', err);
      }
    }
  };

  const handleExportCSV = () => {
    const displayData = fullData || data?.result;
    if (!displayData) return;
    
    const headers = displayData.columns.join(',');
    const rows = displayData.rows.map(row => 
      displayData.columns.map(col => {
        const cell = row[col];
        return typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell;
      }).join(',')
    ).join('\n');
    
    const csvContent = `${headers}\n${rows}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${data?.tile.visualization.title || 'data'}.csv`);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    // Get data from sessionStorage
    const storedData = sessionStorage.getItem('chartDetailData');
    if (storedData) {
      const parsed = JSON.parse(storedData) as ChartDetailData;
      setData(parsed);
    } else {
      // Redirect back if no data
      router.back();
    }
  }, [router]);

  // Separate effect for data-dependent operations
  useEffect(() => {
    if (data) {
      // Fetch full data (unlimited)
      fetchFullData(data.tile).then(setFullData);
      
      // Generate AI insights
      generateInsights(data).then(setInsights);
    }
  }, [data, fetchFullData, generateInsights]);

  if (!data) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#6b8e3d]" />
      </div>
    );
  }

  const displayData = fullData || data.result;
  const tile = data.tile;

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Header */}
      <header className="bg-white border-b border-[#e0e0e0] sticky top-0 z-50 w-full">
        <div className="w-full px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-[#666] hover:text-[#6b8e3d] transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="text-sm font-medium">Kembali ke Dashboard</span>
            </button>
            
            <div className="h-6 w-px bg-[#e0e0e0]" />
            
            <h1 className="text-lg font-bold text-[#333]">
              {tile.visualization.title}
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="p-2 hover:bg-[#f5f5f5] rounded-full transition-colors text-[#666] tooltip"
              title="Copy Link"
            >
              {copied ? <Check size={20} className="text-green-600" /> : <LinkIcon size={20} />}
            </button>
            <button
              onClick={handleExportCSV}
              className="p-2 hover:bg-[#f5f5f5] rounded-full transition-colors text-[#666]"
              title="Export CSV"
            >
              <FileText size={20} />
            </button>
            <button
              onClick={handleDownloadImage}
              className="p-2 hover:bg-[#f5f5f5] rounded-full transition-colors text-[#666]"
              title="Download PNG"
            >
              <Download size={20} />
            </button>
            <div className="h-6 w-px bg-[#e0e0e0] mx-2" />
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-[#f5f5f5] rounded-full transition-colors"
            >
              <X size={20} className="text-[#666]" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-6 py-6 font-sans">
        {/* Summary Cards */}
        <SummaryCards data={displayData} />

        {/* Chart Section */}
        <section ref={chartRef} className="bg-white rounded-xl shadow-sm border border-[#e0e0e0] p-6 mb-6 overflow-hidden">
          <h2 className="text-sm font-semibold text-[#6b8e3d] mb-4 uppercase tracking-wide">
            Visualisasi Data
          </h2>
          <div className="w-full">
            <EnlargedChart 
              tile={tile} 
              result={displayData}
            />
          </div>
        </section>


        {/* Data and Insights Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* Main Data Column */}
          <div className="space-y-6">
            {/* Supporting Charts / AI Mini-Dashboard */}
            {insights?.supportingCharts && insights.supportingCharts.length > 0 && (
              <SupportingCharts 
                charts={insights.supportingCharts}
                dataMap={supportingData}
                loading={insightsLoading}
              />
            )}

            {/* Data Table */}
            <section className="bg-white rounded-xl shadow-sm border border-[#e0e0e0] overflow-hidden">
              <DataTableWithPagination 
                data={displayData}
                title={tile.visualization.title || 'Chart Data'}
              />
            </section>
          </div>

          {/* AI Insights Sidebar */}
          <section className="bg-white rounded-xl shadow-sm border border-[#e0e0e0] overflow-hidden">
            <AIInsightsPanel 
              insights={insights}
              loading={insightsLoading}
            />
          </section>
        </div>
      </main>
    </div>
  );
}
