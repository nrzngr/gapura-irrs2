'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AreaSubCategoryDetail from '@/components/charts/area-sub-category/AreaSubCategoryDetail';
import DetailFilterHeader from '@/components/chart-detail/DetailFilterHeader';

interface FilterState {
  hub: string;
  branch: string;
  airlines: string;
  area: string;
  sourceSheet: 'NON CARGO' | 'CGO';
}

export default function ApronAreaCategoryDetailPage() {
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
        title="Apron Area Category"
        subtitle="Ramp and airside category analysis: trend, branch concentration, airline contribution, and risk drivers"
        filters={filters}
        setFilters={setFilters}
        sourcePage={sourcePage}
      />

      <main className="w-full px-4 sm:px-6 py-6">
        <div className="max-w-[1800px] mx-auto">
          <AreaSubCategoryDetail
            filters={filters}
            categoryField="apron_area_category"
            title="Apron Area Category Detail"
            subtitle="Which apron categories dominate, where they occur, and what drives them."
          />
        </div>
      </main>
    </div>
  );
}
