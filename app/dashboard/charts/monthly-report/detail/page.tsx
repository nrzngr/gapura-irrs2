'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import MonthlyReportDetail from '@/components/charts/monthly-report/MonthlyReportDetail';
import DetailFilterHeader from '@/components/chart-detail/DetailFilterHeader';

interface FilterState {
  hub: string;
  branch: string;
  airlines: string;
  area: string;
  month: string;
  sourceSheet: 'NON CARGO' | 'CGO';
}

export default function MonthlyReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceSheet = searchParams.get('sourceSheet') === 'CGO' ? 'CGO' : 'NON CARGO';
  const sourcePage = searchParams.get('sourcePage') || 'customer-feedback-main';
  
  const [filters, setFilters] = useState<FilterState>({
    hub: searchParams.get('hub') || 'all',
    branch: searchParams.get('branch') || 'all',
    airlines: searchParams.get('airlines') || 'all',
    area: searchParams.get('area') || 'all',
    month: 'all',
    sourceSheet,
  });

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <DetailFilterHeader 
        title="Monthly Report"
        subtitle="Detailed monthly analysis with trend & anomaly detection"
        filters={filters}
        setFilters={setFilters}
        sourcePage={sourcePage}
        extraFilters={
          <div className="relative group">
            <select
              value={filters.month}
              onChange={(e) => setFilters(f => ({ ...f, month: e.target.value }))}
              className="appearance-none pl-3 pr-8 py-2 bg-white hover:bg-gray-50 border border-[var(--surface-4)] rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--brand-emerald-500)] focus:border-transparent min-w-[140px] shadow-sm cursor-pointer"
            >
              <option value="all">All Months</option>
              <option value="2026-02">February 2026</option>
              <option value="2026-01">January 2026</option>
              <option value="2025-12">December 2025</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)] group-hover:text-[var(--brand-primary)] transition-colors">
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        }
      />

      <main className="w-full px-4 sm:px-6 py-6">
        <div className="max-w-[1800px] mx-auto">
          <MonthlyReportDetail filters={filters} />
        </div>
      </main>
    </div>
  );
}
