'use client';

import { Report } from '@/types';

const INVALID_CAUSE_VALUES = ['#n/a', 'unknown', 'nil', '-', '', 'null', 'none', 'na', 'n/a', 'tidak ada', 'belum diketahui'];
const INVALID_BRANCH_VALUES = ['unknown', 'nil', '-', '', 'null', 'none', 'na', 'n/a', '#n/a'];

function isValidBranch(value: string | undefined | null): boolean {
  if (!value) return false;
  const normalized = String(value).trim().toLowerCase();
  return !INVALID_BRANCH_VALUES.includes(normalized);
}

function isValidRootCause(value: string | undefined | null): boolean {
  if (!value) return false;
  const normalized = String(value).trim().toLowerCase();
  return !INVALID_CAUSE_VALUES.includes(normalized);
}

function normalizeCategory(category: string | undefined): string | null {
  if (!category) return null;
  const normalized = category.toLowerCase();
  if (normalized.includes('irregular')) return 'Irregularity';
  if (normalized.includes('complain')) return 'Complaint';
  if (normalized.includes('compliment')) return 'Compliment';
  return null;
}

export interface CategoryData {
  name: string;
  count: number;
  percentage: number;
  growth: number;
}

export interface TrendDataPoint {
  month: string;
  Irregularity: number;
  Complaint: number;
  Compliment: number;
}

export interface BranchCategoryData {
  branch: string;
  Irregularity: number;
  Complaint: number;
  Compliment: number;
}

export interface AirlineCategoryData {
  airline: string;
  Irregularity: number;
  Complaint: number;
  Compliment: number;
  total: number;
}


export interface RootCauseData {
  cause: string;
  category: string;
  count: number;
}

export interface ReportRecord {
  [key: string]: unknown;
}

interface BaseFilters {
  hub?: string;
  branch?: string;
  airlines?: string;
  area?: string;
  sourceSheet?: string;
  dateFrom?: string;
  dateTo?: string;
}

let reportsCache: Report[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

async function fetchReportsFromSheets(): Promise<Report[]> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (reportsCache && (now - lastFetchTime) < CACHE_DURATION) {
    return reportsCache as Report[];
  }

  try {
    const response = await fetch('/api/reports/analytics', {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch reports');
    }
    
    const data = await response.json();
    console.log('[data.ts] Fetched reports count:', data.reports?.length);
    if (data.reports?.length > 0) {
      console.log('[data.ts] Sample report:', JSON.stringify(data.reports[0]).substring(0, 200));
    }
    const reports = data.reports || [];
    reportsCache = reports;
    lastFetchTime = now;
    return reports;
  } catch (error) {
    console.error('Error fetching reports from Google Sheets:', error);
    // Return cached data even if expired, as fallback
    return reportsCache || [];
  }
}

function filterReports(reports: Report[], filters: BaseFilters): Report[] {
  return reports.filter(report => {
    // Filter by source sheet (default NON CARGO for backward compatibility)
    const sheet = filters.sourceSheet || 'NON CARGO';
    if (report.source_sheet && report.source_sheet !== sheet) return false;
    
    if (filters.hub && filters.hub !== 'all' && report.hub !== filters.hub) {
      return false;
    }
    if (filters.branch && filters.branch !== 'all' && report.branch !== filters.branch) {
      return false;
    }
    if (filters.airlines && filters.airlines !== 'all' && report.airlines !== filters.airlines) {
      return false;
    }
    if (filters.area && filters.area !== 'all' && report.area !== filters.area) {
      return false;
    }
    
    // Date range filtering
    if (filters.dateFrom || filters.dateTo) {
      const reportDate = report.date_of_event || report.created_at || report.incident_date;
      if (reportDate) {
        const date = new Date(reportDate);
        if (!isNaN(date.getTime())) {
          if (filters.dateFrom) {
            const fromDate = new Date(filters.dateFrom);
            if (date < fromDate) return false;
          }
          if (filters.dateTo) {
            const toDate = new Date(filters.dateTo);
            // Include the entire end date
            toDate.setHours(23, 59, 59, 999);
            if (date > toDate) return false;
          }
        }
      }
    }
    
    return true;
  });
}

function getMonthKey(dateStr: string | undefined): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    // Normalize to YYYY-MM
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  } catch {
    return '';
  }
}

function getPreviousMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  return `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
}

export async function fetchCategoryBreakdown(filters: BaseFilters = {}): Promise<CategoryData[]> {
  const reports = await fetchReportsFromSheets();
  const filtered = filterReports(reports, filters);

  const categoryMap = new Map<string, { count: number; prevCount: number }>();

  // Current month
  const currentDate = new Date();
  const currentMonthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  const prevMonthKey = getPreviousMonthKey(currentMonthKey);

  // Initialize categories
  ['Irregularity', 'Complaint', 'Compliment'].forEach(cat => {
    categoryMap.set(cat, { count: 0, prevCount: 0 });
  });

  // Count current month
  filtered.forEach(report => {
    const category = normalizeCategory(report.main_category || report.category || report.irregularity_complain_category);
    
    if (category && categoryMap.has(category)) {
      const current = categoryMap.get(category)!;
      current.count++;
    }
  });

  // Count previous month for growth calculation
  filtered.forEach(report => {
    const dateStr = report.date_of_event || report.created_at || report.incident_date;
    const monthKey = getMonthKey(dateStr);
    const category = normalizeCategory(report.main_category || report.category || report.irregularity_complain_category);
    
    if (monthKey === prevMonthKey && category && categoryMap.has(category)) {
      const current = categoryMap.get(category)!;
      current.prevCount++;
    }
  });

  const total = Array.from(categoryMap.values()).reduce((sum, v) => sum + v.count, 0);

  return Array.from(categoryMap.entries()).map(([name, { count, prevCount }]) => {
    const growth = prevCount > 0 ? ((count - prevCount) / prevCount) * 100 : (count > 0 ? 100 : 0);
    return {
      name,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
      growth,
    };
  }).sort((a, b) => b.count - a.count);
}

export async function fetchMonthlyTrend(filters: BaseFilters = {}): Promise<TrendDataPoint[]> {
  const reports = await fetchReportsFromSheets();
  const filtered = filterReports(reports, filters);

  const monthMap = new Map<string, { Irregularity: number; Complaint: number; Compliment: number }>();

  filtered.forEach(report => {
    const dateStr = report.date_of_event || report.created_at || report.incident_date;
    const monthKey = getMonthKey(dateStr);
    if (!monthKey) return;

    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, { Irregularity: 0, Complaint: 0, Compliment: 0 });
    }

    const category = normalizeCategory(report.main_category || report.category || report.irregularity_complain_category);
    
    if (!category) return;

    const data = monthMap.get(monthKey)!;
    
    if (category === 'Irregularity') data.Irregularity++;
    else if (category === 'Complaint') data.Complaint++;
    else if (category === 'Compliment') data.Compliment++;
  });

  return Array.from(monthMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-14)
    .map(([monthKey, data]) => {
      const [year, month] = monthKey.split('-').map(Number);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthLabel = `${year} ${months[month - 1]}`;
      return {
        month: monthLabel,
        ...data,
      };
    });
}

export async function fetchCategoryByBranch(filters: BaseFilters = {}): Promise<BranchCategoryData[]> {
  const reports = await fetchReportsFromSheets();
  const filtered = filterReports(reports, filters);

  const branchMap = new Map<string, { Irregularity: number; Complaint: number; Compliment: number }>();

  filtered.forEach(report => {
    const branch = report.branch || report.reporting_branch || report.station_code;
    if (!isValidBranch(branch)) return;
    const branchName = branch as string;
    
    if (!branchMap.has(branchName)) {
      branchMap.set(branchName, { Irregularity: 0, Complaint: 0, Compliment: 0 });
    }

    const category = normalizeCategory(report.main_category || report.category || report.irregularity_complain_category);
    if (!category) return;

    const data = branchMap.get(branchName);
    if (!data) return;
    
    if (category === 'Irregularity') data.Irregularity++;
    else if (category === 'Complaint') data.Complaint++;
    else if (category === 'Compliment') data.Compliment++;
  });

  return Array.from(branchMap.entries())
    .map(([branch, data]) => ({ branch, ...data }))
    .sort((a, b) => (b.Irregularity || 0) - (a.Irregularity || 0));
}

export async function fetchCategoryByAirline(filters: BaseFilters = {}): Promise<AirlineCategoryData[]> {
  const reports = await fetchReportsFromSheets();
  const filtered = filterReports(reports, filters);

  const airlineMap = new Map<string, { Irregularity: number; Complaint: number; Compliment: number }>();

  filtered.forEach(report => {
    const airline = report.airlines || report.airline;
    if (!isValidBranch(airline)) return;
    const airlineName = airline as string;
    
    if (!airlineMap.has(airlineName)) {
      airlineMap.set(airlineName, { Irregularity: 0, Complaint: 0, Compliment: 0 });
    }

    const category = normalizeCategory(report.main_category || report.category || report.irregularity_complain_category);
    if (!category) return;

    const data = airlineMap.get(airlineName);
    if (!data) return;
    
    if (category === 'Irregularity') data.Irregularity++;
    else if (category === 'Complaint') data.Complaint++;
    else if (category === 'Compliment') data.Compliment++;
  });

  return Array.from(airlineMap.entries())
    .map(([airline, data]) => ({
      airline,
      ...data,
      total: (data.Irregularity || 0) + (data.Complaint || 0) + (data.Compliment || 0),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);
}

export async function fetchRootCauses(filters: BaseFilters = {}): Promise<RootCauseData[]> {
  const reports = await fetchReportsFromSheets();
  const filtered = filterReports(reports, filters);

  const causeMap = new Map<string, { category: string; count: number }>();

  filtered.forEach(report => {
    const category = normalizeCategory(report.main_category || report.category || report.irregularity_complain_category) || 'Other';

    const rootCause = report.root_caused;
    
    // Filter out invalid root causes
    if (!isValidRootCause(rootCause)) return;
    
    const key = `${rootCause}-${category}`;
    if (!causeMap.has(key)) {
      causeMap.set(key, { category, count: 0 });
    }
    causeMap.get(key)!.count++;
  });

  return Array.from(causeMap.entries())
    .map(([key, { category, count }]) => ({
      cause: key.split('-')[0],
      category,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);
}

export async function fetchAllReports(filters: BaseFilters = {}): Promise<ReportRecord[]> {
  const reports = await fetchReportsFromSheets();
  const filtered = filterReports(reports, filters);

  return filtered.map(report => ({
    Date: (() => {
      const dateVal = report.date_of_event || report.created_at;
      if (!dateVal) return '-';
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '-';
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${d.getFullYear()} ${months[d.getMonth()]}`;
    })(),
    Category: report.main_category || report.category || report.irregularity_complain_category || '-',
    Branch: report.branch || report.reporting_branch || report.station_id || '-',
    Airline: report.airlines || report.airline || '-',
    Area: report.area || '-',
    'Root Cause': report.root_caused || '-',
    'Action Taken': report.action_taken || '-',
  }));
}

