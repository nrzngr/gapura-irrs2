'use client';

import React from 'react';
import { Plane, BarChart3, Info } from 'lucide-react';

interface AirlineTypeCategoryData {
  airlineType: string;
  category: string;
  count: number;
  percentage: number;
}

interface AirlineTypeCategoryChartProps {
  data: AirlineTypeCategoryData[];
  title?: string;
  explanation?: string;
}

const AIRLINE_TYPE_CONFIG: Record<string, { 
  color: string; 
  bgColor: string; 
  label: string;
}> = {
  'LOKAL': { 
    color: '#dc2626', 
    bgColor: 'bg-red-100', 
    label: 'Lokal'
  },
  'MPA': { 
    color: '#2563eb', 
    bgColor: 'bg-blue-100', 
    label: 'MPA'
  },
  'GARUDA INDONESIA': { 
    color: '#0891b2', 
    bgColor: 'bg-cyan-100', 
    label: 'Garuda'
  },
  'CITILINK': { 
    color: '#16a34a', 
    bgColor: 'bg-green-100', 
    label: 'Citilink'
  },
  'PELITA AIR': { 
    color: '#7c3aed', 
    bgColor: 'bg-purple-100', 
    label: 'Pelita Air'
  },
  'LION AIR': { 
    color: '#ea580c', 
    bgColor: 'bg-orange-100', 
    label: 'Lion Air'
  },
};

const CATEGORY_COLORS: Record<string, string> = {
  'IRREGULARITY': '#ef5350',
  'COMPLAINT': '#ffa726',
  'COMPLIMENT': '#7cb342',
};

