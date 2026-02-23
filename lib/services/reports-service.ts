import { getGoogleSheets } from '@/lib/google-sheets';
import { supabase } from '@/lib/supabase';
import { Report, ReportStatus, UserRole, Station, Unit, Position, IncidentType } from '@/types';
import { calculateSlaDeadline } from '@/lib/constants/report-status';
import { v4 as uuidv4 } from 'uuid';

// ─── Inline TTL Cache ──────────────────────────────────────────────────────
// Complexity: Time O(1) per get/set | Space O(entries)
interface CacheEntry { data: unknown; ts: number }
const ttlCache = new Map<string, CacheEntry>();
const MAX_CACHE_ENTRIES = 100;
let cacheHits = 0;
let cacheMisses = 0;

function getCache<T>(key: string, ttl: number): T | null {
  const entry = ttlCache.get(key);
  if (!entry) { cacheMisses++; return null; }
  if (Date.now() - entry.ts > ttl) {
    ttlCache.delete(key);
    cacheMisses++;
    return null;
  }
  cacheHits++;
  return entry.data as T;
}

function setCache(key: string, data: unknown): void {
  if (ttlCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = ttlCache.keys().next().value;
    if (oldest) ttlCache.delete(oldest);
  }
  ttlCache.set(key, { data, ts: Date.now() });
}

function invalidateCache(key: string): void {
  ttlCache.delete(key);
}

export function getCacheStats() {
  const total = cacheHits + cacheMisses;
  return {
    hits: cacheHits,
    misses: cacheMisses,
    keys: ttlCache.size,
    hitRatio: total > 0 ? cacheHits / total : 0,
  };
}

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || '1TFPZOAWAKubPl7iaUk8BXt2BabY1N-AcLgi-_zBQGzk';
const REPORT_SHEETS = ['NON CARGO', 'CGO'];
const SHEET_IDS: Record<string, number> = {}; // Empty to force dynamic lookup for new sheet

// Mapping from Report properties to likely Header names (for writing/reading)
// Note: Google Sheets headers use underscores (e.g., "Date_of_Event") not spaces
const PROP_TO_HEADER: Partial<Record<keyof Report, string[]>> = {
  // Key: Report Property, Value: Possible Header Names
  date_of_event: ['Date_of_Event', 'Date of Event', 'Date', 'Tanggal', 'Tanggal Kejadian', 'Incident Date'],
  jenis_maskapai: ['Jenis_Maskapai', 'Jenis Maskapai'],
  airline: ['Airlines', 'Airline', 'Maskapai'],
  airlines: ['Airlines', 'Airline', 'Maskapai'], // Dual mapping
  flight_number: ['Flight_Number', 'Flight Number', 'No Penerbangan'],
  reporting_branch: ['Reporting_Branch', 'Reporting Branch'],
  branch: ['Branch', 'Cabang', 'Reporting_Branch'],
  route: ['Route', 'Rute'],
  main_category: ['Report_Category', 'Report Category', 'Kategori Laporan', 'Main Category', 'Irregularity_Complain_Category'],
  category: ['Report_Category', 'Report Category', 'Kategori Laporan', 'Main Category', 'Irregularity_Complain_Category'],
  irregularity_complain_category: ['Irregularity_Complain_Category', 'Irregularity/Complain Category', 'Report_Category'],
  description: ['Report', 'Laporan', 'Description', 'Deskripsi'],
  root_caused: ['Root_Caused', 'Root Caused', 'Akar Masalah', 'Root Cause'],
  action_taken: ['Action_Taken', 'Action Taken', 'Tindakan'],
  kps_remarks: ['Gapura_KPS_Remarks', 'Gapura KPS Remarks', 'KPS Remarks'],
  gapura_kps_action_taken: ['Gapura_KPS_Action_Taken', 'Gapura KPS Action Taken'],
  preventive_action: ['Preventive Action', 'Preventive_Action'],
  remarks_gapura_kps: ['Remarks Gapura KPS', 'Remarks_Gapura_KPS'],
  reporter_name: ['Report_By', 'Report By', 'Pelapor', 'Reporter'],
  evidence_url: ['Upload_Irregularity_Photo', 'Upload Irregularity Photo', 'Evidence', 'Bukti'],
  area: ['Area', 'Wilayah'],
  terminal_area_category: ['Terminal_Area_Category', 'Terminal Area Category'],
  apron_area_category: ['Apron_Area_Category', 'Apron Area Category'],
  general_category: ['General_Category', 'General Category'],
  status: ['Status'],
  week_in_month: ['Per_Week_in_Month', 'Per Week in Month'],
  kode_cabang: ['KODE_CABANG_VLOOKUP', 'KODE CABANG (VLOOKUP)'],
  maskapai_lookup: ['MASKAPAI_VLOOKUP', 'MASKAPAI (VLOOKUP)'],
  lokal_mpa_lookup: ['Lokal_MPA_VLOOKUP', 'Lokal / MPA (VLOOKUP)'],
  hub: ['Hub', 'HUB'],
  kode_hub: ['KODE_HUB_VLOOKUP', 'KODE HUB (VLOOKUP)', 'Kode Hub'],
  delay_code: ['Delay Code', 'Delay_Code', 'Kode Delay'],
  delay_duration: ['Delay Duration', 'Delay_Duration', 'Durasi Delay'],
  
  // Triage Columns
  primary_tag: ['Primary Tag', 'Primary_Tag', 'Area Category', 'Area_Category'],
  sub_category_note: ['Remarks Gapura KPS', 'Remarks_Gapura_KPS', 'Sub Category Note', 'Sub_Category_Note', 'Sub Category', 'Additional Note'],
  target_division: ['Target Division', 'Target_Division', 'Divisi', 'Division'],
  
  // Standard fields
  id: ['ID'],
  user_id: ['User ID'],
  title: ['Title', 'Judul'],
  location: ['Location', 'Lokasi'],
  severity: ['Severity', 'Tingkat Keparahan'],
  priority: ['Priority', 'Prioritas'],
  created_at: ['Created_At', 'Created At'],
  updated_at: ['Updated_At', 'Updated At'],
  report: ['Report', 'Judul Laporan'],
  // Add other fields as needed
};

