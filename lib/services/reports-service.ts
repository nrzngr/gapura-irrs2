import { getGoogleSheets } from '@/lib/google-sheets';
import { Report, ReportStatus } from '@/types';
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

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || '1CUCvW2OYtocJR3dEE9NHtxFtmf9_17rkcUaMA_ZBHXA';
const REPORT_SHEETS = ['NON CARGO', 'CGO'];
const SHEET_IDS: Record<string, number> = {
  'NON CARGO': 847305549,
  'CGO': 2038497965,
  'HUB': 1950360673
};

// Mapping from Sheet Headers (exact strings from CSV/Sheet) to Report properties
const HEADER_MAPPING: Record<string, keyof Report> = {
  'Date of Event': 'date_of_event',
  'Date': 'date_of_event',
  'Tanggal': 'date_of_event',
  'Tanggal Kejadian': 'date_of_event',
  'Incident Date': 'date_of_event',
  'Jenis Maskapai': 'jenis_maskapai',
  'Airlines': 'airline',
  'Flight Number': 'flight_number',
  'Reporting Branch': 'reporting_branch',
  'Branch': 'branch',
  'HUB': 'hub',
  'Route': 'route',
  'Report Category': 'main_category',
  'Irregularity/Complain Category': 'irregularity_complain_category',
  'Report': 'description', // Primary content field
  'Root Caused': 'root_caused',
  'Action Taken': 'action_taken',
  'Gapura KPS Remarks': 'kps_remarks',
  'Gapura KPS Action Taken': 'gapura_kps_action_taken',
  'Report By': 'reporter_name',
  'Upload Irregularity Photo': 'evidence_url',
  'Area': 'area',
  'Terminal Area Category': 'terminal_area_category',
  'Apron Area Category': 'apron_area_category',
  'General Category': 'general_category',
  'Status': 'status',
  'Per Week in Month': 'week_in_month',
  'KODE CABANG (VLOOKUP)': 'kode_cabang',
  'KODE HUB (VLOOKUP)': 'kode_hub',
  'MASKAPAI (VLOOKUP)': 'maskapai_lookup',
  'Lokal / MPA (VLOOKUP)': 'lokal_mpa_lookup'
};

const CACHE_KEY_ALL_REPORTS = 'reports:all:v3';
const CACHE_TTL = 1000 * 60 * 15; // 15 minutes — sheets data is semi-static

// Helper to parse dates robustly
function parseDate(dateStr: string | number | Date): Date | null {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  
  // If it's a number (Excel serial date), though Google Sheets API usually returns formatted strings
  if (typeof dateStr === 'number') {
    return new Date(Math.round((dateStr - 25569) * 86400 * 1000));
  }

  const str = String(dateStr).trim();
   
   // Try DD/MM/YYYY or DD-MM-YYYY first (Common in Indonesia/Excel)
   // This regex matches 1-2 digits, separator, 1-2 digits, separator, 4 digits
   const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
   if (ddmmyyyy) {
     const day = parseInt(ddmmyyyy[1], 10);
     const month = parseInt(ddmmyyyy[2], 10) - 1; // Months are 0-indexed
     const year = parseInt(ddmmyyyy[3], 10);
     const d = new Date(year, month, day);
     if (!isNaN(d.getTime())) return d;
   }

   // Try YYYY-MM-DD (ISO)
   const yyyymmdd = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
   if (yyyymmdd) {
     const year = parseInt(yyyymmdd[1], 10);
     const month = parseInt(yyyymmdd[2], 10) - 1;
     const day = parseInt(yyyymmdd[3], 10);
     const d = new Date(year, month, day);
     if (!isNaN(d.getTime())) return d;
   }
   
   // Try standard Date constructor as fallback
   let d = new Date(str);
   if (!isNaN(d.getTime())) return d;
   
   // Handle "Month DD, YYYY" format explicitly if needed, but Date() usually handles it
  // Try appending UTC if it looks like "Feb 1, 2024"
  if (str.match(/^[a-zA-Z]+ \d+, \d{4}$/)) {
      d = new Date(str + ' UTC');
      if (!isNaN(d.getTime())) return d;
  }

  return null;
}

export class ReportsService {
  
  private async getSheets() {
    return await getGoogleSheets();
  }

  private async getSheetIdByName(sheetName: string): Promise<number | null> {
    // Optimization: use hardcoded IDs
    if (SHEET_IDS[sheetName] !== undefined) {
        return SHEET_IDS[sheetName];
    }

    const sheets = await this.getSheets();
    if (!SPREADSHEET_ID) throw new Error('GOOGLE_SHEET_ID is not defined');

    const response = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const sheet = response.data.sheets?.find(s => s.properties?.title === sheetName);
    return sheet?.properties?.sheetId ?? null;
  }

