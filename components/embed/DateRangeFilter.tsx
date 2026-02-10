'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';

interface DateRangeFilterProps {
  className?: string;
}

export function DateRangeFilter({ className = '' }: DateRangeFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentRange = searchParams.get('range') || '7d';
  
  const handleRangeChange = (range: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('range', range);
    router.push(`${pathname}?${params.toString()}`);
  };
  
  return (
    <div className={`date-filter ${className}`}>
      <button
        className={`date-filter-btn ${currentRange === '7d' ? 'active' : ''}`}
        onClick={() => handleRangeChange('7d')}
      >
        7 Hari Terakhir
      </button>
      <button
        className={`date-filter-btn ${currentRange === '30d' ? 'active' : ''}`}
        onClick={() => handleRangeChange('30d')}
      >
        30 Hari Terakhir
      </button>
    </div>
  );
}
