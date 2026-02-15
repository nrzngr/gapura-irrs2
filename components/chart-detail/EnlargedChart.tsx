import { useRef } from 'react';
import { ChartPreview } from '@/components/builder/ChartPreview';
import type { DashboardTile, QueryResult } from '@/types/builder';


interface EnlargedChartProps {
  tile: DashboardTile;
  result: QueryResult;
}



export function EnlargedChart({ tile, result }: EnlargedChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const { title, chartType: rawChartType } = tile.visualization;

  // Force heatmap for specific titles if needed
  let chartType = title === 'Case Report by Area' || title === 'Case Category by Branch' || title === 'Case Category by Airlines' 
    ? 'heatmap' 
    : rawChartType;
  
  // Default to 'bar' if chartType is not provided
  if (!chartType) {
    console.warn(`[EnlargedChart] chartType not provided for "${title}", defaulting to 'bar'`);
    chartType = 'bar';
  }



  const renderChart = () => {
    const isHorizontalBar = chartType === 'horizontal_bar';
    const isPieOrDonut = chartType === 'pie' || chartType === 'donut';
    
    // Ensure container has proper dimensions
    const containerStyle: React.CSSProperties = {
      width: '100%',
      height: isHorizontalBar ? 'auto' : '500px', // Increased from 400px for better visibility
      minHeight: '400px',
      maxHeight: isHorizontalBar ? '600px' : 'none', // Use fixed maxHeight for horizontal bars
      overflowY: isHorizontalBar ? 'auto' : 'visible',
      paddingRight: isHorizontalBar ? '8px' : '0', // Space for scrollbar
    };
    
    console.log('[EnlargedChart] Rendering:', {
      chartType,
      title,
      isHorizontalBar,
      isPieOrDonut,
      rowCount: result.rows.length,
      columns: result.columns
    });
    
    return (
      <div style={containerStyle}>
        <ChartPreview 
          visualization={{
            ...tile.visualization,
            chartType // Use the potentially forced chartType
          }}
          result={result}
          tile={tile}
        />
      </div>
    );
  };

  return (
    <div ref={chartRef} className="relative" style={{ width: '100%' }}>
      {renderChart()}
    </div>
  );
}
