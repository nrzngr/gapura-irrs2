import { getGoogleSheets } from '@/lib/google-sheets';
import { Report, ReportStatus, UserRole } from '@/types';
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
const SHEET_IDS: Record<string, number> = {
  'NON CARGO': 847305549,
  'CGO': 2038497965,
  'HUB': 1950360673
};

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
  hub: ['HUB', 'Hub'],
  route: ['Route', 'Rute'],
  main_category: ['Report_Category', 'Report Category', 'Kategori Laporan', 'Main Category', 'Irregularity_Complain_Category'],
  category: ['Report_Category', 'Report Category', 'Kategori Laporan', 'Main Category', 'Irregularity_Complain_Category'],
  irregularity_complain_category: ['Irregularity_Complain_Category', 'Irregularity/Complain Category', 'Report_Category'],
  description: ['Report', 'Laporan', 'Description', 'Deskripsi'],
  root_caused: ['Root_Caused', 'Root Caused', 'Akar Masalah', 'Root Cause'],
  action_taken: ['Action_Taken', 'Action Taken', 'Tindakan'],
  kps_remarks: ['Gapura_KPS_Remarks', 'Gapura KPS Remarks', 'KPS Remarks'],
  gapura_kps_action_taken: ['Gapura_KPS_Action_Taken', 'Gapura KPS Action Taken'],
  reporter_name: ['Report_By', 'Report By', 'Pelapor', 'Reporter'],
  evidence_url: ['Upload_Irregularity_Photo', 'Upload Irregularity Photo', 'Evidence', 'Bukti'],
  area: ['Area', 'Wilayah'],
  terminal_area_category: ['Terminal_Area_Category', 'Terminal Area Category'],
  apron_area_category: ['Apron_Area_Category', 'Apron Area Category'],
  general_category: ['General_Category', 'General Category'],
  status: ['Status'],
  week_in_month: ['Per_Week_in_Month', 'Per Week in Month'],
  kode_cabang: ['KODE_CABANG_VLOOKUP', 'KODE CABANG (VLOOKUP)'],
  kode_hub: ['KODE_HUB_VLOOKUP', 'KODE HUB (VLOOKUP)'],
  maskapai_lookup: ['MASKAPAI_VLOOKUP', 'MASKAPAI (VLOOKUP)'],
  lokal_mpa_lookup: ['Lokal_MPA_VLOOKUP', 'Lokal / MPA (VLOOKUP)'],
  
  // Triage Columns
  primary_tag: ['Primary Tag', 'Primary_Tag', 'Area Category', 'Area_Category'],
  sub_category_note: ['Sub Category Note', 'Sub_Category_Note', 'Sub Category', 'Additional Note'],
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
  hub: 'HUB',
  main_category: 'Report Category',
  description: 'Report',
  root_caused: 'Root Caused',
  action_taken: 'Action Taken',
  reporter_name: 'Report By',
  evidence_url: 'Upload Irregularity Photo',
  area: 'Area',
  terminal_area_category: 'Terminal Area Category',
  apron_area_category: 'Apron Area Category',
  general_category: 'General Category',
  status: 'Status',
  
  // Triage Write Mappings
  primary_tag: 'Primary Tag',
  sub_category_note: 'Sub Category Note',
  target_division: 'Target Division',
};

const CACHE_KEY_ALL_REPORTS = 'reports:all:v3';
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

