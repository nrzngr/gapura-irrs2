'use client';

import { Report } from '@/types';

export interface AreaSummary {
  area: string;
  total: number;
  irregularity: number;
  complaint: number;
  compliment: number;
  irregularityRate: number;
  netSentiment: number;
  riskIndex: number;
  rank: number;
  contribution: number;
  growth: number;
}

export interface TrendDataPoint {
  month: string;
  total: number;
  Irregularity: number;
  Complaint: number;
}

export interface AreaCategoryData {
  area: string;
  Irregularity: number;
  Complaint: number;
  Compliment: number;
}

export interface BranchByAreaData {
  branch: string;
  area: string;
  count: number;
}

export interface AirlineByAreaData {
  airline: string;
  area: string;
  count: number;
}

export interface RootCauseByAreaData {
  rootCause: string;
  area: string;
  count: number;
  category: string;
}

export interface AreaReportRecord {
  [key: string]: unknown;
}

export interface CellIntelligence {
  title: string;
  total: number;
  count: number; // For UI consistency
  branchTotal: number;
  systemTotal: number;
  branchShare: number;
  systemShare: number;
  rank: number;
  totalCombinations: number;
  irregularityCount: number;
  complaintCount: number;
  complimentCount: number;
  irregularityRate: number;
  complaintRate: number;
  complimentRate: number;
  contribution: number; // Added for UI
  severityScore: number; // Added for UI
  momGrowth: number;
  riskScore: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
}

export interface BranchAreaPareto {
  branch: string; // "Branch - Area" or just Branch
  count: number;
  cumulativePercent: number;
}

interface BaseFilters {
  hub?: string;
  branch?: string;
  airlines?: string;
  area?: string;
  sourceSheet?: string;
}

