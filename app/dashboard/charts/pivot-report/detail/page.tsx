'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PivotReportDetail from '@/components/charts/pivot-report/PivotReportDetail';
import DetailFilterHeader from '@/components/chart-detail/DetailFilterHeader';

interface FilterState {
  hub: string;
  branch: string;
  airlines: string;
  area: string;
  sourceSheet: 'NON CARGO' | 'CGO';
}

function PivotReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pivotTitle = searchParams.get('title') || 'Pivot Report';
  const sourceSheet = searchParams.get('sourceSheet') === 'CGO' ? 'CGO' : 'NON CARGO';
  const sourcePage = searchParams.get('sourcePage') || searchParams.get('originSlug') || 'customer-feedback-main';
  
  const [filters, setFilters] = useState<FilterState>({
    hub: searchParams.get('hub') || 'all',
    branch: searchParams.get('branch') || 'all',
    airlines: searchParams.get('airlines') || 'all',
    area: searchParams.get('area') || 'all',
    sourceSheet,
  });

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <DetailFilterHeader 
        title={pivotTitle}
        subtitle="Detailed pivot/heatmap analysis with cross-tabulation"
        filters={filters}
        setFilters={setFilters}
        sourcePage={sourcePage}
      />

      <main className="w-full px-4 sm:px-6 py-6">
        <div className="max-w-[1800px] mx-auto">
          <PivotReportDetail filters={filters} pivotTitle={pivotTitle} />
        </div>
      </main>
    </div>
  );
}

export default function PivotReportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--brand-primary)]"></div>
      </div>
    }>
      <PivotReportContent />
    </Suspense>
  );
}
