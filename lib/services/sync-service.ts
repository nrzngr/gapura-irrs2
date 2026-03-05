import 'server-only';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { reportsService } from '@/lib/services/reports-service';
import type { Report } from '@/types';

export interface SyncResult {
  success: boolean;
  totalProcessed: number;
  inserted: number;
  updated: number;
  deleted: number;
  errors: number;
  duration: number;
  error?: string;
}

export interface SyncStatus {
  lastSyncAt: string | null;
  totalReports: number;
  syncVersion: number;
}

export class SyncService {
  private static BATCH_SIZE = 100;

  static async syncReportsFromSheets(): Promise<SyncResult> {
    const startTime = Date.now();
    let inserted = 0;
    let updated = 0;
    let deleted = 0;
    let errors = 0;

    try {
      console.log('[SyncService] Starting sync from Google Sheets...');

      const reports = await reportsService['fetchGoogleSheetsReports']();
      console.log(`[SyncService] Fetched ${reports.length} reports from Sheets`);

      const totalProcessed = reports.length;

      for (let i = 0; i < reports.length; i += this.BATCH_SIZE) {
        const batch = reports.slice(i, i + this.BATCH_SIZE);
        const batchResult = await this.upsertBatch(batch);
        inserted += batchResult.inserted;
        updated += batchResult.updated;
        errors += batchResult.errors;
      }

      // Hard delete rows removed from Google Sheets
      try {
        deleted = await this.deleteMissingFromSync(reports);
        if (deleted > 0) {
          console.log(`[SyncService] Deleted ${deleted} records removed from Sheets`);
        }
        // Invalidate reports cache so reads reflect deletions immediately
        try {
          reportsService.invalidateCache();
        } catch (e) {
          console.warn('[SyncService] Failed to invalidate reports cache:', e);
        }
      } catch (delErr) {
        console.warn('[SyncService] Delete-missing step failed:', delErr);
      }

      const duration = Date.now() - startTime;
      console.log(`[SyncService] Sync completed in ${duration}ms: ${inserted} inserted, ${updated} updated, ${deleted} deleted, ${errors} errors`);

      return {
        success: true,
        totalProcessed,
        inserted,
        updated,
        deleted,
        errors,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[SyncService] Sync failed:', errorMessage);

      return {
        success: false,
        totalProcessed: 0,
        inserted: 0,
        updated: 0,
        deleted: 0,
        errors: 1,
        duration,
        error: errorMessage,
      };
    }
  }

  private static async upsertBatch(reports: Report[]): Promise<{
    inserted: number;
    updated: number;
    errors: number;
  }> {
    let inserted = 0;
    let updated = 0;
    let errors = 0;

    const rows = reports.map(report => this.mapReportToSyncRow(report));

    try {
      // Get existing sheet_ids to distinguish inserts from updates
      const sheetIds = rows.map(r => r.sheet_id);
      const { data: existing } = await supabaseAdmin
        .from('reports_sync')
        .select('sheet_id')
        .in('sheet_id', sheetIds);
      
      const existingIds = new Set(existing?.map(r => r.sheet_id) || []);

      // Perform upsert
      const { data, error } = await supabaseAdmin
        .from('reports_sync')
        .upsert(rows, {
          onConflict: 'sheet_id',
          ignoreDuplicates: false,
        })
        .select('id, sheet_id');

      if (error) {
        console.error('[SyncService] Batch upsert error:', error);
        errors = reports.length;
      } else if (data) {
        // Count actual inserts vs updates
        data.forEach(row => {
          if (existingIds.has(row.sheet_id)) {
            updated++;
          } else {
            inserted++;
          }
        });
      }
    } catch (error) {
      console.error('[SyncService] Batch upsert exception:', error);
      errors = reports.length;
    }

    return { inserted, updated, errors };
  }

  /**
   * Deletes rows in reports_sync which no longer exist on Google Sheets
   * Complexity: Time O(N + M) | Space O(N) where N = sheet rows, M = db rows
   */
  private static async deleteMissingFromSync(reports: Report[]): Promise<number> {
    const fetchedIds = new Set<string>(
      reports
        .map((r) => (r as any).original_id as string | undefined)
        .filter((id): id is string => !!id)
    );
    if (fetchedIds.size === 0) {
      // Nothing to compare; skip deletion to avoid accidental mass delete
      return 0;
    }

    // Limit deletion scope to source sheets actually fetched
    const sourceSheets = Array.from(
      new Set(
        reports
          .map((r) => (r as any).source_sheet as string | undefined)
          .filter((s): s is string => !!s)
      )
    );

    // Fetch all existing sheet_ids for those source sheets
    const existingIds: string[] = [];
    const pageSize = 1000;
    let offset = 0;
    let hasMore = true;
    while (hasMore) {
      const q = supabaseAdmin
        .from('reports_sync')
        .select('sheet_id', { count: 'exact' })
        .order('sheet_id', { ascending: true })
        .range(offset, offset + pageSize - 1);
      const query = sourceSheets.length > 0 ? q.in('source_sheet', sourceSheets) : q;
      const { data, error } = await query;
      if (error) {
        console.warn('[SyncService] Failed to list existing sheet_ids:', error);
        break;
      }
      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        existingIds.push(...data.map((r: any) => r.sheet_id as string));
        hasMore = data.length === pageSize;
        offset += pageSize;
      }
    }

    // Determine which to delete
    const toDelete = existingIds.filter((id) => !fetchedIds.has(id));
    if (toDelete.length === 0) return 0;

    // Delete in batches
    let deleted = 0;
    for (let i = 0; i < toDelete.length; i += 500) {
      const batch = toDelete.slice(i, i + 500);
      const { data, error } = await supabaseAdmin
        .from('reports_sync')
        .delete()
        .in('sheet_id', batch)
        .select('sheet_id');
      if (error) {
        console.warn('[SyncService] Delete batch failed:', error);
        continue;
      }
      deleted += data?.length || 0;
    }

    // Also delete from legacy 'reports' table for entries mirrored from Sheets
    // Scope to rows with sheet_id that match our fetched source sheets
    const existingDbIds: Array<{ id: string; sheet_id: string }> = [];
    offset = 0;
    hasMore = true;
    while (hasMore) {
      // Fetch reports with a non-null sheet_id (likely linked to Sheets)
      const { data, error } = await supabaseAdmin
        .from('reports')
        .select('id, sheet_id')
        .not('sheet_id', 'is', null)
        .range(offset, offset + pageSize - 1);
      if (error) {
        console.warn('[SyncService] Failed to list legacy reports by sheet_id:', error);
        break;
      }
      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        existingDbIds.push(...(data as any[]).filter(r => typeof r.sheet_id === 'string').map((r) => ({ id: r.id, sheet_id: r.sheet_id })));
        hasMore = data.length === pageSize;
        offset += pageSize;
      }
    }
    const dbToDelete = existingDbIds
      .filter(({ sheet_id }) => !fetchedIds.has(sheet_id) && (sourceSheets.length === 0 || sourceSheets.some(s => sheet_id.startsWith(`${s}!row_`))))
      .map(({ id }) => id);
    for (let i = 0; i < dbToDelete.length; i += 500) {
      const batch = dbToDelete.slice(i, i + 500);
      const { data, error } = await supabaseAdmin
        .from('reports')
        .delete()
        .in('id', batch)
        .select('id');
      if (error) {
        console.warn('[SyncService] Legacy delete batch failed:', error);
        continue;
      }
      deleted += data?.length || 0;
    }

