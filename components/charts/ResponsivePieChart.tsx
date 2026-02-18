'use client';

import { useMemo } from 'react';
import { Pie, Doughnut } from 'react-chartjs-2';
import { PieChart, Pie as RechartsPie, Cell, Tooltip, Legend, ResponsiveContainer as RechartsContainer } from 'recharts';
import { useViewport } from '@/hooks/useViewport';
import { adaptToPieChartData } from '@/lib/utils/chartAdapters';
import { defaultMobileChartOptions, chartColors } from './chartConfig';
import { cn } from '@/lib/utils';

interface ResponsivePieChartProps {
  data: { name: string; value: number }[];
  title?: string;
  className?: string;
  height?: string;
  donut?: boolean;
  showLegend?: boolean;
  innerRadius?: number;
}

/**
 * Responsive Pie/Donut Chart
 * Uses Chart.js on mobile/tablet, Recharts on desktop
 */
export function ResponsivePieChart({
  data,
  title,
  className,
  height = 'h-[35vh] min-h-[180px] sm:min-h-[200px] lg:min-h-[240px] lg:h-[280px]',
  donut = false,
  showLegend = true,
  innerRadius: customInnerRadius,
}: ResponsivePieChartProps) {
  const { isMobile, isTablet } = useViewport();
  const useMobileCharts = isMobile || isTablet;

  // Prepare Chart.js data
  const chartJSData = useMemo(() => {
    return adaptToPieChartData(data);
  }, [data]);

  // Chart.js options
  const chartJSOptions = useMemo(() => {
    const baseOptions = { ...defaultMobileChartOptions };
    return {
      ...baseOptions,
      plugins: {
        ...baseOptions.plugins,
        legend: {
          ...baseOptions.plugins?.legend,
          display: showLegend,
          position: 'bottom',
        },
        title: title ? {
          display: true,
          text: title,
          font: { size: 12 },
          padding: { bottom: 10 },
        } : undefined,
      },
    };
  }, [showLegend, title]);

  if (useMobileCharts) {
    const ChartComponent = donut ? Doughnut : Pie;
    return (
      <div className={cn('w-full', height, className)}>
        <ChartComponent
          data={chartJSData}
          options={chartJSOptions}
        />
      </div>
    );
  }

  // Desktop: Use Recharts
  return (
    <div className={cn('w-full', height, className)}>
      <RechartsContainer width="100%" height="100%">
        <PieChart>
          <RechartsPie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={donut ? customInnerRadius || 60 : 0}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={chartColors.primary[index % chartColors.primary.length]} />
            ))}
          </RechartsPie>
          {showLegend && <Legend />}
          <Tooltip />
        </PieChart>
      </RechartsContainer>
    </div>
  );
}