'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AirlineIntelligenceDetail from '@/components/charts/case-category-by-airline/AirlineIntelligenceDetail';
import DetailFilterHeader from '@/components/chart-detail/DetailFilterHeader';

interface FilterState {
  hub: string;
  branch: string;
  airlines: string;
  area: string;
  sourceSheet: 'NON CARGO' | 'CGO';
}

export default function CaseCategoryByAirlinePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceSheet = searchParams.get('sourceSheet') === 'CGO' ? 'CGO' : 'NON CARGO';
  const sourcePage = searchParams.get('sourcePage') || 'customer-feedback-main';
  
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
        title="Airline Intelligence"
        subtitle="Entity performance risk — is this airline high risk?"
        filters={filters}
        setFilters={setFilters}
        sourcePage={sourcePage}
      />

      <main className="w-full px-4 sm:px-6 py-6">
        <div className="max-w-[1800px] mx-auto">
          <AirlineIntelligenceDetail filters={filters} />
        </div>
      </main>
    </div>
  );
}
