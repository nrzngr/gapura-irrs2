import { useRef, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { HeatmapChart } from '@/components/charts/HeatmapChart';
import type { DashboardTile, QueryResult } from '@/types/builder';
import { formatDateValue, processChartData } from '@/lib/chart-utils';


interface EnlargedChartProps {
  tile: DashboardTile;
  result: QueryResult;
}

const COLORS = ['#6b8e3d', '#7cb342', '#8bc34a', '#9ccc65', '#aed581', '#c5e1a5', '#42a5f5', '#66bb6a', '#81c784', '#a5d6a7'];

export function EnlargedChart({ tile, result }: EnlargedChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const { chartType: rawChartType, xAxis, yAxis, title } = tile.visualization;
  
  // Force heatmap for specific chart titles that are known to be heatmaps
  const chartType = title === 'Case Report by Area' || title === 'Case Category by Branch' || title === 'Case Category by Airlines' 
    ? 'heatmap' 
    : rawChartType;
  
  // Auto-detect columns if not properly configured
  // Use first column as x-axis (typically category/label)
  // Use numeric columns as y-axis (typically values)
  const effectiveXAxis = xAxis || result.columns[0];
  const effectiveYAxis = yAxis || result.columns
    .slice(1) // Skip first column (usually the x-axis/category)
    .filter(col => {
      // Check if column contains numeric data
      const sampleValue = result.rows[0]?.[col];
      return typeof sampleValue === 'number' || !isNaN(Number(sampleValue));
    });
  
  console.log('Chart Debug:', {
    chartType,
    configuredXAxis: xAxis,
    configuredYAxis: yAxis,
    effectiveXAxis,
    effectiveYAxis,
    columns: result.columns,
    firstRow: result.rows[0]
  });
  
  // Transform data for Recharts
  const chartData = processChartData(result.rows.map((row: any) => {
    const dataPoint: any = {};
    result.columns.forEach(col => {
      // Convert numeric strings to numbers
      const value = row[col];
      dataPoint[col] = typeof value === 'number' ? value : (isNaN(Number(value)) ? value : Number(value));
    });
    return dataPoint;
  }), effectiveXAxis);



  const renderChart = () => {
    const height = 400;
    
    switch (chartType) {
      case 'bar':
      case 'horizontal_bar':
        const isHorizontal = chartType === 'horizontal_bar';
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart 
              data={chartData} 
              layout={isHorizontal ? 'vertical' : 'horizontal'}
              margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" horizontal={!isHorizontal} vertical={isHorizontal} />
              
              {isHorizontal ? (
                <>
                   <XAxis type="number" tick={{ fontSize: 11, fill: '#666' }} axisLine={{ stroke: '#e0e0e0' }} />
                   <YAxis 
                     dataKey={effectiveXAxis} 
                     type="category" 
                     width={100} 
                     tick={{ fontSize: 11, fill: '#666' }} 
                     axisLine={{ stroke: '#e0e0e0' }} 
                   />
                </>
              ) : (
                <>
                  <XAxis 
                    dataKey={effectiveXAxis} 
                    tick={{ fontSize: 11, fill: '#666' }}
                    axisLine={{ stroke: '#e0e0e0' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: '#666' }}
                    axisLine={{ stroke: '#e0e0e0' }}
                  />
                </>
              )}

              <Tooltip 
                cursor={{ fill: 'transparent' }}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              
              {effectiveYAxis?.map((yKey, idx) => (
                <Bar 
                  key={yKey} 
                  dataKey={yKey} 
                  fill={COLORS[idx % COLORS.length]}
                  radius={isHorizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
                  barSize={32}
                  maxBarSize={50}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
        
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis 
                dataKey={effectiveXAxis} 
                tick={{ fontSize: 11, fill: '#666' }}
                axisLine={{ stroke: '#e0e0e0' }}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: '#666' }}
                axisLine={{ stroke: '#e0e0e0' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              {effectiveYAxis?.map((yKey, idx) => (
                <Line 
                  key={yKey} 
                  type="monotone" 
                  dataKey={yKey} 
                  stroke={COLORS[idx % COLORS.length]}
                  strokeWidth={2}
                  dot={{ fill: COLORS[idx % COLORS.length], strokeWidth: 2, r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
        
      case 'pie':
      case 'donut':
        const pieData = chartData.map((d: any, i: number) => ({
          name: d[effectiveXAxis],
          value: d[effectiveYAxis?.[0] || result.columns[1]],
          color: COLORS[i % COLORS.length]
        }));
        
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={chartType === 'donut' ? 80 : 0}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        );
        
       case 'heatmap':
        // Determine xAxis and yAxis from tile config or effective axis
        // xAxis = Cols, yAxis = Rows
        const hmXAxis = tile.visualization.xAxis || result.columns[1] || 'category';
        const rawY = tile.visualization.yAxis;
        const hmYAxis = Array.isArray(rawY) && rawY.length > 0 ? rawY[0] : (typeof rawY === 'string' ? rawY : result.columns[0]);
        
        // Metric is the numerical value. colorField is priority.
        const hmMetric = (tile.visualization as any).colorField || 
          result.columns.find(c => c !== hmXAxis && c !== hmYAxis && (typeof result.rows[0]?.[c] === 'number' || !isNaN(Number(result.rows[0]?.[c])))) || 
          'count';

        return (
          <div className="h-[500px]">
             <HeatmapChart 
                data={result.rows} 
                xAxis={hmXAxis} 
                yAxis={hmYAxis} 
                metric={hmMetric as string} 
                showTitle={false}
             />
          </div>
        );

      case 'pivot':
      case 'table':
        return (
          <div className="overflow-auto h-[400px] border border-[#e0e0e0] rounded-lg">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0 z-10">
                <tr>
                  {result.columns.map((col) => (
                    <th key={col} className="px-4 py-3 border-b border-[#e0e0e0] bg-gray-50">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row: any, i: number) => (
                  <tr key={i} className="bg-white border-b hover:bg-gray-50">
                    {result.columns.map((col) => (
                      <td key={`${i}-${col}`} className="px-4 py-3 border-[#e0e0e0]">
                        {col === 'Evidence' && row[col] ? (
                          <a 
                            href={row[col]} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1"
                          >
                            Link
                          </a>
                        ) : (
                          row[col] || '-'
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      default:
        return (
          <div className="h-[400px] flex items-center justify-center text-[#999]">
            Tipe chart tidak didukung untuk visualisasi detail
          </div>
        );
    }
  };

  return (
    <div ref={chartRef} className="relative">
      <div className="pt-2">
        {renderChart()}
      </div>
    </div>
  );
}
