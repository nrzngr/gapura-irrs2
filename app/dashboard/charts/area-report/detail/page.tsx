'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import AreaReportDetail from '@/components/charts/area-report/AreaReportDetail';
import DetailFilterHeader from '@/components/chart-detail/DetailFilterHeader';

interface FilterState {
  hub: string;
  branch: string;
  airlines: string;
  area: string;
  sourceSheet: 'NON CARGO' | 'CGO';
}

export default function AreaReportPage() {
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
        title="Area Report"
        subtitle="Detailed analysis by area performance & risk profile"
        filters={filters}
        setFilters={setFilters}
        sourcePage={sourcePage}
      />

      <main className="w-full px-4 sm:px-6 py-6">
        <div className="max-w-[1800px] mx-auto">
          <AreaReportDetail filters={filters} />
        </div>
      </main>
    </div>
  );
}