let reportsCache: Report[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 1000 * 60 * 5;

export interface SeverityDistribution {
  name: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

const INVALID_CAUSE_VALUES = ['#n/a', 'unknown', 'nil', '-', '', 'null', 'none', 'na', 'n/a', 'tidak ada', 'belum diketahui'];
const INVALID_BRANCH_VALUES = ['unknown', 'nil', '-', '', 'null', 'none', 'na', 'n/a', '#n/a'];

function isValidValue(value: string | undefined | null): boolean {
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

function getMonthKey(dateStr: string | undefined): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  } catch {
    return '';
  }
}

async function fetchReportsFromSheets(): Promise<Report[]> {
  const now = Date.now();

  if (reportsCache && (now - lastFetchTime) < CACHE_DURATION) {
    return reportsCache as Report[];
  }

  try {
    const response = await fetch('/api/reports/analytics', {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch reports: ' + response.status);
    }

    const data = await response.json();
    reportsCache = data.reports || [];
    lastFetchTime = now;
    return reportsCache || [];
  } catch (error) {
    console.error('Error fetching reports:', error);
    return reportsCache || [];
  }
}

function filterReports(reports: Report[], filters: BaseFilters): Report[] {
  return reports.filter(report => {
    // Filter by source sheet (default NON CARGO for backward compatibility)
    const sheet = filters.sourceSheet || 'NON CARGO';
    if (report.source_sheet && report.source_sheet !== sheet) return false;

    if (filters.hub && filters.hub !== 'all' && report.hub !== filters.hub) return false;

    // Standardize branch filtering to match grouping fallbacks
    if (filters.branch && filters.branch !== 'all') {
      const reportBranch = report.branch || report.reporting_branch || report.station_code;
      if (reportBranch !== filters.branch) return false;
    }

    // Standardize area filtering to use getArea fallback
    if (filters.area && filters.area !== 'all') {
      const reportArea = getArea(report);
      const category = normalizeCategory(report.main_category || report.category || report.irregularity_complain_category);
      
      // Special case: if area filter is 'Irregularity', 'Complaint', or 'Compliment', 
      // check if it matches the report's category as a fallback.
      const isCategoryFilter = ['Irregularity', 'Complaint', 'Compliment'].includes(filters.area);
      
      if (isCategoryFilter) {
        if (reportArea !== filters.area && category !== filters.area) return false;
      } else {
        if (reportArea !== filters.area) return false;
      }
    }

    if (filters.airlines && filters.airlines !== 'all' && report.airlines !== filters.airlines) return false;
    return true;
  });
}

function getArea(report: Report): string {
  return report.area || report.terminal_area_category || report.apron_area_category || report.general_category || '';
}

export async function fetchAreaSummary(filters: BaseFilters = {}): Promise<AreaSummary[]> {
  const reports = await fetchReportsFromSheets();
  const filtered = filterReports(reports, filters);

  const areaMap = new Map<string, {
    total: number;
    irregularity: number;
    complaint: number;
    compliment: number;
  }>();

  filtered.forEach(report => {
    const area = getArea(report);
    if (!isValidValue(area)) return;

    if (!areaMap.has(area)) {
      areaMap.set(area, { total: 0, irregularity: 0, complaint: 0, compliment: 0 });
    }

    const data = areaMap.get(area)!;
    const category = normalizeCategory(report.main_category || report.category || report.irregularity_complain_category);

    data.total++;
    if (category === 'Irregularity') data.irregularity++;
    else if (category === 'Complaint') data.complaint++;
    else if (category === 'Compliment') data.compliment++;
  });

  const totalReports = Array.from(areaMap.values()).reduce((sum, b) => sum + b.total, 0);

  return Array.from(areaMap.entries())
    .map(([area, data]) => {
      const total = data.total;
      return {
        area,
        total,
        irregularity: data.irregularity,
        complaint: data.complaint,
        compliment: data.compliment,
        irregularityRate: total > 0 ? (data.irregularity / total) * 100 : 0,
        netSentiment: (data.compliment + data.complaint) > 0 ? ((data.compliment - data.complaint) / (data.compliment + data.complaint)) * 100 : 0,
        riskIndex: (data.irregularity * 2) + data.complaint,
        rank: 0,
        contribution: totalReports > 0 ? (total / totalReports) * 100 : 0,
        growth: 0,
      };
    })
    .sort((a, b) => b.total - a.total)
    .map((item, idx) => ({ ...item, rank: idx + 1 }));
}

export async function fetchMonthlyTrendByArea(filters: BaseFilters = {}): Promise<TrendDataPoint[]> {
  const reports = await fetchReportsFromSheets();
  const filtered = filterReports(reports, filters);

  const monthMap = new Map<string, { total: number; Irregularity: number; Complaint: number }>();

  filtered.forEach(report => {
    const monthKey = getMonthKey(report.date_of_event || report.created_at);
    if (!monthKey) return;

    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, { total: 0, Irregularity: 0, Complaint: 0 });
    }

    const data = monthMap.get(monthKey)!;
    data.total++;

    const category = normalizeCategory(report.main_category || report.category || report.irregularity_complain_category);
    if (category === 'Irregularity') data.Irregularity++;
    else if (category === 'Complaint') data.Complaint++;
  });

  return Array.from(monthMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-14)
    .map(([month, data]) => ({ month, ...data }));
}

export async function fetchCategoryByArea(filters: BaseFilters = {}): Promise<AreaCategoryData[]> {
  const reports = await fetchReportsFromSheets();
  const filtered = filterReports(reports, filters);

  const areaMap = new Map<string, { Irregularity: number; Complaint: number; Compliment: number }>();

  filtered.forEach(report => {
    const area = getArea(report);
    if (!isValidValue(area)) return;

    if (!areaMap.has(area)) {
      areaMap.set(area, { Irregularity: 0, Complaint: 0, Compliment: 0 });
    }

    const category = normalizeCategory(report.main_category || report.category || report.irregularity_complain_category);
    const data = areaMap.get(area)!;

    if (category === 'Irregularity') data.Irregularity++;
    else if (category === 'Complaint') data.Complaint++;
    else if (category === 'Compliment') data.Compliment++;
  });

  return Array.from(areaMap.entries())
    .map(([area, data]) => ({ area, ...data }))
    .sort((a, b) => (b.Irregularity + b.Complaint) - (a.Irregularity + a.Complaint));
}

