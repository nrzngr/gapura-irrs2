'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import type { ChartVisualization, QueryResult, DashboardTile } from '@/types/builder';
import { CustomPivotTable } from './CustomPivotTable';
import { ChartClickHandler } from '@/components/chart-detail/ChartClickHandler';
import { formatDateValue, ISO_DATETIME_RE, processChartData, formatDisplayValue } from '@/lib/chart-utils';

interface ChartPreviewProps {
  visualization: ChartVisualization;
  result: QueryResult;
  compact?: boolean;
  tile?: DashboardTile;
  dashboardId?: string;
}

const GAPURA_GREEN_LIGHT = '#7cb342';
const GAPURA_GREEN_DARK = '#558b2f';
const GAPURA_BLUE = '#42a5f5';
const GAPURA_YELLOW = '#fdd835';

const DEFAULT_COLORS = [
  GAPURA_GREEN_LIGHT, GAPURA_BLUE, GAPURA_YELLOW, GAPURA_GREEN_DARK, '#aed581',
  '#33691e', '#9ccc65', '#689f38', '#c5e1a5', '#43a047', '#81c784', '#4caf50',
];

const TOOLTIP_STYLE = {
  backgroundColor: '#ffffff',
  border: '1px solid #e0e0e0',
  borderRadius: '6px',
  fontSize: '11px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
};

function DateTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={TOOLTIP_STYLE} className="px-3 py-2">
      <p className="font-medium mb-1">{typeof label === 'string' && ISO_DATETIME_RE.test(label) ? formatDateValue(label) : String(label)}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString('id-ID') : p.value}
        </p>
      ))}
    </div>
  );
}