  private async getHeaderRow(sheetName: string): Promise<string[]> {
    const sheets = await this.getSheets();
    if (!SPREADSHEET_ID) throw new Error('GOOGLE_SHEET_ID is not defined');

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A1:ZZ1`,
    });

    return (response.data.values?.[0] || []).map((h: string) => h.trim());
  }

  private async fetchSheetWithRetry(sheetName: string, retries = 3, delay = 1000): Promise<any[][]> {
      const sheets = await this.getSheets();
      if (!SPREADSHEET_ID) throw new Error('GOOGLE_SHEET_ID is not defined');

      for (let i = 0; i < retries; i++) {
          try {
              const response = await sheets.spreadsheets.values.get({
                  spreadsheetId: SPREADSHEET_ID,
                  range: `${sheetName}!A2:ZZ`,
              });
              return response.data.values || [];
          } catch (error) {
              if (i === retries - 1) throw error;
              console.warn(`Retry ${i + 1}/${retries} fetching sheet ${sheetName}:`, error);
              await new Promise(res => setTimeout(res, delay * Math.pow(2, i))); // Exponential backoff
          }
      }
      return [];
  }

  public invalidateCache() {
    invalidateCache(CACHE_KEY_ALL_REPORTS);
    console.log('[ReportsService] Cache invalidated');
  }

  public getLastUpdated(): number {
    // This is tricky with generic cache manager, but we can assume if cache exists it's relatively fresh
    // Ideally CacheManager would expose metadata
    return Date.now(); 
  }

  async getReports(options?: { refresh?: boolean }): Promise<Report[]> {
    if (!options?.refresh) {
      const cached = getCache<Report[]>(CACHE_KEY_ALL_REPORTS, CACHE_TTL);
      if (cached) {
        return cached;
      }
    }

    if (!SPREADSHEET_ID) throw new Error('GOOGLE_SHEET_ID is not defined');

    // Parallel fetch — both sheets concurrently instead of sequential
    // Complexity: Time O(max(sheetA, sheetB)) instead of O(sheetA + sheetB)
    const sheetResults = await Promise.allSettled(
      REPORT_SHEETS.map(async (sheetName) => {
        const [rows, headers] = await Promise.all([
          this.fetchSheetWithRetry(sheetName),
          this.getHeaderRow(sheetName),
        ]);
        return { sheetName, rows, headers };
      })
    );

    const allReports: Report[] = [];

    for (const result of sheetResults) {
      if (result.status === 'rejected') {
        console.error('Error fetching sheet:', result.reason);
        continue;
      }
      const { sheetName, rows, headers } = result.value;

      for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        const report: Record<string, unknown> = {};

        report.id = `${sheetName}!row_${index + 2}`;

        for (let colIndex = 0; colIndex < headers.length; colIndex++) {
          const key = HEADER_MAPPING[headers[colIndex]];
          if (key) report[key] = row[colIndex];
        }

        const parsedEventDate = parseDate(report.date_of_event as string);

        if (parsedEventDate) {
          report.date_of_event = parsedEventDate.toISOString();
          if (!report.created_at) report.created_at = report.date_of_event;
        } else {
          if (!report.created_at) report.created_at = new Date().toISOString();
        }

        if (!report.status) report.status = 'MENUNGGU_FEEDBACK';

        if (report.main_category && !report.category) report.category = report.main_category;
        if (report.airline && !report.airlines) report.airlines = report.airline;

        if (!report.priority) report.priority = 'low';
        if (!report.sla_deadline && report.created_at) {
          try {
            report.sla_deadline = calculateSlaDeadline(report.created_at as string, report.priority as 'low' | 'medium' | 'high' | 'urgent').toISOString();
          } catch (_) {
            // date parsing error — ignore
          }
        }

        report.source_sheet = sheetName;
        allReports.push(report as unknown as Report);
      }
    }

    // Complexity: Time O(n log n)
    allReports.sort((a, b) => {
      const dateA = a.date_of_event ? new Date(a.date_of_event).getTime() : 0;
      const dateB = b.date_of_event ? new Date(b.date_of_event).getTime() : 0;
      return dateB - dateA;
    });

    setCache(CACHE_KEY_ALL_REPORTS, allReports);

    return allReports;
  }

  async createReport(reportData: Partial<Report>): Promise<Report> {
    const sheets = await this.getSheets();
    if (!SPREADSHEET_ID) throw new Error('GOOGLE_SHEET_ID is not defined');

    // Determine target sheet
    let targetSheet = 'NON CARGO';
    const category = (reportData.category || '').toLowerCase();
    const area = (reportData.area || '').toLowerCase();
    
    // Explicit CARGO area from frontend or legacy heuristic
    if (area === 'cargo' || category.includes('cargo') || reportData.is_gse_related) {
        targetSheet = 'CGO';
    }

    const headers = await this.getHeaderRow(targetSheet);
    
    const newReport: Report = {
      ...reportData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: reportData.status || 'MENUNGGU_FEEDBACK',
      severity: reportData.severity || 'low',
      title: reportData.title || 'Untitled',
      description: reportData.description || '',
      location: reportData.location || '',
    } as Report;

    const row = headers.map(header => {
      const key = HEADER_MAPPING[header];
      // @ts-ignore
      return key && newReport[key] !== undefined ? newReport[key] : '';
    });

    const appendRes = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${targetSheet}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row],
      },
    });
    
    const updatedRange = appendRes.data.updates?.updatedRange;
    if (updatedRange) {
        // Invalidate cache
    invalidateCache(CACHE_KEY_ALL_REPORTS);

    // updatedRange format: "'Sheet Name'!A10:Z10"
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
    const sheets = await this.getSheets();
    if (!SPREADSHEET_ID) throw new Error('GOOGLE_SHEET_ID is not defined');

    const parsed = this.parseId(id);
    if (!parsed) return null;
    const { sheetName, rowIndex } = parsed;

    // Fetch current to merge
    const currentReport = await this.getReportById(id);
    if (!currentReport) return null;

    const updatedReport = { ...currentReport, ...updates, updated_at: new Date().toISOString() };
    const headers = await this.getHeaderRow(sheetName);

    const row = headers.map(header => {
      const key = HEADER_MAPPING[header];
      // @ts-ignore
      return key && updatedReport[key] !== undefined ? updatedReport[key] : '';
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row],
      },
    });
    
    // Invalidate cache
    invalidateCache(CACHE_KEY_ALL_REPORTS);

    return updatedReport;
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
                startIndex: rowIndex - 1, // 0-based
                endIndex: rowIndex,
              },
            },
          },
        ],
      },
    });

    // Invalidate cache
    invalidateCache(CACHE_KEY_ALL_REPORTS);

    return true;
  }
}

export const reportsService = new ReportsService();