export interface CategoryKPIs {
  totalReports: number;
  mostAffectedBranch: { name: string; count: number };
  topAirline: { name: string; count: number };
  avgResolutionTime: number;
}

export async function fetchCategoryKPIs(filters: BaseFilters = {}): Promise<CategoryKPIs> {
  const reports = await fetchReportsFromSheets();
  const filtered = filterReports(reports, filters);

  // Calculate KPIs
  const totalReports = filtered.length;

  // Most affected branch
  const branchCounts = new Map<string, number>();
  filtered.forEach((r) => {
    const branch = r.branch || r.reporting_branch || r.station_code || 'Unknown';
    if (isValidBranch(branch)) {
      const branchName = branch as string;
      branchCounts.set(branchName, (branchCounts.get(branchName) || 0) + 1);
    }
  });
  const branchEntries = Array.from(branchCounts.entries()).sort((a, b) => b[1] - a[1]);
  const mostAffectedBranch = branchEntries.length > 0
    ? { name: branchEntries[0][0], count: branchEntries[0][1] }
    : { name: 'None', count: 0 };

  // Top airline
  const airlineCounts = new Map<string, number>();
  filtered.forEach((r) => {
    const airline = r.airline || r.airlines || 'Unknown';
    if (isValidBranch(airline)) {
      const airlineName = airline as string;
      airlineCounts.set(airlineName, (airlineCounts.get(airlineName) || 0) + 1);
    }
  });
  const airlineEntries = Array.from(airlineCounts.entries()).sort((a, b) => b[1] - a[1]);
  const topAirline = airlineEntries.length > 0
    ? { name: airlineEntries[0][0], count: airlineEntries[0][1] }
    : { name: 'None', count: 0 };

  // Avg resolution time (placeholder - calculate from created_at to closed_at if available)
  const avgResolutionTime = 0; // TODO: Calculate when status/timestamp data available

  return {
    totalReports,
    mostAffectedBranch,
    topAirline,
    avgResolutionTime,
  };
}

export interface SeverityDistribution {
  name: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}
