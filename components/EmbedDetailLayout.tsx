import React from 'react';
import { ArrowLeft, Filter, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmbedDetailLayoutProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  children: React.ReactNode;
  className?: string;
  isStatic?: boolean;
  filters?: {
    dateFrom?: string;
    dateTo?: string;
    hub?: string;
    branch?: string;
    airlines?: string;
    area?: string;
  };
}

export function EmbedDetailLayout({
  title,
  subtitle,
  onBack,
  children,
  className,
  isStatic = false,
  filters,
}: EmbedDetailLayoutProps) {
  const hasActiveFilters = filters && (filters.hub !== 'all' || filters.branch !== 'all' || filters.airlines !== 'all' || filters.area !== 'all');
  const dateRange = filters?.dateFrom && filters?.dateTo ? `${filters.dateFrom} - ${filters.dateTo}` : null;

  if (isStatic) {
    return (
      <div className={cn("min-h-screen bg-white p-0", className)}>
        <div className="max-w-none mx-auto">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen bg-[#f8f9fa]", className)}>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <button 
                onClick={onBack}
                className="group p-2 hover:bg-gray-100 rounded-full transition-all duration-200 text-gray-500 hover:text-[#6b8e3d] focus:outline-none focus:ring-2 focus:ring-[#6b8e3d] focus:ring-offset-2"
                aria-label="Go back"
              >
                <ArrowLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
              </button>
            )}
            
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none">{title}</h1>
                <span className="px-2 py-0.5 rounded-full bg-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wide border border-gray-200">
                  Detail View
                </span>
              </div>
              {subtitle && (
                <p className="text-xs text-gray-500 mt-1 font-medium">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Filter Summary Badge */}
            {(hasActiveFilters || dateRange) && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                <Filter size={12} className="text-amber-600" />
                <span className="text-xs font-semibold text-amber-700">
                  {dateRange ? dateRange : 'Active Filters'}
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center border-l border-gray-200 pl-3 ml-2 gap-2">
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors" title="Share View">
                <Share2 size={18} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="max-w-[1800px] mx-auto space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}