export async function fetchBranchByArea(filters: BaseFilters = {}): Promise<BranchByAreaData[]> {
  const reports = await fetchReportsFromSheets();
  const filtered = filterReports(reports, filters);

  const map = new Map<string, { branch: string; area: string; count: number }>();

  filtered.forEach(report => {
    const area = getArea(report);
    const branch = (report.branch || report.reporting_branch || report.station_code || 'Unknown') as string;

    if (!isValidValue(area) || !isValidValue(branch)) return;

    const key = `${branch}-${area}`;
    if (!map.has(key)) {
      map.set(key, { branch, area, count: 0 });
    }
    map.get(key)!.count++;
  });

  return Array.from(map.entries())
    .map(([, data]) => data)
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);
}

export async function fetchAirlineByArea(filters: BaseFilters = {}): Promise<AirlineByAreaData[]> {
  const reports = await fetchReportsFromSheets();
  const filtered = filterReports(reports, filters);

  const map = new Map<string, { airline: string; area: string; count: number }>();

  filtered.forEach(report => {
    const area = getArea(report);
    const airline = String(report.airlines || report.airline || 'Unknown');

    if (!isValidValue(area) || !isValidValue(airline)) return;

    const key = `${airline}-${area}`;
    if (!map.has(key)) {
      map.set(key, { airline, area, count: 0 });
    }
    map.get(key)!.count++;
  });

  return Array.from(map.entries())
    .map(([, data]) => data)
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);
}

