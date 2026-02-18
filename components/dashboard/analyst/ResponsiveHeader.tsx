'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock,
  CheckCircle2,
  FileText,
  RefreshCw,
  Loader2,
  Plus,
  LayoutDashboard,
  Shield,
  MoreVertical,
  Calendar,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MobileActionMenu } from '@/components/ui/MobileActionMenu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface ResponsiveHeaderProps {
  dateRange: 'all' | 'week' | 'month';
  onDateRangeChange: (range: 'all' | 'week' | 'month') => void;
  onRefresh: () => void;
  refreshing: boolean;
  onCustomerFeedback: () => void;
  cfLoading: boolean;
  onFilterClick: () => void;
}

/**
 * Responsive Header Component for Analyst Dashboard
 * Mobile-first design with optimized touch targets
 */
export function ResponsiveHeader({
  dateRange,
  onDateRangeChange,
  onRefresh,
  refreshing,
  onCustomerFeedback,
  cfLoading,
  onFilterClick,
}: ResponsiveHeaderProps) {
  const router = useRouter();
  const [isDateOpen, setIsDateOpen] = useState(false);

  const dateRangeOptions = [
    { value: 'all' as const, label: 'Semua', shortLabel: 'Semua' },
    { value: 'month' as const, label: '30 Hari', shortLabel: '30d' },
    { value: 'week' as const, label: '7 Hari', shortLabel: '7d' },
  ];

  const currentDateLabel = dateRangeOptions.find((o) => o.value === dateRange);

  // Mobile menu actions for hidden buttons
  const mobileMenuActions = [
    {
      label: 'Customer Feedback',
      icon: <LayoutDashboard className="w-4 h-4" />,
      onClick: onCustomerFeedback,
    },
    {
      label: 'Filter Dashboard',
      icon: <Shield className="w-4 h-4" />,
      onClick: onFilterClick,
    },
  ];

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Title Section */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          Pusat Komando & Analytics
        </h1>
        <p className="text-sm sm:text-base text-[var(--text-secondary)] font-medium">
          Divisi Operational Services Center
        </p>
      </div>

      {/* Controls Section - Responsive Layout */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center sm:justify-between">
        {/* Date Range Selector */}
        <div className="flex items-center gap-2">
          {/* Desktop: Segmented Control */}
          <div className="hidden sm:flex bg-[var(--surface-2)] rounded-xl p-1 border border-[var(--surface-4)]">
            {dateRangeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => onDateRangeChange(option.value)}
                className={cn(
                  'px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap min-h-[44px]',
                  dateRange === option.value
                    ? 'bg-[var(--brand-primary)] text-white shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Mobile: Dropdown */}
          <div className="sm:hidden flex-1">
            <DropdownMenu open={isDateOpen} onOpenChange={setIsDateOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full min-h-[44px] justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {currentDateLabel?.label}
                  </span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[200px]">
                {dateRangeOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => {
                      onDateRangeChange(option.value);
                      setIsDateOpen(false);
                    }}
                    className={cn(
                      'min-h-[44px] cursor-pointer',
                      dateRange === option.value && 'bg-blue-50 text-blue-600'
                    )}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Desktop: Full buttons */}
          <Button
            onClick={onCustomerFeedback}
            disabled={cfLoading}
            className={cn(
              'hidden xl:inline-flex items-center gap-2 min-h-[44px]',
              'bg-gradient-to-r from-emerald-600 to-green-500 text-white',
              'hover:shadow-lg hover:shadow-emerald-500/25',
              cfLoading && 'opacity-70 cursor-not-allowed'
            )}
          >
            {cfLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <LayoutDashboard size={16} />
            )}
            <span className="hidden 2xl:inline">Feedback</span>
          </Button>

          <Button
            onClick={onFilterClick}
            variant="outline"
            className="hidden xl:inline-flex items-center gap-2 min-h-[44px]"
          >
            <Shield size={16} />
            <span className="hidden 2xl:inline">Filter</span>
          </Button>

          {/* Mobile: Action menu for hidden buttons */}
          <div className="xl:hidden">
            <MobileActionMenu
              actions={mobileMenuActions}
              triggerLabel="Menu"
              align="end"
            />
          </div>

          {/* Create Report Button */}
          <Button
            onClick={() => router.push('/dashboard/employee/new')}
            className="min-h-[44px] bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white"
          >
            <Plus size={18} className="sm:mr-2" />
            <span className="hidden sm:inline">Laporan</span>
          </Button>

          {/* Divider - hidden on smallest screens */}
          <div className="hidden sm:block h-8 w-px bg-[var(--surface-4)]" />

          {/* Refresh Button */}
          <Button
            onClick={onRefresh}
            disabled={refreshing}
            variant="outline"
            className={cn(
              'min-h-[44px] min-w-[44px] sm:min-w-fit',
              'inline-flex items-center gap-2',
              refreshing && 'opacity-50'
            )}
          >
            <RefreshCw
              size={16}
              className={cn(refreshing && 'animate-spin')}
            />
            <span className="hidden sm:inline">
              {refreshing ? '...' : 'Refresh'}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
