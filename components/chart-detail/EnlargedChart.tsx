import { useRef } from 'react';
import { ChartPreview } from '@/components/builder/ChartPreview';
import type { DashboardTile, QueryResult } from '@/types/builder';


interface EnlargedChartProps {
  tile: DashboardTile;
  result: QueryResult;
}

const COLORS = ['#6b8e3d', '#7cb342', '#8bc34a', '#9ccc65', '#aed581', '#c5e1a5', '#42a5f5', '#66bb6a', '#81c784', '#a5d6a7'];

export function EnlargedChart({ tile, result }: EnlargedChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const { title, chartType: rawChartType } = tile.visualization;

  // Force heatmap for specific titles if needed
  const chartType = title === 'Case Report by Area' || title === 'Case Category by Branch' || title === 'Case Category by Airlines' 
    ? 'heatmap' 
    : rawChartType;



  const renderChart = () => {
    return (
      <div className="w-full">
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
    <div ref={chartRef} className="relative">
      <div className="pt-2">
        {renderChart()}
      </div>
    </div>
  );
}
