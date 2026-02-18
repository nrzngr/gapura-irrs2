'use client';

import {
  Clock,
  CheckCircle2,
  FileText,
  AlertTriangle,
  ArrowUp,
  LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface StatItem {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'purple' | 'red' | 'amber' | 'emerald';
  trend?: string;
  onClick?: () => void;
}

interface ResponsiveStatsGridProps {
  stats: {
    total: number;
    resolved: number;
    pending: number;
    highSeverity: number;
    resolutionRate?: number;
  };
  onStatClick?: (type: string) => void;
}

/**
 * Responsive Stats Grid Component
 * Mobile: 2 columns or swipeable
 * Tablet: 2 columns
 * Desktop: 4 columns
 */
export function ResponsiveStatsGrid({
  stats,
  onStatClick,
}: ResponsiveStatsGridProps) {
  const router = useRouter();

  const statItems: StatItem[] = [
    {
      title: 'Total Laporan',
      value: stats.total,
      icon: FileText,
      color: 'blue',
      onClick: () => onStatClick?.('total'),
    },
    {
      title: 'Diselesaikan',
      value: stats.resolved,
      icon: CheckCircle2,
      color: 'green',
      trend: stats.resolutionRate ? `${stats.resolutionRate}%` : undefined,
      onClick: () => onStatClick?.('resolved'),
    },
    {
      title: 'Menunggu',
      value: stats.pending,
      icon: Clock,
      color: 'amber',
      onClick: () => onStatClick?.('pending'),
    },
    {
      title: 'High Severity',
      value: stats.highSeverity,
      icon: AlertTriangle,
      color: 'red',
      onClick: () => onStatClick?.('high'),
    },
  ];

  return (
    <div
      className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-fade-in-up"
      style={{ animationDelay: '100ms' }}
    >
      {statItems.map((stat, index) => (
        <StatCard key={stat.title} {...stat} index={index} />
      ))}
    </div>
  );
}

interface StatCardProps extends StatItem {
  index: number;
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  trend,
  onClick,
  index,
}: StatCardProps) {
  const colorMap = {
    blue: {
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      border: 'border-blue-100',
      hover: 'hover:border-blue-200',
    },
    green: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
      border: 'border-emerald-100',
      hover: 'hover:border-emerald-200',
    },
    emerald: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
      border: 'border-emerald-100',
      hover: 'hover:border-emerald-200',
    },
    purple: {
      bg: 'bg-purple-50',
      text: 'text-purple-600',
      border: 'border-purple-100',
      hover: 'hover:border-purple-200',
    },
    red: {
      bg: 'bg-red-50',
      text: 'text-red-600',
      border: 'border-red-100',
      hover: 'hover:border-red-200',
    },
    amber: {
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      border: 'border-amber-100',
      hover: 'hover:border-amber-200',
    },
  };

  const c = colorMap[color];

  return (
    <div
      onClick={onClick}
      className={cn(
        'card-solid p-3 sm:p-4 border transition-all duration-200',
        'min-h-[80px] sm:min-h-[100px]',
        c.border,
        c.hover,
        onClick && 'cursor-pointer active:scale-[0.98]',
        'animate-fade-in-up'
      )}
      style={{ animationDelay: `${(index + 1) * 50}ms` }}
    >
      {/* Header with icon and trend */}
      <div className="flex items-start justify-between mb-2">
        <div
          className={cn(
            'p-1.5 sm:p-2 rounded-lg transition-colors',
            c.bg
          )}
        >
          <Icon size={16} className={cn('sm:w-5 sm:h-5', c.text)} />
        </div>
        {trend && (
          <span
            className={cn(
              'text-[10px] sm:text-xs font-bold text-emerald-600',
              'bg-emerald-50 px-1.5 sm:px-2 py-0.5 rounded-full',
              'flex items-center gap-0.5'
            )}
          >
            <ArrowUp size={10} className="sm:w-3 sm:h-3" />
            {trend}
          </span>
        )}
      </div>

      {/* Title - smaller on mobile */}
      <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-0.5 sm:mb-1">
        {title}
      </p>

      {/* Value - responsive sizing */}
      <p className="text-lg sm:text-xl lg:text-2xl font-bold text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}