// Inverse mapping for writing (Property -> Preferred Header)
const WRITE_MAPPING: Record<string, string> = {
  date_of_event: 'Date of Event',
  jenis_maskapai: 'Jenis Maskapai',
  airline: 'Airlines',
  flight_number: 'Flight Number',
  branch: 'Branch',
  main_category: 'Report Category',
  description: 'Report',
  root_caused: 'Root Caused',
  action_taken: 'Action Taken',
  kps_remarks: 'Gapura KPS Remarks',
  gapura_kps_action_taken: 'Gapura KPS Action Taken',
  preventive_action: 'Preventive Action',
  reporter_name: 'Report By',
  evidence_url: 'Upload Irregularity Photo',
  area: 'Area',
  terminal_area_category: 'Terminal Area Category',
  apron_area_category: 'Apron Area Category',
  general_category: 'General Category',
  status: 'Status',
  hub: 'Hub',
  kode_hub: 'Kode Hub',
  delay_code: 'Delay Code',
  delay_duration: 'Delay Duration',

  // Triage Write Mappings
  primary_tag: 'Primary Tag',
  sub_category_note: 'Remarks Gapura KPS',
  target_division: 'Target Division',

  // System Fields
  user_id: 'User ID',
  created_at: 'Created At',
  updated_at: 'Updated At',
  severity: 'Severity',
  priority: 'Priority',
};

const CACHE_KEY_ALL_REPORTS = 'reports:all:v3';
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

const MonthMap: Record<string, number> = {
  januari: 0, jan: 0,
  februari: 1, feb: 1,
  maret: 2, mar: 2,
  april: 3, apr: 3,
  mei: 4,
  juni: 5, jun: 5,
  juli: 6, jul: 6,
  agustus: 7, ags: 7, agt: 7,
  september: 8, sep: 8,
  oktober: 9, okt: 9, 
  november: 10, nov: 10,
  desember: 11, des: 11
};

