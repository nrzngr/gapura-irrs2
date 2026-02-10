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
import type { ChartVisualization, QueryResult } from '@/types/builder';

interface ChartPreviewProps {
  visualization: ChartVisualization;
  result: QueryResult;
}

const DEFAULT_COLORS = [
  '#7cb342', '#558b2f', '#aed581', '#33691e', '#9ccc65',
  '#689f38', '#c5e1a5', '#43a047', '#81c784', '#4caf50',
];

const TOOLTIP_STYLE = {
  backgroundColor: 'var(--surface-1)',
  border: '1px solid var(--surface-4)',
  borderRadius: '8px',
  fontSize: '12px',
};

// ISO datetime pattern: 2026-01-23T00:00:00+00:00 or 2026-01-23T00:00:00.000Z
const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

function formatDateValue(val: unknown): string {
  if (typeof val !== 'string' || !ISO_DATETIME_RE.test(val)) return String(val ?? '');
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  // Format based on granularity hint from the value itself
  const day = d.getUTCDate();
  const month = d.toLocaleDateString('id-ID', { month: 'short', timeZone: 'UTC' });
  const year = d.getUTCFullYear();
  // If day=1 and time=00:00, likely month granularity
  if (day === 1 && d.getUTCHours() === 0 && d.getUTCMinutes() === 0) {
    return `${month} ${year}`;
  }
  return `${day} ${month} ${year}`;
}

function isDateColumn(rows: Record<string, unknown>[], key: string): boolean {
  for (const row of rows.slice(0, 5)) {
    const v = row[key];
    if (typeof v === 'string' && ISO_DATETIME_RE.test(v)) return true;
  }
  return false;
}

/** Pre-process data: format datetime xKey values for display */
function processChartData(
  rows: Record<string, unknown>[],
  xKey: string,
): Record<string, unknown>[] {
  if (!isDateColumn(rows, xKey)) return rows;
  return rows.map(row => ({
    ...row,
    [xKey]: formatDateValue(row[xKey]),
  }));
}

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

export function ChartPreview({ visualization, result }: ChartPreviewProps) {
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

  const xKey = xAxis || result.columns[0] || '';
  const yKeys = yAxis.length > 0 ? yAxis : result.columns.slice(1);
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

  // Table type uses DataTable
  if (chartType === 'table') {
    return (
      <div className="text-xs text-[var(--text-muted)] text-center py-8">
        Gunakan tab Tabel untuk melihat data
      </div>
    );
  }

  const commonAxisProps = {
    tick: { fill: 'var(--text-secondary)', fontSize: 11 },
    axisLine: false,
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
      const maxLabelLen = Math.max(...data.map(d => String(d[xKey] ?? '').length), 0);
      yAxisWidth = Math.min(Math.max(maxLabelLen * 6.5, 100), 220);
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout={isHorizontal ? 'vertical' : 'horizontal'}
          margin={{ top: 10, right: 20, left: isHorizontal ? 10 : 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-4)" />
          {isHorizontal ? (
            <>
              <XAxis type="number" {...commonAxisProps} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey={xKey}
                {...commonAxisProps}
                width={yAxisWidth}
                tick={({ x, y, payload }: any) => {
                  const label = String(payload.value ?? '');
                  const maxChars = Math.floor(yAxisWidth / 6);
                  const display = label.length > maxChars ? label.slice(0, maxChars - 1) + '…' : label;
                  return (
                    <text x={x} y={y} dy={4} textAnchor="end" fill="var(--text-secondary)" fontSize={11}>
                      {display}
                    </text>
                  );
                }}
              />
            </>
          ) : (
            <>
              <XAxis dataKey={xKey} {...commonAxisProps} />
              <YAxis {...commonAxisProps} allowDecimals={false} />
            </>
          )}
          <Tooltip content={<DateTooltip />} />
          {showLegend && <Legend />}
          {yKeys.map((key, i) => (
            <Bar
              key={key}
              dataKey={key}
              fill={palette[i % palette.length]}
              stackId={stackId}
              radius={isStacked ? 0 : isHorizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
              label={showLabels ? { position: isHorizontal ? 'right' : 'top', fontSize: 11, fill: '#555' } : false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
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
