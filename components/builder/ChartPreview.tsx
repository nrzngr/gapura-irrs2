'use client';

import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  PieChart, Pie, Cell,
  ScatterChart, Scatter,
  ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import type { ChartVisualization, QueryResult, DashboardTile } from '@/types/builder';
import { CustomPivotTable } from './CustomPivotTable';
import { ChartClickHandler } from '@/components/chart-detail/ChartClickHandler';
import { formatDateValue, ISO_DATETIME_RE, processChartData } from '@/lib/chart-utils';

interface ChartPreviewProps {
  visualization: ChartVisualization;
  result: QueryResult;
  tile?: DashboardTile;
  dashboardId?: string;
}

// Gapura Brand Colors
const GAPURA_GREEN = '#6b8e3d';
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

// Date formatting logic moved to @/lib/chart-utils.ts

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

export function ChartPreview({ visualization, result, tile, dashboardId }: ChartPreviewProps) {
  const { chartType, xAxis, yAxis, colorField, showLegend, showLabels, colors } = visualization;
  const palette = colors && colors.length > 0 ? colors : DEFAULT_COLORS;
  const rawData = result.rows as Record<string, unknown>[];

  if (rawData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-[var(--text-muted)]">
        Tidak ada data untuk ditampilkan
      </div>
    );
  }

  // Wrap chart with click handler if tile is provided
  const wrapWithClickHandler = (children: React.ReactNode) => {
    if (!tile) return children;
    return (
      <ChartClickHandler tile={tile} result={result} dashboardId={dashboardId}>
        {children}
      </ChartClickHandler>
    );
  };

  let xKey = xAxis || result.columns[0] || '';
  
  // yKeys heuristic: use provided yAxis if they exist in columns, 
  // otherwise use all numeric columns except xKey
  let yKeys = yAxis.filter(y => result.columns.includes(y));
  if (yKeys.length === 0) {
    yKeys = result.columns.filter(c => {
      if (c === xKey) return false;
      // Heuristic: is at least one value a finite number?
      return rawData.some(r => typeof r[c] === 'number' && isFinite(r[c] as number));
    });
  }

  // SELF-HEALING: If xKey is a number and yKeys[0] is a string, they are likely swapped
  if (yKeys.length > 0 && rawData.length > 0) {
    const firstValX = rawData[0][xKey];
    const firstValY = rawData[0][yKeys[0]];
    if (typeof firstValX === 'number' && typeof firstValY === 'string') {
      // Swapping x and y keys
      const temp = xKey;
      xKey = yKeys[0];
      yKeys = [temp, ...yKeys.slice(1)];
    }
  }

  // Ultimate fallback
  if (yKeys.length === 0) yKeys = result.columns.slice(1);

  const data = processChartData(rawData, xKey);

  // KPI
  if (chartType === 'kpi') {
    const firstMeasure = yKeys[0];
    const value = data[0]?.[firstMeasure];
    const kpiLabel = visualization.title || firstMeasure;
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-4xl font-bold" style={{ color: palette[0] }}>
            {typeof value === 'number' ? value.toLocaleString('id-ID') : String(value ?? '-')}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-1">{kpiLabel}</div>
        </div>
      </div>
    );
  }

  // HEATMAP — 2 dimensions (rows × cols) + 1 measure for intensity
  if (chartType === 'heatmap') {
    const cols = result.columns;
    if (cols.length < 3) {
      return (
        <div className="flex items-center justify-center h-full text-sm text-[var(--text-muted)]">
          Heatmap membutuhkan 2 dimensi + 1 ukuran
        </div>
      );
    }

    // Identify measure vs dimension columns using visualization config
    // yAxis[0] = measure column, xAxis = one dimension, remaining = other dimension
    // Fallback: detect the most-numeric column as measure
    let valueKey: string;
    let dimKeys: string[];

    const yMatch = yKeys.find(y => cols.includes(y));
    if (yMatch) {
      valueKey = yMatch;
      dimKeys = cols.filter(c => c !== valueKey).slice(0, 2);
    } else {
      // Heuristic: column where every row is numeric → measure
      const numericScore = cols.map(c => {
        let numeric = 0;
        for (const r of rawData) { if (isFinite(Number(r[c]))) numeric++; }
        return numeric;
      });
      const measureIdx = numericScore.indexOf(Math.max(...numericScore));
      valueKey = cols[measureIdx];
      dimKeys = cols.filter(c => c !== valueKey).slice(0, 2);
    }

    // xAxis config determines column headers; remaining dim = row labels
    const rowKey = xKey && dimKeys.includes(xKey) ? dimKeys.find(d => d !== xKey)! : dimKeys[0];
    const colKey = dimKeys.find(d => d !== rowKey) || dimKeys[1] || dimKeys[0];

    const rowLabels = [...new Set(rawData.map(d => String(d[rowKey] ?? '')))];
    const colLabels = [...new Set(rawData.map(d => String(d[colKey] ?? '')))];

    // Complexity: Time O(n) | Space O(r*c)
    const matrix = new Map<string, number>();
    let minVal = Infinity;
    let maxVal = -Infinity;
    for (const row of rawData) {
      const rLabel = String(row[rowKey] ?? '');
      const cLabel = String(row[colKey] ?? '');
      const raw = Number(row[valueKey] ?? 0);
      const val = isFinite(raw) ? raw : 0;
      matrix.set(`${rLabel}__${cLabel}`, val);
      if (val < minVal) minVal = val;
      if (val > maxVal) maxVal = val;
    }
    if (!isFinite(minVal)) minVal = 0;
    if (!isFinite(maxVal)) maxVal = 0;
    const range = maxVal - minVal || 1;

    // Parse hex color → RGB for proper color interpolation
    const hex = palette[0] || '#7cb342';
    const r0 = parseInt(hex.slice(1, 3), 16);
    const g0 = parseInt(hex.slice(3, 5), 16);
    const b0 = parseInt(hex.slice(5, 7), 16);
    const cellColor = (t: number) => {
      const r = Math.round(255 + (r0 - 255) * t);
      const g = Math.round(255 + (g0 - 255) * t);
      const b = Math.round(255 + (b0 - 255) * t);
      return `rgb(${r},${g},${b})`;
    };

    const CELL_H = 36;
    const CELL_W = Math.max(56, Math.min(80, Math.floor(600 / colLabels.length)));
    const LABEL_W = Math.min(Math.max(...rowLabels.map(l => l.length * 7.5), 64), 160);
    const HEADER_H = 36;

    return (
      <div className="w-full h-full overflow-auto flex items-center justify-center p-2">
        <div className="inline-block">
          {/* Column headers */}
          <div className="flex" style={{ paddingLeft: LABEL_W }}>
            {colLabels.map(cl => (
              <div
                key={cl}
                className="text-[10px] font-semibold text-[var(--text-secondary)] text-center px-1"
                style={{ width: CELL_W, height: HEADER_H, lineHeight: `${HEADER_H}px` }}
                title={cl}
              >
                <span className="block truncate">{cl}</span>
              </div>
            ))}
          </div>
          {/* Rows */}
          {rowLabels.map(rl => (
            <div key={rl} className="flex items-center">
              <div
                className="text-[10px] font-semibold text-[var(--text-secondary)] truncate shrink-0 pr-2 text-right"
                style={{ width: LABEL_W }}
                title={rl}
              >
                {rl}
              </div>
              {colLabels.map(cl => {
                const val = matrix.get(`${rl}__${cl}`) ?? 0;
                const t = (val - minVal) / range;
                const bg = cellColor(t);
                const isDark = t > 0.5;
                return (
                  <div
                    key={cl}
                    className="border border-white/60 rounded-sm flex items-center justify-center transition-colors"
                    style={{ width: CELL_W, height: CELL_H, backgroundColor: bg }}
                    title={`${rl} × ${cl}: ${val.toLocaleString('id-ID')}`}
                  >
                    <span
                      className="text-[10px] font-bold"
                      style={{ color: isDark ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.6)' }}
                    >
                      {val > 0 ? val.toLocaleString('id-ID') : '–'}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
          {/* Legend bar */}
          <div className="flex items-center gap-2 mt-3" style={{ paddingLeft: LABEL_W }}>
            <span className="text-[9px] text-[var(--text-muted)]">{minVal.toLocaleString('id-ID')}</span>
            <div
              className="h-2 rounded-full flex-1"
              style={{
                maxWidth: 160,
                background: `linear-gradient(to right, ${cellColor(0)}, ${cellColor(0.5)}, ${cellColor(1)})`,
              }}
            />
            <span className="text-[9px] text-[var(--text-muted)]">{maxVal.toLocaleString('id-ID')}</span>
          </div>
        </div>
      </div>
    );
  }

  // Table type — render inline data table
  if (chartType === 'table') {
    const columns = result.columns;
    const rows = result.rows as Record<string, unknown>[];
    const displayRows = rows.slice(0, 50);
    return (
      <div className="overflow-auto max-h-[400px] text-xs">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky top-0 bg-[var(--surface-2)] px-3 py-2 text-left font-semibold text-[var(--text-secondary)] border-b border-[var(--surface-4)]">#</th>
              {columns.map(col => (
                <th key={col} className="sticky top-0 bg-[var(--surface-2)] px-3 py-2 text-left font-semibold text-[var(--text-secondary)] border-b border-[var(--surface-4)] whitespace-nowrap">
                  {col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, idx) => (
              <tr key={idx} className="border-b border-[var(--surface-3)] hover:bg-[var(--surface-2)]">
                <td className="px-3 py-1.5 text-[var(--text-muted)]">{idx + 1}</td>
                {columns.map(col => {
                  const val = row[col];
                  const str = val === null || val === undefined ? '-' : String(val);
                  const isUrl = typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://') || val.startsWith('{http'));
                  return (
                    <td key={col} className="px-3 py-1.5 text-[var(--text-primary)] max-w-[300px] truncate">
                      {isUrl ? (
                        <a href={str.replace(/^\{|\}$/g, '').split(',')[0]} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          Link Evidence
                        </a>
                      ) : str.length > 80 ? str.substring(0, 77) + '...' : str}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > 50 && (
          <div className="text-center py-2 text-[var(--text-muted)]">Menampilkan 50 dari {rows.length} baris</div>
        )}
      </div>
    );
  }

  // Pivot table type — render cross-tabulation table
  if (chartType === 'pivot') {
    return <CustomPivotTable result={result} title={visualization.title} />;
  }

  const commonAxisProps = {
    tick: { fill: '#666666', fontSize: 10 },
    axisLine: { stroke: '#e0e0e0' },
    tickLine: false,
  };

  // PIE / DONUT
  if (chartType === 'pie' || chartType === 'donut') {
    const pieData = rawData.map((d, i) => ({
      name: formatDateValue(d[xKey]) || `Item ${i + 1}`,
      value: Number(d[yKeys[0]] ?? 0),
    }));

    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={chartType === 'donut' ? '55%' : 0}
            outerRadius="80%"
            paddingAngle={2}
            dataKey="value"
            label={showLabels ? ({ value, cx, cy, midAngle, innerRadius, outerRadius }: any) => {
              const RADIAN = Math.PI / 180;
              const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
              const x = cx + radius * Math.cos(-midAngle * RADIAN);
              const y = cy + radius * Math.sin(-midAngle * RADIAN);
              return value > 0 ? (
                <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700}>
                  {value}
                </text>
              ) : null;
            } : false}
          >
            {pieData.map((_, i) => (
              <Cell key={i} fill={palette[i % palette.length]} />
            ))}
          </Pie>
          <Tooltip content={<DateTooltip />} />
          {showLegend && <Legend />}
        </PieChart>
      </ResponsiveContainer>
    );
  }

  // SCATTER
  if (chartType === 'scatter') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-4)" />
          <XAxis dataKey={xKey} name={xKey} {...commonAxisProps} />
          <YAxis dataKey={yKeys[0]} name={yKeys[0]} {...commonAxisProps} />
          <Tooltip content={<DateTooltip />} />
          <Scatter data={data} fill={palette[0]} />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  // COMBO (Bar + Line)
  if (chartType === 'combo') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-4)" />
          <XAxis dataKey={xKey} {...commonAxisProps} />
          <YAxis {...commonAxisProps} allowDecimals={false} />
          <Tooltip content={<DateTooltip />} />
          {showLegend && <Legend />}
          {yKeys.map((key, i) => (
            i === 0
              ? <Bar key={key} dataKey={key} fill={palette[i % palette.length]} radius={[4, 4, 0, 0]} />
              : <Line key={key} type="monotone" dataKey={key} stroke={palette[i % palette.length]} strokeWidth={2} dot={{ r: 3 }} />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  // BAR / HORIZONTAL_BAR / STACKED_BAR
  if (chartType === 'bar' || chartType === 'horizontal_bar' || chartType === 'stacked_bar') {
    const isHorizontal = chartType === 'horizontal_bar';
    const isStacked = chartType === 'stacked_bar';
    const stackId = isStacked ? 'stack' : undefined;

    // Calculate YAxis width based on longest label for horizontal bars
    let yAxisWidth = 80;
    if (isHorizontal) {
      // Calculate max length, but cap calculation at 30 chars per line (assume wrapping)
      const maxLabelLen = Math.max(...data.map(d => String(d[xKey] ?? '').length), 0);
      // If label > 25 chars, we'll wrap it. So width is based on ~25 chars + padding
      const effectiveLen = Math.min(maxLabelLen, 35); 
      yAxisWidth = Math.min(Math.max(effectiveLen * 6.5, 100), 160); // Cap at 160px width
    }

    // Helper for wrapping text
    const CustomYAxisTick = (props: any) => {
      const { x, y, payload } = props;
      const label = String(payload.value || '');
      
      // Split into words
      const words = label.split(' ');
      const lines: string[] = [];
      let currentLine = words[0];

      for (let i = 1; i < words.length; i++) {
        if ((currentLine + ' ' + words[i]).length < 25) {
          currentLine += ' ' + words[i];
        } else {
          lines.push(currentLine);
          currentLine = words[i];
        }
      }
      lines.push(currentLine);

      // Render lines
      return (
        <g transform={`translate(${x},${y})`}>
          {lines.map((line, index) => (
             <text 
               key={index} 
               x={0} 
               y={0} 
               dy={index * 12 + 4 - ((lines.length - 1) * 6)} 
               textAnchor="end" 
               fill="var(--text-secondary)" 
               fontSize={data.length > 15 ? 9 : 10} // Shrink font if many items
               width={yAxisWidth}
             >
               {line}
             </text>
          ))}
        </g>
      );
    };

    // Dynamic height for horizontal bars to prevent label overlap
    // Min 30px per category + margin
    const minH = isHorizontal ? Math.max(300, data.length * 32 + 40) : '100%';

    return (
      <div style={{ width: '100%', height: '100%', minHeight: isHorizontal ? minH : undefined, overflowY: isHorizontal ? 'auto' : 'visible' }}>
        <ResponsiveContainer width="100%" height={isHorizontal ? minH : "100%"}>
          <BarChart
            data={data}
            layout={isHorizontal ? 'vertical' : 'horizontal'}
            margin={{ top: 10, right: isHorizontal ? 60 : 20, left: isHorizontal ? yAxisWidth - 40 : 0, bottom: 20 }}
          >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          {isHorizontal ? (
            <>
              <XAxis 
                type="number" 
                tick={{ fill: '#999', fontSize: 10 }}
                axisLine={{ stroke: '#e0e0e0' }}
                tickLine={false}
                allowDecimals={false} 
              />
              <YAxis
                type="category"
                dataKey={xKey}
                axisLine={false}
                tickLine={false}
                interval={0}
                width={yAxisWidth}
                tick={<CustomYAxisTick />}
              />
            </>
          ) : (
            <>
              <XAxis 
                dataKey={xKey} 
                tick={{ fill: '#666', fontSize: 10 }}
                axisLine={{ stroke: '#e0e0e0' }}
                tickLine={false}
                interval={0} 
              />
              <YAxis 
                tick={{ fill: '#999', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false} 
              />
            </>
          )}
          <Tooltip content={<DateTooltip />} />
          {yKeys.map((key, i) => (
            <Bar
              key={key}
              dataKey={key}
              fill={palette[i % palette.length]}
              stackId={stackId}
              radius={isStacked ? 0 : isHorizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
              label={showLabels ? { 
                position: isHorizontal ? 'right' : 'top', 
                fontSize: 9, 
                fill: '#666'
              } : false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      </div>
    );
  }

  // LINE
  if (chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-4)" />
          <XAxis dataKey={xKey} {...commonAxisProps} />
          <YAxis {...commonAxisProps} allowDecimals={false} />
          <Tooltip content={<DateTooltip />} />
          {showLegend && <Legend />}
          {yKeys.map((key, i) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={palette[i % palette.length]}
              strokeWidth={2}
              dot={{ r: 3, fill: palette[i % palette.length] }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // AREA (default)
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          {yKeys.map((key, i) => (
            <linearGradient key={key} id={`gradient-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={palette[i % palette.length]} stopOpacity={0.3} />
              <stop offset="95%" stopColor={palette[i % palette.length]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-4)" />
        <XAxis dataKey={xKey} {...commonAxisProps} />
        <YAxis {...commonAxisProps} allowDecimals={false} />
        <Tooltip content={<DateTooltip />} />
        {showLegend && <Legend />}
        {yKeys.map((key, i) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            stroke={palette[i % palette.length]}
            fillOpacity={1}
            fill={`url(#gradient-${i})`}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
