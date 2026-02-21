'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReportByCaseCategoryDetail from '@/components/charts/report-by-case-category/ReportByCaseCategoryDetail';

interface FilterState {
  hub: string;
  branch: string;
  airlines: string;
  area: string;
  sourceSheet: 'NON CARGO' | 'CGO';
}

function EmbedReportByCaseCategoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceSheet = searchParams.get('sourceSheet') === 'CGO' ? 'CGO' : 'NON CARGO';
  const sourcePage = searchParams.get('sourcePage') || 'customer-feedback-main';
  
  const getBackUrl = () => {
    const baseUrl = sourcePage && sourcePage !== 'main' 
      ? `/embed/custom/${sourcePage.toLowerCase().replace(/\s+/g, '-')}`
      : '/embed/custom/customer-feedback-main';
    return `${baseUrl}?${searchParams.toString()}`;
  };
  
  const isStatic = searchParams.get('viewMode') === 'static';
  const hideFilters = searchParams.get('hideFilters') === 'true' || isStatic;
  const filterCriteriaParam = searchParams.get('filterCriteria');
  const dateFromParam = searchParams.get('dateFrom');
  const dateToParam = searchParams.get('dateTo');
  
  const filterCriteria = filterCriteriaParam ? JSON.parse(filterCriteriaParam) : null;
  
  const [filters, setFilters] = useState<FilterState>({
    hub: searchParams.get('hub') || 'all',
    branch: searchParams.get('branch') || 'all',
    airlines: searchParams.get('airlines') || 'all',
    area: searchParams.get('area') || 'all',
    sourceSheet,
  });

  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: dateFromParam || '',
    to: dateToParam || '',
  });

  return (
    <div className={cn("min-h-screen bg-[#f5f5f5] embed-detail-page", isStatic && "bg-white")}>
      {!isStatic && (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="h-16 px-4 sm:px-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.push(getBackUrl())}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-[#6b8e3d]"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-xl font-black text-gray-900 tracking-tight">Report by Case Category</h1>
                <p className="text-xs text-gray-500">Detailed analysis by category (Irregularity, Complaint, Compliment)</p>

                {hideFilters && !isStatic && (
                  <p className="text-[10px] font-semibold text-amber-600 mt-1">
                    Filtered View {dateRange.from && dateRange.to ? `(${dateRange.from} - ${dateRange.to})` : ''}
                  </p>
                )}
              </div>
            </div>
          </div>
          

        </header>
      )}

      <main className={cn("w-full px-4 sm:px-6 py-6", isStatic && "p-0")}>
        <div className={cn("max-w-[1800px] mx-auto", isStatic && "max-w-none")}>
          <ReportByCaseCategoryDetail filters={filters} dateRange={hideFilters ? dateRange : undefined} />
        </div>
      </main>
    </div>
  );
}

export default function EmbedReportByCaseCategoryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#6b8e3d]"></div>
      </div>
    }>
      <EmbedReportByCaseCategoryContent />
    </Suspense>
  );
}
