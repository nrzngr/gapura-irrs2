import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/**
 * Default Chart.js options optimized for mobile
 */
export const defaultMobileChartOptions: ChartOptions<'bar' | 'line' | 'pie'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'bottom',
      labels: {
        boxWidth: 12,
        padding: 10,
        font: {
          size: 11,
        },
        usePointStyle: true,
        pointStyle: 'circle',
      },
    },
    tooltip: {
      enabled: true,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      padding: 10,
      titleFont: {
        size: 12,
      },
      bodyFont: {
        size: 11,
      },
      cornerRadius: 6,
      displayColors: true,
    },
  },
  scales: {
    x: {
      display: true,
      grid: {
        display: false,
      },
      ticks: {
        font: {
          size: 10,
        },
        maxRotation: 45,
        minRotation: 0,
      },
    },
    y: {
      display: true,
      grid: {
        color: 'rgba(0, 0, 0, 0.05)',
      },
      ticks: {
        font: {
          size: 10,
        },
      },
    },
  },
  interaction: {
    intersect: false,
    mode: 'index',
  },
};

/**
 * Chart.js options for desktop (more detailed)
 */
export const defaultDesktopChartOptions: ChartOptions<'bar' | 'line' | 'pie'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'right',
      labels: {
        boxWidth: 14,
        padding: 15,
        font: {
          size: 12,
        },
        usePointStyle: true,
        pointStyle: 'circle',
      },
    },
    tooltip: {
      enabled: true,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      padding: 12,
      titleFont: {
        size: 13,
      },
      bodyFont: {
        size: 12,
      },
      cornerRadius: 8,
      displayColors: true,
    },
  },
  scales: {
    x: {
      display: true,
      grid: {
        display: false,
      },
      ticks: {
        font: {
          size: 11,
        },
        maxRotation: 30,
        minRotation: 0,
      },
    },
    y: {
      display: true,
      grid: {
        color: 'rgba(0, 0, 0, 0.05)',
      },
      ticks: {
        font: {
          size: 11,
        },
      },
    },
  },
  interaction: {
    intersect: false,
    mode: 'index',
  },
};

/**
 * Color palette for charts
 */
export const chartColors = {
  primary: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'],
  surface: {
    grid: 'rgba(0, 0, 0, 0.05)',
    tooltip: 'rgba(0, 0, 0, 0.8)',
  },
  text: {
    primary: '#1f2937',
    secondary: '#6b7280',
    muted: '#9ca3af',
  },
};

/**
 * Generate chart colors with opacity
 */
export function generateChartColors(count: number, alpha: number = 1): string[] {
  const baseColors = chartColors.primary;
  const colors: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const color = baseColors[i % baseColors.length];
    if (alpha < 1) {
      // Convert hex to rgba
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      colors.push(`rgba(${r}, ${g}, ${b}, ${alpha})`);
    } else {
      colors.push(color);
    }
  }
  
  return colors;
}