// Helper to parse dates robustly
function parseDate(dateStr: string | number | Date): Date | null {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  
  if (typeof dateStr === 'number') {
    return new Date(Math.round((dateStr - 25569) * 86400 * 1000));
  }

  const str = String(dateStr).trim();

   // Try DD/MM/YYYY
   const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
   if (ddmmyyyy) {
     const day = parseInt(ddmmyyyy[1], 10);
     const month = parseInt(ddmmyyyy[2], 10) - 1; 
     const year = parseInt(ddmmyyyy[3], 10);
     const d = new Date(year, month, day);
     if (!isNaN(d.getTime())) return d;
   }

   // Try Month DD, YYYY
   if (str.match(/^[a-zA-Z]+ \d+, \d{4}$/)) {
      const d = new Date(str + ' UTC'); // append UTC to avoid timezone shifts
      if (!isNaN(d.getTime())) return d;
   }

   const d = new Date(str);
   if (!isNaN(d.getTime())) return d;
   
   return null;
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

  async getReports(options?: { refresh?: boolean }): Promise<Report[]> {
    if (!options?.refresh) {
      const cached = getCache<Report[]>(CACHE_KEY_ALL_REPORTS, CACHE_TTL);
      if (cached) return cached;
    }

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

        // Fast mapping using pre-calculated indices
        Object.entries(columnMapping).forEach(([prop, colIdx]) => {
            report[prop] = row[colIdx];
        });

        // Ensure title is never undefined or empty
        // Prioritize 'report' column content as the title if available
        if (report.report && report.report.trim()) {
            report.title = report.report.trim();
        }

        if (!report.title) report.title = '(Tanpa Judul)';

        // Post-processing & Defaults
        const parsedEventDate = parseDate(report.date_of_event as string);
        if (parsedEventDate) {
          report.date_of_event = parsedEventDate.toISOString();
          if (!report.created_at) report.created_at = report.date_of_event;
        } else {
          // If no date, use current time (fallback)
          if (!report.created_at) report.created_at = new Date().toISOString();
        }

        // Map Google Sheets status to internal status
        const statusMapping: Record<string, string> = {
          'Closed': 'SELESAI',
          'Open': 'MENUNGGU_FEEDBACK',
          'OPEN': 'MENUNGGU_FEEDBACK',
          'CLOSED': 'SELESAI',
          'closed': 'SELESAI',
          'open': 'MENUNGGU_FEEDBACK',
          'Selesai': 'SELESAI',
          'selesai': 'SELESAI',
          'Menunggu': 'MENUNGGU_FEEDBACK',
          'menunggu': 'MENUNGGU_FEEDBACK',
        };
        
        if (report.status) {
          const normalizedStatus = report.status.toString().trim();
          report.status = statusMapping[normalizedStatus] || normalizedStatus;
        } else {
          report.status = 'MENUNGGU_FEEDBACK';
        }
        
        // Map severity values to standard format
        if (report.severity) {
          const severityMap: Record<string, string> = {
            'High': 'high',
            'high': 'high',
            'HIGH': 'high',
            'Medium': 'medium',
            'medium': 'medium',
            'MEDIUM': 'medium',
            'Low': 'low',
            'low': 'low',
            'LOW': 'low',
            'Urgent': 'urgent',
            'urgent': 'urgent',
            'URGENT': 'urgent',
          };
          const normalizedSeverity = report.severity.toString().trim();
          report.severity = severityMap[normalizedSeverity] || 'low';
        } else {
          report.severity = 'low';
        }
        
        if (!report.priority) report.priority = 'low';
        
        // Critical aliases and field mapping
        // Map category from irregularity_complain_category if main_category is empty
        if (!report.main_category && report.irregularity_complain_category) {
          report.main_category = report.irregularity_complain_category;
        }
        if (report.main_category && !report.category) report.category = report.main_category;
        if (report.category && !report.main_category) report.main_category = report.category;
        
        // Map airline fields
        if (report.airline && !report.airlines) report.airlines = report.airline;
        if (report.airlines && !report.airline) report.airline = report.airlines;
        
        // Map branch/station fields
        if (!report.branch && report.reporting_branch) {
          report.branch = report.reporting_branch;
        }
        if (!report.branch && report.station_code) {
          report.branch = report.station_code;
        }

        // Compatibility: Populate station_id and stations object from branch
        if (report.branch) {
            report.station_id = report.branch;
            report.stations = { code: report.branch as string, name: report.branch as string };
            // Also ensure location falls back to branch if empty
            if (!report.location) report.location = report.branch;
        }

        if (!report.sla_deadline && report.created_at) {
          try {
            report.sla_deadline = calculateSlaDeadline(report.created_at as string, report.priority as any).toISOString();
          } catch (_) {}
        }
        
        // Populate Area based on Sheet Source if missing
        if (sheetName === 'CGO' && !report.area) {
            report.area = 'CARGO';
        } else if (sheetName === 'NON CARGO' && !report.area) {
             // Heuristic: If it has terminal category, likely TERMINAL. If apron category, likely APRON.
             // Defaulting to 'TERMINAL' if unknown as per common distribution, or keep empty if strict.
             if (report.terminal_area_category) report.area = 'TERMINAL';
             else if (report.apron_area_category) report.area = 'APRON';
        }

        if (report.status === 'SELESAI' && !report.resolved_at) {
            // Fallback: use date_of_event as proxy for resolution date since Sheet doesn't have specific column
            report.resolved_at = report.date_of_event || report.created_at || new Date().toISOString();
        }

        report.source_sheet = sheetName;
        allReports.push(report as Report);
      }
    }

    allReports.sort((a, b) => {
      const dateA = a.date_of_event ? new Date(a.date_of_event).getTime() : 0;
      const dateB = b.date_of_event ? new Date(b.date_of_event).getTime() : 0;
      return dateB - dateA;
    });

    setCache(CACHE_KEY_ALL_REPORTS, allReports);
    return allReports;
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
}

export const reportsService = new ReportsService();