export function ChartPreview({ visualization, result, compact = false, tile, dashboardId }: ChartPreviewProps) {
  const { chartType, colorField, showLegend, showLabels, colors } = visualization;
  const palette = (colors && colors.length > 0) ? colors : DEFAULT_COLORS;
  const rawData = result.rows as Record<string, unknown>[];

  if (rawData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-[var(--text-muted)]">
        Tidak ada data untuk ditampilkan
      </div>
    );
  }

  const wrap = (children: React.ReactNode) => {
    if (!tile) return children;
    return (
      <ChartClickHandler tile={tile} result={result} dashboardId={dashboardId}>
        {children}
      </ChartClickHandler>
    );
  };

  // Logic to determine active dimensions and measures
  let activeXKey = visualization.xAxis || result.columns[0] || '';
  const rawY = visualization.yAxis;
  let activeYKeys = (Array.isArray(rawY) ? rawY : (rawY ? [String(rawY)] : []))
    .filter(y => result.columns.includes(y));

  if (activeYKeys.length === 0) {
    activeYKeys = result.columns.filter(c => {
      if (c === activeXKey) return false;
      return rawData.some(r => typeof r[c] === 'number' && isFinite(r[c] as number));
    });
  }

  // Self-healing for swapped keys
  if (activeYKeys.length > 0 && typeof rawData[0][activeXKey] === 'number' && typeof rawData[0][activeYKeys[0]] === 'string') {
    const temp = activeXKey;
    activeXKey = activeYKeys[0];
    activeYKeys = [temp, ...activeYKeys.slice(1)];
  }

  if (activeYKeys.length === 0) activeYKeys = result.columns.slice(1);

  const data = processChartData(rawData, activeXKey);

  // HEATMAP
  if (chartType === 'heatmap') {
    const cols = result.columns;
    if (cols.length < 3) return <div className="p-4 text-xs text-center text-muted-foreground">Heatmap requires 3 columns</div>;

    // Robustly detect numeric vs categorical columns
    const numericCols = cols.filter(c => {
      const vals = rawData.slice(0, 10).map(r => r[c]);
      return vals.some(v => typeof v === 'number' && isFinite(v));
    });
    const categCols = cols.filter(c => !numericCols.includes(c));

    // Value (measure) should be the first numeric column
    let valueKey = colorField && cols.includes(colorField) ? colorField : (numericCols[0] || activeYKeys[0] || cols[cols.length - 1]);
    
    // Dimensions should be the categorical ones
    let dimKeys = categCols.length >= 2 ? categCols.slice(0, 2) : cols.filter(c => c !== valueKey).slice(0, 2);

    // Prefer activeXKey for colKey (X-axis/Horizontal)
    let colKey = activeXKey && dimKeys.includes(activeXKey) ? activeXKey : dimKeys[0];
    let rowKey = dimKeys.find(d => d !== colKey) || dimKeys[1] || dimKeys[0];

    const rowLabels = [...new Set(rawData.map(d => String(d[rowKey] ?? '')))];
    const colLabels = [...new Set(rawData.map(d => String(d[colKey] ?? '')))];
    
    return (
      <div className="w-full h-full overflow-auto p-2">
        <div className="grid gap-px" style={{ gridTemplateColumns: `auto repeat(${colLabels.length}, minmax(50px, 1fr))` }}>
          <div /> {colLabels.map(cl => <div key={cl} className="text-[10px] text-center font-medium truncate">{cl}</div>)}
          {rowLabels.map(rl => (
            <React.Fragment key={rl}>
              <div className="text-[10px] pr-2 text-right font-medium truncate self-center">{rl}</div>
              {colLabels.map(cl => {
                const row = rawData.find(r => String(r[rowKey]) === rl && String(r[colKey]) === cl);
                const val = Number(row?.[valueKey] ?? 0);
                return (
                  <div key={cl} className="h-8 flex items-center justify-center text-[10px] rounded-sm" style={{ backgroundColor: val > 0 ? `${palette[0]}33` : '#f5f5f5' }}>
                    {val || '-'}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  }

  // TABLE
  if (chartType === 'table') {
    return wrap(
      <div className="w-full h-full overflow-auto">
        <table className="min-w-full text-[11px] border-collapse">
          <thead className="sticky top-0 bg-gray-50 z-10">
            <tr>{result.columns.map(c => <th key={c} className="px-3 py-2 text-left font-bold border-b">{c}</th>)}</tr>
          </thead>
          <tbody>
            {rawData.slice(0, 50).map((row, i) => (
              <tr key={i} className="hover:bg-gray-50 border-b">
                {result.columns.map(c => <td key={c} className="px-3 py-1.5">{String(row[c] ?? '-')}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // PIVOT TABLE
  if (chartType === 'pivot') {
    return wrap(
      <CustomPivotTable result={result} title={visualization.title} />
    );
  }

  const commonProps = {
    tick: { fontSize: 10, fill: '#888' },
    axisLine: { stroke: '#eee' },
    tickLine: false,
  };

  // BAR / HORIZONTAL_BAR
  if (chartType === 'bar' || chartType === 'horizontal_bar') {
    const horizontal = chartType === 'horizontal_bar';
    
    // Compact adjustments
    const fontSize = compact ? 8 : 10;
    const itemHeight = compact ? 34 : 54; // Increased from 44
    const dynamicMinH = horizontal ? (data.length * itemHeight + (compact ? 40 : 100)) : '100%';
    
    let yAxisWidth = 80;
    if (horizontal) {
      const labels = data.map(d => String(d[activeXKey] ?? ''));
      const longestWord = Math.max(...labels.flatMap(l => l.split(' ').map(w => w.length)), 0);
      const maxLines = Math.max(...labels.map(l => l.split(' ').length), 1);
      
      // Calculate width based on longest word or wrapped lines
      const effectiveCharLen = Math.min(Math.max(longestWord, 12), 25);
      yAxisWidth = Math.min(Math.max(effectiveCharLen * (compact ? 5 : 7.5), compact ? 60 : 120), 220);
    }

    return wrap(
      <div style={{ width: '100%', height: '100%', minHeight: horizontal ? dynamicMinH : undefined, overflowY: horizontal ? 'auto' : 'visible' }}>
        <ResponsiveContainer width="100%" height={horizontal ? dynamicMinH : "100%"}>
          <BarChart 
            data={data} 
            layout={horizontal ? 'vertical' : 'horizontal'}
            margin={{ top: 10, right: horizontal ? (compact ? 35 : 60) : 10, left: horizontal ? (compact ? 0 : 0) : 0, bottom: 10 }}
            barCategoryGap={compact ? "10%" : "20%"}
            barSize={compact ? 12 : 20}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={!horizontal} horizontal={horizontal} stroke="#f5f5f5" />
            {horizontal ? (
              <>
                <XAxis type="number" {...commonProps} allowDecimals={false} hide={compact} />
                <YAxis 
                  type="category" 
                  dataKey={activeXKey} 
                  {...commonProps} 
                  width={yAxisWidth} 
                  interval={0} 
                  tick={(props) => {
                    const { x, y, payload } = props;
                    const words = String(payload.value).split(' ');
                    const lines = [];
                    let cur = words[0];
                    for(let i=1; i<words.length; i++) {
                      if ((cur + ' ' + words[i]).length < (compact ? 12 : 20)) cur += ' ' + words[i];
                      else { lines.push(cur); cur = words[i]; }
                    }
                    lines.push(cur);
                    return (
                      <g transform={`translate(${x},${y})`}>
                        {lines.map((l, i) => (
                          <text 
                            key={i} 
                            x={-8} 
                            y={0} 
                            dy={i * (fontSize + 2) + 4 - ((lines.length - 1) * (fontSize/1.5))} 
                            textAnchor="end" 
                            fontSize={fontSize} 
                            fill="#444"
                            fontWeight={500}
                          >
                            {l}
                          </text>
                        ))}
                      </g>
                    );
                  }}
                />
              </>
            ) : (
              <>
                <XAxis 
                  dataKey={activeXKey} 
                  {...commonProps} 
                  height={compact ? 40 : 60}
                  interval={0} 
                  tick={(props) => {
                    const { x, y, payload } = props;
                    const label = String(payload.value);
                    const isLong = label.length > 10;
                    const shouldRotate = isLong || data.length > 6;
                    
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text
                          x={0}
                          y={0}
                          dy={10}
                          textAnchor={shouldRotate ? "end" : "middle"}
                          fill="#666"
                          fontSize={fontSize}
                          transform={shouldRotate ? "rotate(-35)" : undefined}
                          fontWeight={500}
                        >
                          {label.length > (compact ? 15 : 25) ? label.substring(0, compact ? 12 : 22) + '...' : label}
                        </text>
                      </g>
                    );
                  }}
                />
                <YAxis {...commonProps} allowDecimals={false} />
              </>
            )}
            <Tooltip content={<DateTooltip />} />
            {activeYKeys.map((key, i) => (
              <Bar 
                key={key} 
                dataKey={key} 
                fill={palette[i % palette.length]} 
                radius={horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]} 
                minPointSize={2}
                label={showLabels ? { 
                  position: horizontal ? 'right' : 'top', 
                  fontSize: fontSize, 
                  fill: '#666',
                  formatter: (val: any) => formatDisplayValue(val),
                  offset: compact ? 4 : 10
                } : false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // LINE/AREA (Minimal for remaining)
  return wrap(
    <ResponsiveContainer width="100%" height="100%">
      {chartType === 'line' ? (
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey={activeXKey} {...commonProps} />
          <YAxis {...commonProps} />
          <Tooltip content={<DateTooltip />} />
          {activeYKeys.map((key, i) => <Line key={key} type="monotone" dataKey={key} stroke={palette[i % palette.length]} strokeWidth={2} dot={{r: 3}} />)}
        </LineChart>
      ) : (
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey={activeXKey} {...commonProps} />
          <YAxis {...commonProps} />
          <Tooltip content={<DateTooltip />} />
          {activeYKeys.map((key, i) => <Area key={key} type="monotone" dataKey={key} stroke={palette[i % palette.length]} fill={palette[i % palette.length]} fillOpacity={0.2} />)}
        </AreaChart>
      )}
    </ResponsiveContainer>
  );
}