export async function fetchRootCauseByArea(filters: BaseFilters = {}): Promise<RootCauseByAreaData[]> {
  const reports = await fetchReportsFromSheets();
  const filtered = filterReports(reports, filters);

  const causeMap = new Map<string, { area: string; count: number; category: string }>();

  filtered.forEach(report => {
    const area = getArea(report);
    const rootCause = report.root_caused || 'Unknown';

    if (!isValidValue(area) || !isValidRootCause(rootCause)) return;

    const category = normalizeCategory(report.main_category || report.category || report.irregularity_complain_category) || 'Other';
    const key = `${rootCause}-${area}`;

    if (!causeMap.has(key)) {
      causeMap.set(key, { area, count: 0, category });
    }
    causeMap.get(key)!.count++;
  });

  return Array.from(causeMap.entries())
    .map(([key, data]) => ({
      rootCause: key.split('-')[0],
      ...data,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);
}

export async function fetchAllAreaReports(filters: BaseFilters = {}): Promise<AreaReportRecord[]> {
  const reports = await fetchReportsFromSheets();
  const filtered = filterReports(reports, filters);

  return filtered.map(report => {
    const evidenceUrls = report.evidence_url || report.evidence_urls;
    let evidenceLink = '-';
    if (evidenceUrls) {
      if (Array.isArray(evidenceUrls)) {
        evidenceLink = evidenceUrls.slice(0, 3).map((url, i) =>
          `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">Link ${i + 1}</a>`
        ).join(' ');
        if (evidenceUrls.length > 3) {
          evidenceLink += ` +${evidenceUrls.length - 3} more`;
        }
      } else if (typeof evidenceUrls === 'string' && evidenceUrls.startsWith('http')) {
        evidenceLink = `<a href="${evidenceUrls}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">Link</a>`;
      }
    }

    return {
      Date: (report.date_of_event || report.created_at) ? new Date(report.date_of_event || report.created_at || '').toLocaleDateString('id-ID') : '-',
      Area: getArea(report) || '-',
      Branch: report.branch || report.reporting_branch || report.station_code || '-',
      Category: normalizeCategory(report.main_category || report.category || report.irregularity_complain_category) || '-',
      Airline: report.airlines || report.airline || '-',
      'Root Cause': report.root_caused || '-',
      'Action Taken': report.action_taken || '-',
      'Evidence': evidenceLink,
    };
  });
}

export async function fetchCellIntelligence(branch: string, area: string, filters: BaseFilters = {}): Promise<CellIntelligence | null> {
  const reports = await fetchReportsFromSheets();
  const allFiltered = filterReports(reports, filters);
  
  // Calculate system total for context
  const systemTotal = allFiltered.length;
  if (systemTotal === 0) return null;

  // Group by combinations for ranking
  const comboMap = new Map<string, number>();
  allFiltered.forEach(r => {
    const b = r.branch || r.reporting_branch || r.station_code || 'Unknown';
    const a = getArea(r);
    if (!isValidValue(b) || !isValidValue(a)) return;
    const key = `${b}:::${a}`;
    comboMap.set(key, (comboMap.get(key) || 0) + 1);
  });

  const sortedCombos = Array.from(comboMap.entries()).sort((a, b) => b[1] - a[1]);
  const currentKey = `${branch}:::${area}`;
  const rank = sortedCombos.findIndex(c => c[0] === currentKey) + 1;
  const count = comboMap.get(currentKey) || 0;

  // Branch total
  const branchReports = allFiltered.filter(r => (r.branch || r.reporting_branch || r.station_code) === branch);
  const branchTotal = branchReports.length;

  // Cell specific metrics
  const cellReports = branchReports.filter(r => getArea(r) === area);
  
  // MoM Growth
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

  const currentMonthCount = cellReports.filter(r => getMonthKey(r.date_of_event || r.created_at) === currentMonthKey).length;
  const lastMonthCount = cellReports.filter(r => getMonthKey(r.date_of_event || r.created_at) === lastMonthKey).length;
  const momGrowth = lastMonthCount > 0 ? ((currentMonthCount - lastMonthCount) / lastMonthCount) * 100 : 0;

  // Category counts
  let irreg = 0, comp = 0, copl = 0;
  cellReports.forEach(r => {
    const cat = normalizeCategory(r.main_category || r.category || r.irregularity_complain_category);
    if (cat === 'Irregularity') irreg++;
    else if (cat === 'Complaint') comp++;
    else if (cat === 'Compliment') copl++;
  });

  // Risk Score Index (Requirement 9)
  const volumeWeight = Math.min(count * 2, 40); // Max 40
  const growthWeight = Math.min(Math.max(momGrowth, 0) / 2, 20); // Max 20
  const irregularityRate = count > 0 ? (irreg / count) * 100 : 0;
  const irregWeight = Math.min(irregularityRate / 2.5, 40); // Max 40
  const riskScore = volumeWeight + growthWeight + irregWeight;

  let riskLevel: 'Low' | 'Medium' | 'High' | 'Critical' = 'Low';
  if (riskScore >= 75) riskLevel = 'Critical';
  else if (riskScore >= 50) riskLevel = 'High';
  else if (riskScore >= 25) riskLevel = 'Medium';

  // Weighted severity (Irregularity=3, Complaint=2, Compliment=1)
  const severityScore = count > 0 ? (irreg * 3 + comp * 2 + copl * 1) / count : 0;

  return {
    title: `${branch} – ${area} Intelligence`,
    total: count,
    count, // For UI alias
    branchTotal,
    systemTotal,
    branchShare: branchTotal > 0 ? (count / branchTotal) * 100 : 0,
    systemShare: systemTotal > 0 ? (count / systemTotal) * 100 : 0,
    rank,
    totalCombinations: sortedCombos.length,
    irregularityCount: irreg,
    complaintCount: comp,
    complimentCount: copl,
    irregularityRate,
    complaintRate: count > 0 ? (comp / count) * 100 : 0,
    complimentRate: count > 0 ? (copl / count) * 100 : 0,
    contribution: systemTotal > 0 ? (count / systemTotal) * 100 : 0,
    severityScore,
    momGrowth,
    riskScore,
    riskLevel
  };
}

export async function fetchBranchAreaPareto(filters: BaseFilters = {}): Promise<BranchAreaPareto[]> {
  const reports = await fetchReportsFromSheets();
  const filtered = filterReports(reports, filters);
  
  const map = new Map<string, number>();
  filtered.forEach(r => {
    const b = r.branch || r.reporting_branch || r.station_code || 'Unknown';
    const a = getArea(r);
    if (!isValidValue(b) || !isValidValue(a)) return;
    const key = `${b} - ${a}`;
    map.set(key, (map.get(key) || 0) + 1);
  });

  const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((s, c) => s + c[1], 0);
  
  let cumulative = 0;
  return sorted.slice(0, 20).map(([branch, count]) => {
    cumulative += count;
    return {
      branch,
      count,
      cumulativePercent: total > 0 ? (cumulative / total) * 100 : 0
    };
  });
}
