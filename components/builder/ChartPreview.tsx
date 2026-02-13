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
import { formatDateValue, ISO_DATETIME_RE, processChartData } from '@/lib/chart-utils';

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
  let activeYKeys = visualization.yAxis?.filter(y => result.columns.includes(y)) || [];

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

    let valueKey = colorField && cols.includes(colorField) ? colorField : activeYKeys[0];
    const dimKeys = cols.filter(c => c !== valueKey).slice(0, 2);
    const rowKey = activeXKey && dimKeys.includes(activeXKey) ? dimKeys.find(d => d !== activeXKey)! : dimKeys[0];
    const colKey = dimKeys.find(d => d !== rowKey) || dimKeys[1];

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
    const itemHeight = compact ? 34 : 44;
    const dynamicMinH = horizontal ? Math.max(compact ? 220 : 300, data.length * itemHeight + 60) : '100%';
    
    let yAxisWidth = 80;
    if (horizontal) {
      const maxLen = Math.max(...data.map(d => String(d[activeXKey] ?? '').length), 0);
      const effectiveLen = Math.min(maxLen, compact ? 12 : 30); // Reduced length for compact
      yAxisWidth = Math.min(Math.max(effectiveLen * (compact ? 5 : 6.5), compact ? 50 : 100), 160);
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
                    const label = String(payload.value).split(' ');
                    const lines = [];
                    let cur = label[0];
                    for(let i=1; i<label.length; i++) {
                      if ((cur + ' ' + label[i]).length < (compact ? 12 : 25)) cur += ' ' + label[i];
                      else { lines.push(cur); cur = label[i]; }
                    }
                    lines.push(cur);
                    return (
                      <g transform={`translate(${x},${y})`}>
                        {lines.map((l, i) => (
                          <text 
                            key={i} 
                            x={-5} 
                            y={0} 
                            dy={i * (fontSize + 1) + 3 - ((lines.length - 1) * (fontSize/2))} 
                            textAnchor="end" 
                            fontSize={fontSize} 
                            fill="#555"
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
                <XAxis dataKey={activeXKey} {...commonProps} interval={0} />
                <YAxis {...commonProps} allowDecimals={false} />
              </>
            )}
            <Tooltip content={<DateTooltip />} />
            {activeYKeys.map((key, i) => (
              <Bar 
                key={key} 
                dataKey={key} 
                fill={palette[i % palette.length]} 
                radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} 
                minPointSize={2} // Ensure very small bars are visible
                label={showLabels ? { 
                  position: horizontal ? 'right' : 'top', 
                  fontSize: fontSize, 
                  fill: '#666',
                  formatter: (val: any) => typeof val === 'number' ? val.toLocaleString('id-ID') : String(val ?? ''),
                  offset: compact ? 4 : 8
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
