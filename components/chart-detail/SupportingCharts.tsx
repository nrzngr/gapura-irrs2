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

export function SupportingCharts({ charts, dataMap, loading }: SupportingChartsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-[#e0e0e0] h-[280px]" />
        ))}
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
          if (!result) return null;

          if (chart.visualization.chartType === 'kpi') {
            const rawY = chart.visualization.yAxis;
            const yKey = (Array.isArray(rawY) ? rawY[0] : rawY) || result.columns[result.columns.length - 1];
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
                
                <div className="p-6 flex flex-col justify-center items-center h-[300px] text-center">
                  <span className="text-4xl font-black text-[#333] tracking-tighter">
                    {value.toLocaleString('id-ID')}
                  </span>
                  <span className="text-[10px] font-medium text-[#999] mt-2 uppercase">Total Terkumpul</span>
                </div>
                {chart.explanation && (
                  <div className="px-4 py-3 bg-[#fcfcfc] border-t border-[#f0f0f0] flex gap-2.5 items-start">
                    <Info className="w-3.5 h-3.5 text-[#6b8e3d] mt-0.5 flex-shrink-0" />
                    <p className="text-[10px] text-[#777] leading-relaxed italic">
                      {chart.explanation}
                    </p>
                  </div>
                )}
              </div>
            );
          }

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
              
              <div className="p-4 h-[300px]">
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
                    {chart.explanation}
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