export function AirlineTypeCategoryChart({ 
  data, 
  title = 'Kategori per Jenis Maskapai',
  explanation 
}: AirlineTypeCategoryChartProps) {
  // Handle empty data
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#e0e0e0] flex flex-col overflow-hidden h-full">
        <div className="px-4 py-3 border-b border-[#f0f0f0] flex items-center justify-between">
          <h4 className="text-[11px] font-bold text-[#333] uppercase tracking-tight">
            {title}
          </h4>
          <div className="w-1.5 h-1.5 rounded-full bg-[#6b8e3d]" />
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Plane className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-[11px] text-gray-500">Tidak ada data maskapai</p>
            <p className="text-[9px] text-gray-400 mt-1">Data mungkin belum tersedia atau kosong</p>
          </div>
        </div>
        {explanation && (
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

  const total = data.reduce((sum, item) => sum + item.count, 0);
  
  // Group by airline type
  const groupedByType = data.reduce((acc, item) => {
    const type = item.airlineType?.toUpperCase() || 'LAINNYA';
    if (!acc[type]) acc[type] = {};
    if (!acc[type][item.category]) acc[type][item.category] = 0;
    acc[type][item.category] += item.count;
    return acc;
  }, {} as Record<string, Record<string, number>>);

  const airlineTypes = Object.keys(groupedByType).sort((a, b) => {
    const totalA = Object.values(groupedByType[a]).reduce((sum, count) => sum + count, 0);
    const totalB = Object.values(groupedByType[b]).reduce((sum, count) => sum + count, 0);
    return totalB - totalA;
  });

  const categories = ['IRREGULARITY', 'COMPLAINT', 'COMPLIMENT'];

  return (
    <div className="bg-white rounded-xl border border-[#e0e0e0] flex flex-col overflow-hidden transition-all hover:shadow-[0_4px_15px_-4px_rgba(0,0,0,0.1)] hover:border-[#6b8e3d]/30 h-full">
      <div className="px-4 py-3 border-b border-[#f0f0f0] flex items-center justify-between">
        <h4 className="text-[11px] font-bold text-[#333] uppercase tracking-tight">
          {title}
        </h4>
        <div className="w-1.5 h-1.5 rounded-full bg-[#6b8e3d]" />
      </div>
      
      <div className="p-4 flex-1 flex flex-col">
        {/* Airline Type Summary */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {airlineTypes.slice(0, 3).map((type) => {
            const config = AIRLINE_TYPE_CONFIG[type] || { 
              color: '#6b7280', 
              bgColor: 'bg-gray-100', 
              label: type 
            };
            const typeTotal = Object.values(groupedByType[type]).reduce((sum, count) => sum + count, 0);
            
            return (
              <div 
                key={type} 
                className={`${config.bgColor} rounded-lg p-2 text-center`}
              >
                <Plane className="w-4 h-4 mx-auto mb-1" style={{ color: config.color }} />
                <div className="text-lg font-black" style={{ color: config.color }}>
                  {typeTotal.toLocaleString('id-ID')}
                </div>
                <div className="text-[9px] text-gray-600 uppercase font-medium truncate">
                  {config.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mb-3">
          {categories.map(cat => (
            <div key={cat} className="flex items-center gap-1">
              <div 
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: CATEGORY_COLORS[cat] || '#999' }}
              />
              <span className="text-[9px] text-gray-600 uppercase">{cat}</span>
            </div>
          ))}
        </div>

        {/* Stacked Bar Chart */}
        <div className="flex-1 space-y-2 overflow-y-auto max-h-[200px]">
          {airlineTypes.map((type) => {
            const config = AIRLINE_TYPE_CONFIG[type] || { 
              color: '#6b7280', 
              bgColor: 'bg-gray-100', 
              label: type 
            };
            const typeData = groupedByType[type];
            const typeTotal = Object.values(typeData).reduce((sum, count) => sum + count, 0);
            const maxVal = Math.max(...Object.values(typeData));
            
            return (
              <div key={type} className="group">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-6 h-6 rounded-md flex items-center justify-center text-[8px] font-bold text-white"
                      style={{ backgroundColor: config.color }}
                    >
                      {config.label.slice(0, 2)}
                    </div>
                    <span className="text-[10px] text-gray-700">{config.label}</span>
                  </div>
                  <span className="text-[10px] font-bold text-gray-800">{typeTotal}</span>
                </div>
                
                {/* Stacked bars for each category */}
                <div className="flex gap-1 ml-8">
                  {categories.map((cat) => {
                    const count = typeData[cat] || 0;
                    const width = maxVal > 0 ? (count / maxVal) * 100 : 0;
                    
                    return (
                      <div key={cat} className="flex-1">
                        <div 
                          className="h-6 rounded-md flex items-center justify-center transition-all duration-300 min-w-[20px]"
                          style={{ 
                            width: `${Math.max(width, count > 0 ? 15 : 0)}%`,
                            backgroundColor: CATEGORY_COLORS[cat] || '#999',
                            opacity: count > 0 ? 1 : 0.3
                          }}
                        >
                          {width > 25 && (
                            <span className="text-[8px] font-bold text-white">
                              {count}
                            </span>
                          )}
                        </div>
                        {width <= 25 && count > 0 && (
                          <div className="text-[8px] text-gray-500 text-center mt-0.5">
                            {count}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Category Summary */}
        <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-3 gap-2">
          {categories.map(cat => {
            const catTotal = data
              .filter(d => d.category === cat)
              .reduce((sum, d) => sum + d.count, 0);
            const catPercentage = total > 0 ? (catTotal / total) * 100 : 0;
            
            return (
              <div key={cat} className="text-center">
                <div 
                  className="text-lg font-bold"
                  style={{ color: CATEGORY_COLORS[cat] || '#999' }}
                >
                  {catTotal.toLocaleString('id-ID')}
                </div>
                <div className="text-[9px] text-gray-500 uppercase">{cat}</div>
                <div className="text-[9px] text-gray-400">{catPercentage.toFixed(1)}%</div>
              </div>
            );
          })}
        </div>
      </div>

      {explanation && (
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
