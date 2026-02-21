'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ReportByCaseCategoryDetail from '@/components/charts/report-by-case-category/ReportByCaseCategoryDetail';
import DetailFilterHeader from '@/components/chart-detail/DetailFilterHeader';

interface FilterState {
  hub: string;
  branch: string;
  airlines: string;
  area: string;
  sourceSheet: 'NON CARGO' | 'CGO';
}

export default function ReportByCaseCategoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceSheet = searchParams.get('sourceSheet') === 'CGO' ? 'CGO' : 'NON CARGO';
  const sourcePage = searchParams.get('sourcePage') || searchParams.get('originSlug') || 'customer-feedback-main';
  
  // Check if filters should be hidden (from filtered dashboard)
  const hideFilters = searchParams.get('hideFilters') === 'true';
  const dateFromParam = searchParams.get('dateFrom');
  const dateToParam = searchParams.get('dateTo');
  
  const [filters, setFilters] = useState<FilterState>({
    hub: searchParams.get('hub') || 'all',
    branch: searchParams.get('branch') || 'all',
    airlines: searchParams.get('airlines') || 'all',
    area: searchParams.get('area') || 'all',
    sourceSheet,
  });

  const dateRange = {
    from: dateFromParam || '',
    to: dateToParam || '',
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <DetailFilterHeader 
        title="Report by Case Category"
        subtitle="Detailed analysis by category (Irregularity, Complaint, Compliment)"
        filters={filters}
        setFilters={setFilters}
        sourcePage={sourcePage}
        hideFilters={hideFilters}
        extraHeaderInfo={hideFilters && (
          <p className="text-[10px] font-semibold text-amber-600 mt-1">
            Filtered View {dateRange.from && dateRange.to ? `(${dateRange.from} - ${dateRange.to})` : ''}
          </p>
        )}
      />

      <main className="w-full px-4 sm:px-6 py-6">
        <div className="max-w-[1800px] mx-auto">
          <ReportByCaseCategoryDetail filters={filters} dateRange={hideFilters ? dateRange : undefined} />
        </div>
      </main>
    </div>
  );
}
