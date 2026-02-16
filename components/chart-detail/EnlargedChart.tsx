import { useRef } from 'react';
import { ChartPreview } from '@/components/builder/ChartPreview';
import type { DashboardTile, QueryResult } from '@/types/builder';
import { ViewMode, Normalization } from '@/components/chart-detail/GlobalControlBar';


interface EnlargedChartProps {
  tile: DashboardTile;
  result: QueryResult;
  viewMode?: ViewMode;
  normalization?: Normalization;
}

export function EnlargedChart({ tile, result, viewMode, normalization }: EnlargedChartProps) {
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
    const isPivot = chartType === 'pivot' || chartType === 'table' || chartType === 'branch_area_grid';

    // Ensure container has proper dimensions
    const containerStyle: React.CSSProperties = {
      width: '100%',
      // For Pivot/Table, we want to maximize screen real estate but ensure it fits
      height: isPivot ? '75vh' : (isHorizontalBar ? 'auto' : '500px'), 
      minHeight: '400px',
      maxHeight: isHorizontalBar ? '600px' : 'none',
      overflowY: isHorizontalBar ? 'auto' : 'hidden', // hidden for pivot to enforce h-full constraint
      paddingRight: isHorizontalBar ? '8px' : '0',
      marginBottom: isPivot ? '32px' : '0', // Add margin to prevent overlapping
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
          // tile={tile} // Disable click handler in detail view to allow interaction (scrolling, tooltips)
          viewMode={viewMode}
          normalization={normalization}
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
