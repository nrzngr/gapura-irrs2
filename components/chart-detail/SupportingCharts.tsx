'use client';

import React from 'react';
import { ChartPreview } from '@/components/builder/ChartPreview';
import { Info } from 'lucide-react';
import type { DashboardTile, QueryResult } from '@/types/builder';

interface SupportingChart {
  visualization: DashboardTile['visualization'];
  query: DashboardTile['query'];
  explanation: string;
}

interface SupportingChartsProps {
  charts: SupportingChart[];
  dataMap: Record<number, QueryResult>;
  loading: boolean;
}

function safeRender(value: any): React.ReactNode {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    return value.label || value.text || JSON.stringify(value);
  }
  return String(value);
}

// Calculate dynamic height based on chart type and data
// For supporting charts, we use fixed heights to prevent overflow
function calculateChartHeight(chartType: string, rowCount: number): string {
  switch (chartType) {
    case 'horizontal_bar':
      // Horizontal bars need more height per item
      const barHeight = Math.max(rowCount * 38 + 70, 220);
      return `${Math.min(barHeight, 450)}px`; // Increased cap to 450px
    case 'pie':
    case 'donut':
      return '240px'; // Slightly increased for better label visibility
    case 'bar':
    case 'line':
    case 'area':
    case 'heatmap':
      return '220px';
    default:
      return '220px';
  }
}

