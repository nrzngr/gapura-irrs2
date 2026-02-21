'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import AreaSubCategoryDetail from '@/components/charts/area-sub-category/AreaSubCategoryDetail';

interface FilterState {
  hub: string;
  branch: string;
  airlines: string;
  area: string;
  sourceSheet: 'NON CARGO' | 'CGO';
}

export default function TerminalAreaCategoryDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceSheet = searchParams.get('sourceSheet') === 'CGO' ? 'CGO' : 'NON CARGO';
  const sourcePage = searchParams.get('sourcePage') || 'customer-feedback-main';
  
  const getBackUrl = () => {
    if (sourcePage && sourcePage !== 'main') {
      return `/embed/custom/${sourcePage.toLowerCase().replace(/\s+/g, '-')}`;
    }
    return '/embed/custom/customer-feedback-main';
  };
  
  const [filters, setFilters] = useState<FilterState>({
    hub: searchParams.get('hub') || 'all',
    branch: searchParams.get('branch') || 'all',
    airlines: searchParams.get('airlines') || 'all',
    area: searchParams.get('area') || 'all',
    sourceSheet,
  });

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
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
              <h1 className="text-xl font-black text-gray-900 tracking-tight">Terminal Area Category</h1>
              <p className="text-xs text-gray-500">Passenger touchpoint category analysis: concentration, trend, hotspots, and root causes</p>
              <p className="text-[10px] font-semibold text-emerald-600 mt-1">Source: {filters.sourceSheet}</p>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 pb-4 border-b border-gray-100">
          <div className="flex flex-wrap gap-3">
            <select
              value={filters.hub}
              onChange={(e) => setFilters((f) => ({ ...f, hub: e.target.value }))}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b8e3d]"
            >
              <option value="all">All Hubs</option>
              <option value="CGK">CGK</option>
              <option value="SUB">SUB</option>
            </select>

            <select
              value={filters.branch}
              onChange={(e) => setFilters((f) => ({ ...f, branch: e.target.value }))}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b8e3d]"
            >
              <option value="all">All Branches</option>
              <option value="CGK">CGK</option>
              <option value="DPS">DPS</option>
              <option value="SUB">SUB</option>
            </select>

            <select
              value={filters.airlines}
              onChange={(e) => setFilters((f) => ({ ...f, airlines: e.target.value }))}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b8e3d]"
            >
              <option value="all">All Airlines</option>
              <option value="Garuda">Garuda</option>
              <option value="Citilink">Citilink</option>
              <option value="Batik Air">Batik Air</option>
            </select>

            <select
              value={filters.area}
              onChange={(e) => setFilters((f) => ({ ...f, area: e.target.value }))}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b8e3d]"
            >
              <option value="all">All Areas</option>
              <option value="Terminal Area">Terminal Area</option>
              <option value="Landside">Landside</option>
            </select>
          </div>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 py-6">
        <div className="max-w-[1800px] mx-auto">
          <AreaSubCategoryDetail
            filters={filters}
            categoryField="terminal_area_category"
            title="Terminal Area Category Detail"
            subtitle="Which terminal categories dominate, where they occur, and what drives them."
          />
        </div>
      </main>
    </div>
  );
}
