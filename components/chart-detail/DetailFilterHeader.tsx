'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Filter, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFilterOptions } from '@/hooks/useFilterOptions';
import { cn } from '@/lib/utils';

interface FilterState {
  hub: string;
  branch: string;
  airlines: string;
  area: string;
  sourceSheet: 'NON CARGO' | 'CGO';
}

interface DetailFilterHeaderProps {
  title: string;
  subtitle: string;
  filters: any;
  setFilters: (update: (prev: any) => any) => void;
  sourcePage?: string;
  hideFilters?: boolean;
  extraHeaderInfo?: React.ReactNode;
  extraFilters?: React.ReactNode;
}

export default function DetailFilterHeader({
  title,
  subtitle,
  filters,
  setFilters,
  sourcePage = 'customer-feedback-main',
  hideFilters = false,
  extraHeaderInfo,
  extraFilters
}: DetailFilterHeaderProps) {
  const router = useRouter();
  const { hubs, branches, airlines, areas, isLoading } = useFilterOptions(filters.sourceSheet);

  const getBackUrl = () => {
    if (sourcePage && sourcePage !== 'main') {
      return `/embed/custom/${sourcePage.toLowerCase().replace(/\s+/g, '-')}`;
    }
    return '/embed/custom/customer-feedback-main';
  };

  const containerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.6, 
        ease: [0.22, 1, 0.36, 1] as any,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 }
  };

  return (
    <motion.header 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="sticky top-0 z-[100] w-full bg-[var(--surface-glass)] backdrop-blur-3xl border-b border-[var(--surface-4)]"
    >
      <div className="max-w-[1800px] mx-auto px-4 sm:px-8 py-4">
        {/* Top Row: Navigation and Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <motion.button
              whileHover={{ scale: 1.1, x: -5 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => router.push(getBackUrl())}
              className="p-3 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] rounded-2xl shadow-sm border border-[var(--surface-4)] transition-colors group"
            >
              <ArrowLeft size={20} className="text-[var(--text-muted)] group-hover:text-[var(--brand-primary)]" />
            </motion.button>
            
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
                  {title}
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-[var(--brand-emerald-50)] text-[10px] font-bold text-[var(--brand-primary)] uppercase tracking-wider border border-[var(--brand-emerald-100)]">
                  {filters.sourceSheet}
                </span>
              </div>
              <p className="text-sm text-[var(--text-muted)] font-medium max-w-md">
                {subtitle}
              </p>
              {extraHeaderInfo}
            </div>
          </div>

          {/* Filter Bar */}
          {!hideFilters && (
            <motion.div 
              variants={itemVariants}
              className="flex flex-wrap items-center gap-3 bg-[var(--surface-2)]/50 p-2 rounded-2xl border border-[var(--surface-4)]"
            >
              <div className="flex items-center gap-2 px-3 text-[var(--text-muted)]">
                <Filter size={16} />
                <span className="text-xs font-bold uppercase tracking-widest">Filters</span>
              </div>

              <div className="h-4 w-px bg-[var(--surface-4)] mx-1 hidden sm:block" />

              {/* Hub Filter */}
              <FilterSelect
                label="Hub"
                value={filters.hub}
                options={['all', ...hubs]}
                onChange={(val) => setFilters(f => ({ ...f, hub: val }))}
                isLoading={isLoading}
              />

              {/* Branch Filter */}
              <FilterSelect
                label="Branch"
                value={filters.branch}
                options={['all', ...branches]}
                onChange={(val) => setFilters(f => ({ ...f, branch: val }))}
                isLoading={isLoading}
              />

              {/* Airline Filter */}
              <FilterSelect
                label="Airline"
                value={filters.airlines}
                options={['all', ...airlines]}
                onChange={(val) => setFilters(f => ({ ...f, airlines: val }))}
                isLoading={isLoading}
              />

              {/* Area Filter */}
              <FilterSelect
                label="Area"
                value={filters.area}
                options={['all', ...areas]}
                onChange={(val) => setFilters(f => ({ ...f, area: val }))}
                isLoading={isLoading}
              />

              {extraFilters}

              <motion.button
                whileHover={{ rotate: 180 }}
                transition={{ duration: 0.4 }}
                onClick={() => setFilters(f => ({ ...f, hub: 'all', branch: 'all', airlines: 'all', area: 'all' }))}
                className="p-2.5 bg-white hover:bg-[var(--surface-3)] rounded-xl border border-[var(--surface-4)] text-[var(--text-muted)] hover:text-[var(--brand-primary)] shadow-sm transition-colors"
                title="Reset Filters"
              >
                <RefreshCcw size={16} />
              </motion.button>
            </motion.div>
          )}
        </div>
      </div>
    </motion.header>
  );
}

function FilterSelect({ 
  label, 
  value, 
  options, 
  onChange,
  isLoading 
}: { 
  label: string; 
  value: string; 
  options: string[]; 
  onChange: (val: string) => void;
  isLoading?: boolean;
}) {
  return (
    <div className="relative group">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isLoading}
        className={cn(
          "appearance-none pl-3 pr-8 py-2 bg-white hover:bg-gray-50 border border-[var(--surface-4)] rounded-xl",
          "text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all",
          "focus:outline-none focus:ring-2 focus:ring-[var(--brand-emerald-500)] focus:border-transparent",
          "min-w-[120px] shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        <option value="all">All {label}s</option>
        {options.filter(opt => opt !== 'all').map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)] group-hover:text-[var(--brand-primary)] transition-colors">
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      {isLoading && value === 'all' && (
        <div className="absolute -bottom-1 left-3 right-8 h-[1px] bg-[var(--brand-primary)]/30 animate-pulse" />
      )}
    </div>
  );
}