export function SupportingCharts({ charts, dataMap, loading }: SupportingChartsProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-3 bg-slate-200 rounded-full animate-pulse" />
          <div className="w-24 h-3 bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-[#e0e0e0] h-[280px] animate-pulse flex flex-col">
              <div className="px-4 py-3 border-b border-[#f0f0f0] flex justify-between">
                <div className="w-32 h-3 bg-slate-100 rounded" />
                <div className="w-1.5 h-1.5 rounded-full bg-slate-100" />
              </div>
              <div className="flex-1 p-4 flex items-end gap-2">
                <div className="w-full bg-slate-50 rounded-t h-[40%]" />
                <div className="w-full bg-slate-50 rounded-t h-[70%]" />
                <div className="w-full bg-slate-50 rounded-t h-[55%]" />
                <div className="w-full bg-slate-50 rounded-t h-[90%]" />
              </div>
              <div className="px-4 py-3 bg-[#fcfcfc] border-t border-[#f0f0f0]">
                <div className="w-full h-2 bg-slate-50 rounded mb-1" />
                <div className="w-2/3 h-2 bg-slate-50 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!charts || charts.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-1 h-3 bg-[#6b8e3d] rounded-full" />
        <h3 className="text-[10px] font-bold text-[#6b8e3d] uppercase tracking-[0.1em]">
          Eksplorasi Pendukung
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {charts.map((chart, idx) => {
          const result = dataMap[idx];
          
          // Calculate dynamic height
          const chartHeight = calculateChartHeight(
            chart.visualization.chartType || 'bar',
            result?.rowCount || result?.rows?.length || 0
          );

          // Handle missing data/error state
          if (!result && !loading) {
            return (
              <div 
                key={idx} 
                className="bg-white rounded-xl border border-red-100 flex flex-col overflow-hidden min-h-[280px] justify-center items-center p-6 text-center"
              >
                <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center mb-3">
                  <Info className="w-5 h-5 text-red-400" />
                </div>
                <h4 className="text-[11px] font-bold text-slate-700 uppercase mb-1">Gagal Memuat Chart</h4>
                <p className="text-[10px] text-slate-400">Terjadi kesalahan saat mengambil data untuk visualisasi ini.</p>
              </div>
            );
          }

          if (chart.visualization.chartType === 'kpi') {
            const rawY = chart.visualization.yAxis;
            const rawYArray = Array.isArray(rawY) ? rawY : (rawY ? [String(rawY)] : []);
            
            // Try to find the best key for KPI value
            let yKey = '';
            
            // 1. Exact match
            const exactMatch = rawYArray.find(y => result.columns.includes(y));
            if (exactMatch) {
              yKey = exactMatch;
            } else {
              // 2. Fuzzy match
              const targetY = rawYArray[0] || '';
              const normalizedTarget = targetY.toLowerCase().replace(/[_\s]/g, '');
              const matches = result.columns.map(c => {
                const normalizedC = c.toLowerCase().replace(/[_\s]/g, '');
                let score = 0;
                if (normalizedC === normalizedTarget) score = 100;
                else if (normalizedC.includes(normalizedTarget) || normalizedTarget.includes(normalizedC)) score = 50;
                if (normalizedC.includes('total') || normalizedC.includes('count') || normalizedC.includes('jumlah')) score += 10;
                return { col: c, score };
              }).filter(m => m.score > 0).sort((a, b) => b.score - a.score);
              
              if (matches.length > 0) {
                yKey = matches[0].col;
              } else {
                // 3. Fallback to first numeric column
                const firstNumeric = result.columns.find(c => {
                  const val = result.rows[0]?.[c];
                  return typeof val === 'number' || (typeof val === 'string' && !isNaN(Number(val)));
                });
                yKey = firstNumeric || result.columns[result.columns.length - 1];
              }
            }

            const value = Number(result.rows[0]?.[yKey]) || 0;

            return (
              <div 
                key={idx} 
                className="bg-white rounded-xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-[#e0e0e0] flex flex-col overflow-hidden transition-all hover:shadow-[0_4px_15px_-4px_rgba(0,0,0,0.1)] hover:border-[#6b8e3d]/30"
              >
                <div className="px-4 py-3 border-b border-[#f0f0f0] flex items-center justify-between">
                  <h4 className="text-[11px] font-bold text-[#333] uppercase tracking-tight">
                    {chart.visualization.title}
                  </h4>
                  <div className="w-1.5 h-1.5 rounded-full bg-[#6b8e3d]" />
                </div>
                
                <div className="p-6 flex flex-col justify-center items-center min-h-[200px] text-center">
                  <span className="text-4xl font-black text-[#333] tracking-tighter">
                    {value.toLocaleString('id-ID')}
                  </span>
                  <span className="text-[10px] font-medium text-[#999] mt-2 uppercase">Total Terkumpul</span>
                </div>
                {chart.explanation && (
                  <div className="px-4 py-3 bg-[#fcfcfc] border-t border-[#f0f0f0] flex gap-2.5 items-start">
                    <Info className="w-3.5 h-3.5 text-[#6b8e3d] mt-0.5 flex-shrink-0" />
                    <p className="text-[10px] text-[#777] leading-relaxed italic">
                      {safeRender(chart.explanation)}
                    </p>
                  </div>
                )}
              </div>
            );
          }

          return (
            <div 
              key={idx} 
              className="bg-white rounded-xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-[#e0e0e0] flex flex-col overflow-hidden transition-all hover:shadow-[0_4px_15px_-4px_rgba(0,0,0,0.1)] hover:border-[#6b8e3d]/30 h-auto"
            >
              <div className="px-4 py-3 border-b border-[#f0f0f0] flex items-center justify-between">
                <h4 className="text-[11px] font-bold text-[#333] uppercase tracking-tight">
                  {chart.visualization.title}
                </h4>
                <div className="w-1.5 h-1.5 rounded-full bg-[#6b8e3d]" />
              </div>
              
              <div 
                className="p-3 overflow-hidden"
                style={{ height: chartHeight, minHeight: chartHeight }}
              >
                <ChartPreview 
                  visualization={chart.visualization}
                  result={result}
                  compact={true}
                />
              </div>

              {chart.explanation && (
                <div className="px-4 py-3 bg-[#fcfcfc] border-t border-[#f0f0f0] flex gap-2.5 items-start">
                  <Info className="w-3.5 h-3.5 text-[#6b8e3d] mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] text-[#777] leading-relaxed italic">
                    {safeRender(chart.explanation)}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