    return deleted;
  }

  private static mapReportToSyncRow(report: Report): Record<string, any> {
    const sheetId = report.original_id || `sheet-${report.id}`;

    return {
      sheet_id: sheetId,
      // Don't include 'id' - let database handle it for new records
      // For existing records, id will remain unchanged during upsert
      user_id: report.user_id || null,
      title: report.title || '(Tanpa Judul)',
      description: report.description || report.report || null,
      location: report.location || null,
      reporter_email: report.reporter_email || null,
      evidence_url: report.evidence_url || null,
      evidence_urls: report.evidence_urls || null,
      status: report.status || 'BARU',
      severity: report.severity || 'medium',
      priority: report.priority || 'medium',

      flight_number: report.flight_number || null,
      aircraft_reg: report.aircraft_reg || null,
      is_flight_related: report.is_flight_related || false,

      gse_number: report.gse_number || null,
      gse_name: report.gse_name || null,
      is_gse_related: report.is_gse_related || false,

      station_id: report.station_id || null,
      unit_id: report.unit_id || null,
      location_id: report.location_id || null,
      incident_type_id: report.incident_type_id || null,
      category: report.category || null,
      main_category: report.main_category || null,

      investigator_notes: report.investigator_notes || null,
      manager_notes: report.manager_notes || null,
      partner_response_notes: report.partner_response_notes || null,
      validation_notes: report.validation_notes || null,
      partner_evidence_urls: report.partner_evidence_urls || null,

      source_sheet: report.source_sheet || null,
      original_id: report.original_id || null,
      row_number: report.row_number || null,

      created_at: report.created_at || new Date().toISOString(),
      updated_at: report.updated_at || new Date().toISOString(),
      resolved_at: report.resolved_at || null,
      sla_deadline: report.sla_deadline || null,
      incident_date: report.incident_date || report.date_of_event || null,
      date_of_event: report.date_of_event || null,

      reporting_branch: report.reporting_branch || null,
      hub: report.hub || null,
      route: report.route || null,
      branch: report.branch || null,
      station_code: report.station_code || null,
      reporter_name: report.reporter_name || null,

      specific_location: report.specific_location || null,
      airlines: report.airlines || report.airline || null,
      airline: report.airline || report.airlines || null,
      jenis_maskapai: report.jenis_maskapai || null,
      reference_number: report.reference_number || null,
      root_caused: report.root_caused || report.root_cause || null,
      root_cause: report.root_cause || report.root_caused || null,
      action_taken: report.action_taken || null,
      immediate_action: report.immediate_action || null,
      kps_remarks: report.kps_remarks || null,
      gapura_kps_action_taken: report.gapura_kps_action_taken || null,
      preventive_action: report.preventive_action || null,
      remarks_gapura_kps: report.remarks_gapura_kps || null,
      area: report.area || null,
      terminal_area_category: report.terminal_area_category || null,
      apron_area_category: report.apron_area_category || null,
      general_category: report.general_category || null,
      week_in_month: report.week_in_month || null,
      report: report.report || null,
      irregularity_complain_category: report.irregularity_complain_category || null,
      kode_cabang: report.kode_cabang || null,
      kode_hub: report.kode_hub || null,
      maskapai_lookup: report.maskapai_lookup || null,
      case_classification: report.case_classification || null,
      lokal_mpa_lookup: report.lokal_mpa_lookup || null,

      delay_code: report.delay_code || null,
      delay_duration: report.delay_duration || null,

      primary_tag: report.primary_tag || null,
      sub_category_note: report.sub_category_note || null,
      target_division: report.target_division || null,

      synced_at: new Date().toISOString(),
      sync_version: 1,
    };
  }

  static async getSyncStatus(): Promise<SyncStatus> {
    try {
      const { data, error } = await supabaseAdmin
        .from('reports_sync')
        .select('synced_at, sync_version')
        .order('synced_at', { ascending: false })
        .limit(1)
        .single();

      const { count } = await supabaseAdmin
        .from('reports_sync')
        .select('*', { count: 'exact', head: true });

      return {
        lastSyncAt: data?.synced_at || null,
        totalReports: count || 0,
        syncVersion: data?.sync_version || 0,
      };
    } catch (error) {
      console.error('[SyncService] Failed to get sync status:', error);
      return {
        lastSyncAt: null,
        totalReports: 0,
        syncVersion: 0,
      };
    }
  }

  static async clearSyncedData(): Promise<{ success: boolean; deleted: number }> {
    try {
      const { data, error } = await supabaseAdmin
        .from('reports_sync')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')
        .select('id');

      if (error) {
        console.error('[SyncService] Clear error:', error);
        return { success: false, deleted: 0 };
      }

      const deleted = data?.length || 0;
      console.log(`[SyncService] Cleared ${deleted} synced reports`);
      return { success: true, deleted };
    } catch (error) {
      console.error('[SyncService] Clear exception:', error);
      return { success: false, deleted: 0 };
    }
  }
}

export const syncService = new SyncService();