// Helper to parse dates robustly
function parseDate(dateStr: string | number | Date): Date | null {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : dateStr;
  
  if (typeof dateStr === 'number') {
    return new Date(Math.round((dateStr - 25569) * 86400 * 1000));
  }

  const str = String(dateStr).trim();
  if (!str) return null;

  // 1. ISO Patterns (YYYY-MM-DD, YYYY-MM)
  // Match common ISO-like strings from spreadsheets
  const isoMatch = str.match(/^(\d{4})[\-\/](\d{1,2})[\-\/](\d{1,2})/);
  if (isoMatch) {
    const d = new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
    if (!isNaN(d.getTime())) return d;
  }

  // 2. DD Mon YYYY or Mon YYYY (Indonesian/English)
  const parts = str.toLowerCase().split(/[\s,/-]+/);
  if (parts.length >= 2) {
    let day = 1;
    let month = -1;
    let year = -1;

    const yearIdx = parts.findIndex(p => /^\d{4}$/.test(p));
    if (yearIdx !== -1) {
      year = parseInt(parts[yearIdx]);
      for (let i = 0; i < parts.length; i++) {
        if (i === yearIdx) continue;
        if (MonthMap[parts[i]] !== undefined) {
          month = MonthMap[parts[i]];
          const dayCandidates = [parts[i-1], parts[i+1]].filter(p => p && /^\d{1,2}$/.test(p));
          if (dayCandidates.length > 0) {
            day = parseInt(dayCandidates[0]);
          }
          break;
        }
      }
    }

    if (year !== -1 && month !== -1) {
      return new Date(year, month, day);
    }
  }

  // 3. DD/MM/YYYY
  const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (ddmmyyyy) {
    const day = parseInt(ddmmyyyy[1], 10);
    const month = parseInt(ddmmyyyy[2], 10) - 1; 
    const year = parseInt(ddmmyyyy[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  // Fallback to native Date
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}


export class ReportsService {
  
  private async getSheets() {
    return await getGoogleSheets();
  }

  private async getSheetIdByName(sheetName: string): Promise<number | null> {
    if (SHEET_IDS[sheetName] !== undefined) {
        return SHEET_IDS[sheetName];
    }
    const sheets = await this.getSheets();
    if (!SPREADSHEET_ID) throw new Error('GOOGLE_SHEET_ID is not defined');
    const response = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheet = response.data.sheets?.find(s => s.properties?.title === sheetName);
    return sheet?.properties?.sheetId ?? null;
  }

  private async getHeaderRow(sheetName: string): Promise<string[]> {
    const cacheKey = `headers:${sheetName}`;
    const cached = getCache<string[]>(cacheKey, 1000 * 60 * 60); // 1 hour cache for headers
    if (cached) return cached;

    const sheets = await this.getSheets();
    if (!SPREADSHEET_ID) throw new Error('GOOGLE_SHEET_ID is not defined');
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A1:AT1`,
    });
    const headers = (response.data.values?.[0] || []).map((h: any) => String(h).trim());
    setCache(cacheKey, headers);
    return headers;
  }

  private async fetchSheetWithRetry(sheetName: string, retries = 3, delay = 1000): Promise<any[][]> {
      const sheets = await this.getSheets();
      if (!SPREADSHEET_ID) throw new Error('GOOGLE_SHEET_ID is not defined');
      for (let i = 0; i < retries; i++) {
          try {
              const response = await sheets.spreadsheets.values.get({
                  spreadsheetId: SPREADSHEET_ID,
                  range: `${sheetName}!A1:AT`, // Combined A1 (Headers) + Data
              });
              return response.data.values || [];
          } catch (error) {
              if (i === retries - 1) throw error;
              console.warn(`Retry ${i + 1}/${retries} fetching sheet ${sheetName}:`, error);
              await new Promise(res => setTimeout(res, delay * Math.pow(2, i)));
          }
      }
      return [];
  }

  public invalidateCache() {
    invalidateCache(CACHE_KEY_ALL_REPORTS);
    console.log('[ReportsService] Cache invalidated');
  }

  public getLastUpdated(): number {
    const entry = ttlCache.get(CACHE_KEY_ALL_REPORTS);
    return entry ? entry.ts : Date.now();
  }

  async getReports(options?: { 
    refresh?: boolean; 
    filters?: {
      dateFrom?: string;
      dateTo?: string;
      hub?: string;
      branch?: string;
      area?: string;
      airlines?: string;
      sourceSheet?: string;
    },
    fields?: string[];
  }): Promise<Report[]> {
    const { refresh, filters, fields } = options || {};
    
    // Create a cache key that includes filters and fields
    const filterKey = filters ? JSON.stringify(filters) : 'none';
    const fieldsKey = fields ? fields.sort().join(',') : 'all';
    const cacheKey = `${CACHE_KEY_ALL_REPORTS}:${filterKey}:${fieldsKey}`;

    if (!refresh) {
      const cached = getCache<Report[]>(cacheKey, CACHE_TTL);
      if (cached) return cached;
    }

    // --- PARALLEL FETCHING: Google Sheets & Supabase ---
    const sheetsPromise = this.fetchGoogleSheetsReports();
    const supabasePromise = this.fetchSupabaseReports();

    const [sheetReports, dbReports] = await Promise.all([
      sheetsPromise.catch(err => {
        console.error('[ReportsService] Google Sheets fetch failed:', err);
        return [] as Report[];
      }),
      supabasePromise.catch(err => {
        console.error('[ReportsService] Supabase fetch failed:', err);
        return [] as Report[];
      })
    ]);

    console.log(`[ReportsService] Fetched ${sheetReports.length} from Sheets, ${dbReports.length} from Supabase`);

    // --- MERGE STRATEGY ---
    // 1. Create a map of Sheet reports by ID for O(1) lookup
    // 2. Iterate DB reports
    //    - If DB report matches a Sheet report (via sheet_id or id):
    //      * ENRICH the Sheet report with critical fields from DB (user_id, status, etc.) if missing in Sheet
    //    - If no match found in Sheet reports, add DB report to the list
    
    const combinedReports: Report[] = [...sheetReports];
    const sheetReportMap = new Map<string, Report>();
    sheetReports.forEach(r => sheetReportMap.set(r.id, r));
    
    // Add DB reports that are NOT in Sheets (based on sheet_id reference)
    dbReports.forEach(dbReport => {
      // Check if this DB report corresponds to a Sheet report we already have
      const linkedSheetId = dbReport.source_sheet ? dbReport.id : (dbReport as any).sheet_id; 
      
      let matchFound = false;
      let existingReport: Report | undefined;
      
      if (linkedSheetId && sheetReportMap.has(linkedSheetId)) {
        matchFound = true;
        existingReport = sheetReportMap.get(linkedSheetId);
      } else if (sheetReportMap.has(dbReport.id)) {
        matchFound = true;
        existingReport = sheetReportMap.get(dbReport.id);
      }

      if (matchFound && existingReport) {
        // ENRICHMENT: Copy critical fields from DB if missing in Sheet
        // This fixes the issue where user_id might be missing in Sheet but present in DB
        if (!existingReport.user_id && dbReport.user_id) {
            existingReport.user_id = dbReport.user_id;
        }
        if (!existingReport.created_at && dbReport.created_at) {
            existingReport.created_at = dbReport.created_at;
        }
        if (!existingReport.target_division && dbReport.target_division) {
            existingReport.target_division = dbReport.target_division;
        }
        // Sync status if DB is more recent (optional, but good for tracking)
        // For now, trust Sheet as primary, but if Sheet status is 'Pending' and DB is 'Done', maybe update?
        // Let's stick to Sheet as primary for status to avoid confusion.
      } else {
        // No match found in Sheets, so this is a Supabase-only report
        combinedReports.push(dbReport);
      }
    });

    // --- FILTERING ---
    const filteredReports = combinedReports.filter(report => {
        // ... (existing filtering logic)
        if (filters) {
          // Date filtering
          if (filters.dateFrom || filters.dateTo) {
            const reportDate = parseDate(report.date_of_event || report.created_at);
            if (!reportDate) return false;
            
            if (filters.dateFrom) {
              const fromDate = new Date(filters.dateFrom);
              if (reportDate < fromDate) return false;
            }
            
            if (filters.dateTo) {
              const toDate = new Date(filters.dateTo);
              toDate.setHours(23, 59, 59, 999);
              if (reportDate > toDate) return false;
            }
          }

          // Hub filtering
          if (filters.hub && filters.hub !== 'all' && (report.hub !== filters.hub)) return false;

          // Branch filtering
          if (filters.branch && filters.branch !== 'all') {
            const reportBranch = report.branch || report.reporting_branch || report.station_code;
            if (reportBranch !== filters.branch) return false;
          }

          // Area filtering
          if (filters.area && filters.area !== 'all') {
            const reportArea = report.area || report.terminal_area_category || report.apron_area_category || report.general_category || '';
            if (reportArea !== filters.area) return false;
          }

          // Airlines filtering
          if (filters.airlines && filters.airlines !== 'all' && report.airlines !== filters.airlines) return false;
          
          // Source Sheet filtering
          if (filters.sourceSheet && report.source_sheet !== filters.sourceSheet) return false;
        }
        return true;
    });

    // --- SORTING ---
    filteredReports.sort((a, b) => {
      const dateA = a.date_of_event ? new Date(a.date_of_event).getTime() : 0;
      const dateB = b.date_of_event ? new Date(b.date_of_event).getTime() : 0;
      return dateB - dateA;
    });

    // --- FIELD PROJECTION ---
    const finalReports = fields && fields.length > 0 
      ? filteredReports.map(r => {
          const projected: any = {};
          fields.forEach(f => {
            // @ts-ignore
            if (r[f] !== undefined) projected[f] = r[f];
          });
          projected.id = r.id; // Always keep ID
          return projected as Report;
        })
      : filteredReports;

    setCache(cacheKey, finalReports);
    return finalReports;
  }

  // Extracted Google Sheets Fetch Logic
  private async fetchGoogleSheetsReports(): Promise<Report[]> {
    if (!SPREADSHEET_ID) throw new Error('GOOGLE_SHEET_ID is not defined');
    const sheets = await this.getSheets();
    
    // Batch fetch for performance consolidation (O(1) HTTP requests)
    const ranges = REPORT_SHEETS.map(name => `${name}!A1:AT`);
    const batchRes = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: SPREADSHEET_ID,
      ranges,
    });

    const allReports: Report[] = [];
    const valueRanges = batchRes.data.valueRanges || [];

    for (let i = 0; i < REPORT_SHEETS.length; i++) {
      const sheetName = REPORT_SHEETS[i];
      const data = valueRanges[i]?.values || [];
      if (data.length === 0) continue;

      const headers = (data[0] || []).map((h: any) => String(h).trim());
      const rows = data.slice(1);

      // Pre-calculate mapping for this sheet
      const columnMapping: Record<string, number> = {};
      (Object.keys(PROP_TO_HEADER) as Array<keyof Report>).forEach((prop) => {
          const headerNames = PROP_TO_HEADER[prop];
          if (headerNames) {
              const colIdx = headers.findIndex(h => 
                  headerNames.some(name => h.trim().toLowerCase() === name.trim().toLowerCase())
              );
              if (colIdx !== -1) {
                  columnMapping[prop as string] = colIdx;
              }
          }
      });

      for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        const report: any = {};

        report.id = `${sheetName}!row_${index + 2}`;
        report.source_sheet = sheetName;

        // Fast mapping using pre-calculated indices
        Object.entries(columnMapping).forEach(([prop, colIdx]) => {
            report[prop] = row[colIdx];
        });

        // Ensure title is never undefined or empty
        if (report.report && report.report.trim()) {
            report.title = report.report.trim();
        }
        if (!report.title) report.title = '(Tanpa Judul)';

        // Post-processing & Defaults
        const parsedEventDate = parseDate(report.date_of_event as string);
        if (parsedEventDate) {
          report.date_of_event = parsedEventDate.toISOString();
          if (!report.created_at) report.created_at = report.date_of_event;
        } else if (report.created_at) {
          const parsedCreated = parseDate(report.created_at as string);
          if (parsedCreated) {
            report.created_at = parsedCreated.toISOString();
          } else {
            report.created_at = new Date().toISOString();
          }
        } else {
          report.created_at = new Date().toISOString();
        }

        if (report.resolved_at) {
          const parsedResolved = parseDate(report.resolved_at as string);
          if (parsedResolved) {
            report.resolved_at = parsedResolved.toISOString();
          }
        }

        // Status Normalization
        const statusMapping: Record<string, string> = {
          'Closed': 'SELESAI', 'Open': 'MENUNGGU_FEEDBACK', 'OPEN': 'MENUNGGU_FEEDBACK',
          'CLOSED': 'SELESAI', 'closed': 'SELESAI', 'open': 'MENUNGGU_FEEDBACK',
          'Selesai': 'SELESAI', 'selesai': 'SELESAI', 'Menunggu': 'MENUNGGU_FEEDBACK',
          'menunggu': 'MENUNGGU_FEEDBACK',
        };
        
        if (report.status) {
          const normalizedStatus = report.status.toString().trim().toUpperCase();
          report.status = statusMapping[normalizedStatus] || normalizedStatus;
          if (report.status === 'SELESAI' || report.status === 'CLOSED') report.status = 'SELESAI';
          else if (report.status === 'OPEN' || report.status === 'MENUNGGU' || report.status === 'ACTIVE') report.status = 'MENUNGGU_FEEDBACK';
        } else {
          report.status = 'MENUNGGU_FEEDBACK';
        }
        
        // Severity Normalization
        if (report.severity) {
          const severityMap: Record<string, string> = {
            'High': 'high', 'high': 'high', 'HIGH': 'high',
            'Medium': 'medium', 'medium': 'medium', 'MEDIUM': 'medium',
            'Low': 'low', 'low': 'low', 'LOW': 'low',
            'Urgent': 'urgent', 'urgent': 'urgent', 'URGENT': 'urgent',
          };
          report.severity = severityMap[report.severity.toString().trim()] || 'low';
        } else {
          report.severity = 'low';
        }
        
        if (!report.priority) report.priority = 'low';
        
        // Critical aliases and field mapping
        if (!report.main_category && report.irregularity_complain_category) report.main_category = report.irregularity_complain_category;
        if (report.main_category && !report.category) report.category = report.main_category;
        if (report.category && !report.main_category) report.main_category = report.category;
        
        if (report.main_category) {
          const cat = String(report.main_category).toLowerCase();
          if (cat.includes('irregular')) report.main_category = 'Irregularity';
          else if (cat.includes('complain')) report.main_category = 'Complaint';
          else if (cat.includes('compliment')) report.main_category = 'Compliment';
          report.category = report.main_category;
        }

        if (report.airline && !report.airlines) report.airlines = report.airline;
        if (report.airlines && !report.airline) report.airline = report.airlines;
        
        if (!report.branch && report.reporting_branch) report.branch = report.reporting_branch;
        if (!report.branch && report.station_code) report.branch = report.station_code;

        if (report.branch) {
            report.station_id = report.branch;
            report.stations = { code: report.branch as string, name: report.branch as string };
            if (!report.location) report.location = report.branch;
        }

        if (!report.sla_deadline && report.created_at) {
          try {
            report.sla_deadline = calculateSlaDeadline(report.created_at as string, report.priority as any).toISOString();
          } catch (_) {}
        }
        
        if (sheetName === 'CGO' && !report.area) report.area = 'CARGO';
        else if (sheetName === 'NON CARGO' && !report.area) {
             if (report.terminal_area_category) report.area = 'TERMINAL';
             else if (report.apron_area_category) report.area = 'APRON';
        }

        if (report.status === 'SELESAI' && !report.resolved_at) {
            report.resolved_at = report.date_of_event || report.created_at || new Date().toISOString();
        }

        allReports.push(report as Report);
      }
    }
    return allReports;
  }

  // Supabase Fetch Logic
  private async fetchSupabaseReports(): Promise<Report[]> {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[ReportsService] Supabase fetch error:', error);
      return [];
    }

    if (!data) return [];

    return data.map((row: any) => ({
      ...row,
      // Map DB fields to Report interface if needed
      // Most fields should match due to direct mapping in POST
      id: row.id, // UUID
      sheet_id: row.sheet_id, // Reference to Google Sheet ID
      
      // Ensure specific fields are present
      evidence_urls: row.evidence_urls || (row.evidence_url ? [row.evidence_url] : []),
      
      // Fallbacks
      status: row.status || 'MENUNGGU_FEEDBACK',
      severity: row.severity || 'low',
      priority: row.priority || 'low',
      
      // Date Normalization
      date_of_event: row.date_of_event || row.event_date || row.created_at,
      created_at: row.created_at || new Date().toISOString(),

      // Re-construct nested objects if needed
      stations: row.station_id ? { code: row.station_id, name: row.station_id } : undefined,
    })) as Report[];
  }

  async getStations(): Promise<Station[]> {
    const cacheKey = 'stations:all:v1';
    const cached = getCache<Station[]>(cacheKey, CACHE_TTL);
    if (cached) return cached;

    // Use reported branches from existing data as fallback for stations list
    // This avoids needing a separate 'HUB' sheet just for mapping
    const reports = await this.getReports();
    const branchNames = Array.from(new Set(reports.map(r => r.branch).filter(Boolean)));
    
    const stations: Station[] = branchNames.map((name, idx) => ({
      id: name as string,
      code: name as string,
      name: name as string,
    }));

    setCache(cacheKey, stations);
    return stations;
  }

  // Helper metadata fetchers to consolidate logic
  async getUnits(): Promise<Unit[]> {
    const { data } = await supabase.from('units').select('*').order('name');
    return data || [];
  }

  async getPositions(): Promise<Position[]> {
    const { data } = await supabase.from('positions').select('*').order('level');
    return data || [];
  }

  async getIncidentTypes(): Promise<IncidentType[]> {
    const { data } = await supabase.from('incident_types').select('*').order('name');
    return data || [];
  }

  async getLocations(stationCode?: string): Promise<any[]> {
    let query = supabase.from('locations').select('*').order('name');
    if (stationCode) {
      query = query.eq('station_id', stationCode);
    }
    const { data } = await query;
    return data || [];
  }

  // NOTE: Create/Update implementation below assumes headers match WRITE_MAPPING.
  // We prefer writing to 'NON CARGO' or 'CGO' based on Logic, using preferred headers.

  async createReport(reportData: Partial<Report>): Promise<Report> {
    const sheets = await this.getSheets();
    if (!SPREADSHEET_ID) throw new Error('GOOGLE_SHEET_ID is not defined');

    let targetSheet = 'NON CARGO';
    const category = (reportData.category || '').toLowerCase();
    const area = (reportData.area || '').toLowerCase();
    const primaryTag = (reportData.primary_tag || '').toUpperCase();
    
    if (area === 'cargo' || category.includes('cargo') || reportData.is_gse_related || primaryTag === 'CGO' || primaryTag === 'CARGO') {
        targetSheet = 'CGO';
    }

    const headers = await this.getHeaderRow(targetSheet);
    
    const newReport: Report = {
      ...reportData,
      created_at: reportData.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: reportData.status || 'MENUNGGU_FEEDBACK',
      severity: reportData.severity || 'low',
      title: reportData.title || 'Untitled',
      description: reportData.description || '',
      location: reportData.location || '',
    } as Report;

    const row = headers.map((header: string) => {
      // Find which property maps to this header
      const propEntry = Object.entries(WRITE_MAPPING).find(([_, h]) => h.toLowerCase() === header.trim().toLowerCase());
       if (propEntry) {
         const prop = propEntry[0] as keyof Report;
         // @ts-ignore
         return newReport[prop] !== undefined ? newReport[prop] : '';
       }
       // Fallback: try direct property match if header is simple
       // @ts-ignore
       if (newReport[header]) return newReport[header];
       return '';
    });

    const appendRes = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${targetSheet}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    });
    
    // Invalidate cache
    invalidateCache(CACHE_KEY_ALL_REPORTS);
    
    // Attempt to set ID
    const updatedRange = appendRes.data.updates?.updatedRange;
    if (updatedRange) {
        const match = updatedRange.match(/!A(\d+)/);
        if (match && match[1]) {
            newReport.id = `${targetSheet}!row_${match[1]}`;
        }
    }

    return newReport;
  }

  async getReportById(id: string): Promise<Report | null> {
    const reports = await this.getReports();
    return reports.find(r => r.id === id) || null;
  }

  private parseId(id: string): { sheetName: string, rowIndex: number } | null {
    if (!id.includes('!row_')) return null;
    const [sheetName, rowPart] = id.split('!row_');
    const index = parseInt(rowPart, 10);
    if (isNaN(index)) return null;
    return { sheetName, rowIndex: index };
  }

  async updateReport(id: string, updates: Partial<Report>): Promise<Report | null> {
    const parsed = this.parseId(id);
    if (!parsed) {
        console.error('Invalid ID format for update:', id);
        return null; 
    }
    
    const sheets = await this.getSheets();
    if (!SPREADSHEET_ID) throw new Error('GOOGLE_SHEET_ID is not defined');
    const { sheetName, rowIndex } = parsed;

    // Check for Report Transfer Trigger (NON CARGO -> CGO)
    // If updating primary_tag to CGO and current sheet is NOT CGO needed
    if (updates.primary_tag === 'CGO' && sheetName !== 'CGO') {
        const currentReport = await this.getReportById(id);
        if (currentReport) {
            // Prepare payload for new report
            // We use 'any' to bypass strict type checking for the ID delete
            const newReportPayload: any = {
                ...currentReport,
                ...updates,
            };
            // Ensure ID is removed so createReport generates a new one
            delete newReportPayload.id;
            
            // Ensure primary_tag is set to CGO so createReport routes it correctly
            newReportPayload.primary_tag = 'CGO';

            // Create in CGO sheet
            const newReport = await this.createReport(newReportPayload);
            
            // Delete from old sheet
            if (newReport && newReport.id) {
                await this.deleteReport(id);
                return newReport;
            } else {
                 console.error('Failed to create transferred report in CGO');
                 return null;
            }
        }
    }

    // 1. Get Headers
    const headers = await this.getHeaderRow(sheetName);
    
    // 2. Build the update payload
    // Helper: Column Letter from Index (0 -> A)
    function getColLetter(index: number) {
        let temp, letter = '';
        while (index >= 0) {
            temp = index % 26;
            letter = String.fromCharCode(temp + 65) + letter;
            index = (index - temp - 1) / 26;
        }
        return letter;
    }

    for (const [key, value] of Object.entries(updates)) {
        // Find header(s) for this property
        // @ts-ignore
        const possibleHeaders = PROP_TO_HEADER[key];
        // Also check if key matches a header directly (fallback)
        
        let colIndex = -1;
        
        if (possibleHeaders) {
             colIndex = headers.findIndex((h: string) => possibleHeaders.includes(h));
        }
        
        // Fallback: Try direct match case-insensitive
        if (colIndex === -1) {
            colIndex = headers.findIndex((h: string) => h.toLowerCase() === key.toLowerCase() || h.toLowerCase() === key.replace(/_/g, ' ').toLowerCase());
        }

        if (colIndex === -1) {
            console.warn(`Header not found for property: ${key} in sheet ${sheetName}`);
            continue;
        }

        const colLetter = getColLetter(colIndex);
        const cellRange = `${sheetName}!${colLetter}${rowIndex}`;
        
        let stringValue = value;
        if (value === null || value === undefined) stringValue = '';
        else if (typeof value === 'object') stringValue = JSON.stringify(value);
        else stringValue = String(value);

        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: cellRange,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [[stringValue]] }
        });
    }

    // Invalidate Cache
    invalidateCache(CACHE_KEY_ALL_REPORTS);
    
    // Return updated report (merge generic)
    const existing = await this.getReportById(id);
    return existing ? { ...existing, ...updates } : null;
  }

  async deleteReport(id: string): Promise<boolean> {
    const sheets = await this.getSheets();
    if (!SPREADSHEET_ID) throw new Error('GOOGLE_SHEET_ID is not defined');

    const parsed = this.parseId(id);
    if (!parsed) return false;
    const { sheetName, rowIndex } = parsed;

    const sheetId = await this.getSheetIdByName(sheetName);
    if (sheetId === null) return false;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex - 1,
                endIndex: rowIndex,
              },
            },
          },
        ],
      },
    });

    invalidateCache(CACHE_KEY_ALL_REPORTS);
    return true;
  }

  async batchCreateReports(reports: Partial<Report>[]): Promise<boolean> {
    if (!reports.length) return true;
    const sheets = await this.getSheets();
    if (!SPREADSHEET_ID) throw new Error('GOOGLE_SHEET_ID is not defined');

    // Group by target sheet to minimize API calls
    const grouped: Record<string, Partial<Report>[]> = {
      'NON CARGO': [],
      'CGO': []
    };

    reports.forEach(reportData => {
      let targetSheet = 'NON CARGO';
      const category = (reportData.category || '').toLowerCase();
      const area = (reportData.area || '').toLowerCase();
      const primaryTag = (reportData.primary_tag || '').toUpperCase();
      
      if (area === 'cargo' || category.includes('cargo') || reportData.is_gse_related || primaryTag === 'CGO' || primaryTag === 'CARGO') {
          targetSheet = 'CGO';
      }
      grouped[targetSheet].push(reportData);
    });

    for (const [targetSheet, reportsInSheet] of Object.entries(grouped)) {
      if (!reportsInSheet.length) continue;

      const headers = await this.getHeaderRow(targetSheet);
      const rows = reportsInSheet.map(reportData => {
        const newReport = {
          ...reportData,
          created_at: reportData.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status: reportData.status || 'MENUNGGU_FEEDBACK',
          severity: reportData.severity || 'low',
          title: reportData.title || 'Untitled',
          description: reportData.description || '',
          location: reportData.location || '',
        };

        return headers.map((header: string) => {
          const propEntry = Object.entries(WRITE_MAPPING).find(([_, h]) => h.toLowerCase() === header.trim().toLowerCase());
          if (propEntry) {
            const prop = propEntry[0] as keyof Report;
            // @ts-ignore
            return newReport[prop] !== undefined ? newReport[prop] : '';
          }
          // @ts-ignore
          if (newReport[header]) return newReport[header];
          return '';
        });
      });

      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${targetSheet}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: rows },
      });
    }

    invalidateCache(CACHE_KEY_ALL_REPORTS);
    return true;
  }

  // New: severity distribution helper for analytics
  async getSeverityDistribution(filters: {
    hub?: string;
    branch?: string;
    airlines?: string;
    area?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}): Promise<{ severity: string; count: number }[]> {
    const all = await this.getReports();
    // Apply runtime filtering consistent with existing filter logic
    const filtered = all.filter(r => {
      const sheet = (filters as any).source_sheet || r.source_sheet || 'NON CARGO';
      if (r.source_sheet && r.source_sheet !== sheet) return false;
      if (filters.hub && filters.hub !== 'all' && (r.hub ?? '') !== filters.hub) return false;
      if (filters.branch && filters.branch !== 'all' && (r.branch ?? r.stations?.code ?? '') !== filters.branch) return false;
      if (filters.airlines && filters.airlines !== 'all' && (r.airlines ?? r.airline ?? '') !== filters.airlines) return false;
      if (filters.area && filters.area !== 'all' && (r.area ?? '') !== filters.area) return false;
      const fqFrom = filters.dateFrom;
      const fqTo = filters.dateTo;
      if (fqFrom || fqTo) {
        const dt = r.date_of_event ?? r.created_at;
        if (dt) {
          const d = new Date(dt as string);
          if (fqFrom) {
            const from = new Date(fqFrom);
            if (d < from) return false;
          }
          if (fqTo) {
            const to = new Date(fqTo);
            to.setHours(23, 59, 59, 999);
            if (d > to) return false;
          }
        }
      }
      return true;
    });

    const map = new Map<string, number>();
    filtered.forEach((r) => {
      const sev = (r.severity || 'low').toString();
      map.set(sev, (map.get(sev) ?? 0) + 1);
    });

    const order = ['low', 'medium', 'high', 'urgent'];
    const result = order
      .map((s) => ({ severity: s, count: map.get(s) ?? 0 }))
      .filter((x) => true);

    // Return as array sorted by count desc (non-zero first)
    return result
      .sort((a, b) => b.count - a.count)
      .map(r => ({ severity: r.severity, count: r.count }));
  }
}

export const reportsService = new ReportsService();
