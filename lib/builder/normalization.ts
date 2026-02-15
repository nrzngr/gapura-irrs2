import type { QueryDefinition, QueryMeasure, ChartVisualization, DashboardTile } from '@/types/builder';
import { TABLES, JOINS, getFieldDef } from './schema';

/**
 * Normalizes a QueryDefinition to ensure it's valid for the SQL builder.
 * This is the primary defense against AI-generated or malformed queries.
 */
/**
 * Helper to map human-readable field names to database columns for the 'reports' table.
 */
function mapReportsField(field: string): string {
  if (!field) return field;
  const fieldLower = field.toLowerCase().replace(/[\s\-_]/g, '');
  
  const mapping: Record<string, string> = {
    'tipemaskapai': 'airline_type',
    'maskapai': 'airline',
    'masapai': 'airline',
    'maskapaiid': 'airline_id',
    'airline': 'airline',
    'cabang': 'branch',
    'branch': 'branch',
    'unit': 'unit',
    'total': 'id',
    'volume': 'id',
    'jumlah': 'id',
    'count': 'id',
    'tanggal': 'incident_date',
    'date': 'incident_date',
    'incidentdate': 'incident_date',
    'tanggalinsiden': 'incident_date',
    'tanggalkejadian': 'event_date',
    'eventdate': 'event_date',
    'kategori': 'main_category',
    'category': 'main_category',
    'maincategory': 'main_category',
    'kategoriutama': 'main_category',
    'subkategori': 'sub_category',
    'subcategory': 'sub_category',
    'stasiun': 'station_code',
    'station': 'station_code',
    'stationcode': 'station_code',
    'kodestasiun': 'station_code',
    'stationid': 'station_id',
    'idstasiun': 'station_id',
    'incidenttypeid': 'incident_type_id',
    'idtipeinsiden': 'incident_type_id',
    'tipeinsidenid': 'incident_type_id',
    'locationid': 'location_id',
    'idlokasi': 'location_id',
    'userid': 'user_id',
    'iduser': 'user_id',
    'idpelapor': 'user_id',
    'pelapor': 'reporter_name',
    'reporter': 'reporter_name',
    'reportername': 'reporter_name',
    'namapelapor': 'reporter_name',
    'hub': 'hub',
    'waktuinsiden': 'incident_time',
    'incidenttime': 'incident_time',
    'jamkejadian': 'incident_time',
    'jam': 'incident_time',
    'lokasi': 'specific_location',
    'location': 'specific_location',
    'specificlocation': 'specific_location',
    'lokasispesifik': 'specific_location',
    'deskripsi': 'description',
    'description': 'description',
    'desc': 'description',
    'isilaporan': 'description',
    'waktu': 'event_date',
    'time': 'event_date',
    'idlaporan': 'id',
    'uuid': 'id',
    'id': 'id',
    'severity': 'severity',
    'tingkatkeparahan': 'severity',
    'priority': 'priority',
    'prioritas': 'priority',
    'status': 'status',
    'tujuan': 'target_division',
    'devisi': 'target_division',
    'divisi': 'target_division',
    'targetdivision': 'target_division',
    'rute': 'route',
    'route': 'route',
    'flight': 'flight_number',
    'flightnumber': 'flight_number',
    'penerbangan': 'flight_number',
    'nomorpenerbangan': 'flight_number',
    'aircraft': 'aircraft_reg',
    'aircraftreg': 'aircraft_reg',
    'registrasipesawat': 'aircraft_reg'
  };

  return mapping[fieldLower] || field;
}

/**
 * Normalizes a QueryDefinition to ensure it's valid for the SQL builder.
 * This is the primary defense against AI-generated or malformed queries.
 */
export function normalizeQuery(query: any): QueryDefinition {
  if (!query || typeof query !== 'object') {
    throw new Error('Invalid query definition');
  }

  const normalized: any = { ...query };

  // 1. Ensure source exists and is valid
  if (!normalized.source || !TABLES.some(t => t.name === normalized.source)) {
    normalized.source = 'reports';
  }

  // 2. Initialize arrays if missing
  normalized.dimensions = Array.isArray(normalized.dimensions) ? normalized.dimensions : [];
  normalized.measures = Array.isArray(normalized.measures) ? normalized.measures : [];
  normalized.filters = Array.isArray(normalized.filters) ? normalized.filters : [];
  normalized.sorts = Array.isArray(normalized.sorts) ? normalized.sorts : [];
  normalized.joins = Array.isArray(normalized.joins) ? normalized.joins : [];

  const usedTables = new Set<string>([normalized.source]);

  // 3. Normalize dimensions
  normalized.dimensions = normalized.dimensions.map((d: any) => {
    const table = d.table || normalized.source;
    usedTables.add(table);
    
    let field = d.field;
    let dateGranularity = d.dateGranularity;

    if (table === 'reports' && field === 'month') {
      field = 'incident_date';
      dateGranularity = 'month';
    } else if (table === 'reports') {
      field = mapReportsField(field);
    }
    
    return { ...d, table, field, dateGranularity };
  });

  // 4. Normalize measures
  normalized.measures = normalized.measures.map((m: any) => {
    const table = m.table || normalized.source;
    usedTables.add(table);
    
    let field = m.field;
    if (table === 'reports') {
      field = mapReportsField(field);
      // Default to 'id' if field is missing or generic 'total'/'count'
      if (field === 'total' || field === 'count' || !field) {
        field = 'id';
      }
    }

    let func = (m.function || 'COUNT').toUpperCase();
    
    // Type-aware aggregation correction
    if (func === 'SUM' || func === 'AVG') {
      const fieldDef = getFieldDef(table, field);
      if (fieldDef) {
        const isNonNumeric = ['uuid', 'string', 'date', 'datetime', 'boolean'].includes(fieldDef.type);
        if (isNonNumeric) {
          func = 'COUNT';
        }
      }
    }

    // Ensure alias exists to prevent collisions
    const alias = m.alias || `${func.toLowerCase()}_${table}_${field}`;

    return { 
      ...m, 
      table, 
      field, 
      function: func,
      alias
    };
  });

  // 5. Auto-add missing joins based on used tables
  usedTables.forEach(table => {
    if (table !== normalized.source) {
      const alreadyJoined = normalized.joins.some((j: any) => {
        const joinKey = j.joinKey;
        const joinDef = JOINS.find(jd => jd.key === joinKey);
        return joinDef?.to === table;
      });

      if (!alreadyJoined) {
        const possibleJoin = JOINS.find(j => j.from === normalized.source && j.to === table);
        if (possibleJoin) {
          normalized.joins.push({
            from: possibleJoin.from,
            to: possibleJoin.to,
            joinKey: possibleJoin.key
          });
        }
      }
    }
  });

  // 6. Normalize filters
  normalized.filters = normalized.filters.map((f: any) => {
    const table = f.table || normalized.source;
    usedTables.add(table); // Track tables used in filters too!
    
    let field = f.field;
    if (table === 'reports') {
      field = mapReportsField(field);
    }

    return {
      ...f,
      table,
      field,
      conjunction: f.conjunction || 'AND',
      operator: f.operator || 'eq'
    };
  });

  // 7. Ensure sorts use aliases if available
  normalized.sorts = normalized.sorts.map((s: any) => {
    const table = s.table || normalized.source;
    let field = s.field;
    if (table === 'reports') {
      field = mapReportsField(field);
    }

    // If sorting by a measure, try to match the measure's field OR alias
    const measureMatch = normalized.measures.find((m: any) => 
      (m.field === field || m.alias === field) && 
      m.table === table
    );
    
    if (measureMatch && !s.alias) {
      return { ...s, table, field, alias: measureMatch.alias };
    }
    return { ...s, table, field };
  });

  return normalized as QueryDefinition;
}

/**
 * Normalizes a visualization configuration to ensure it's compatible with the data shape.
 * Handles fail-safes like downgrading Heatmaps if dimensions are insufficient.
 */
export function normalizeVisualization(tile: DashboardTile): DashboardTile {
  if (!tile.visualization) {
    (tile as any).visualization = { chartType: 'bar', title: 'Untitled Chart' };
  }
  
  const { chartType } = tile.visualization;
  const dimensions = tile.query.dimensions || [];
  const measures = tile.query.measures || [];

  // 1. Heatmap Fail-safe
  if (chartType === 'heatmap') {
    if (dimensions.length < 2 || measures.length < 1) {
      console.warn(`[Normalization] Downgrading heatmap "${tile.visualization.title}" to bar due to insufficient columns (${dimensions.length} dims, ${measures.length} measures).`);
      tile.visualization.chartType = 'bar';
    } else {
      tile.visualization.xAxis = dimensions[0].alias || dimensions[0].field;
      tile.visualization.yAxis = [dimensions[1].alias || dimensions[1].field];
      tile.visualization.colorField = measures[0].alias || measures[0].field;
    }
  }

  // 2. Axis Sync for Bar/Line/Area/Radar
  const categoricalTypes = ['bar', 'horizontal_bar', 'line', 'area', 'radar', 'pie', 'donut'];
  if (categoricalTypes.includes(tile.visualization.chartType)) {
    if (dimensions.length > 0) {
      tile.visualization.xAxis = dimensions[0].alias || dimensions[0].field;
    }
    if (measures.length > 0) {
      tile.visualization.yAxis = measures.map(m => m.alias || m.field);
    }
    
    // Pie/Donut specifics
    if (tile.visualization.chartType === 'pie' || tile.visualization.chartType === 'donut') {
      tile.visualization.showLabels = true;
    }
  }

  // 3. KPI Fallback
  if (chartType === 'kpi' && measures.length === 0) {
    tile.visualization.chartType = 'table';
  }

  // 4. Heatmap Promotion (Heuristic)
  // If we have exactly 2 dimensions and 1 measure, and it's currently a Pie or Bar chart
  // where the dimensions are categorical (no dateGranularity), promote to Heatmap
  // for much clearer cross-dimensional analysis.
  if ((chartType === 'pie' || chartType === 'donut' || chartType === 'bar' || chartType === 'horizontal_bar')) {
    const isTemporal = dimensions.some(d => d.dateGranularity);
    if (dimensions.length === 2 && measures.length === 1 && !isTemporal) {
      console.log(`[Normalization] Promoting ambiguous ${chartType} "${tile.visualization.title}" to heatmap for dual-categorical dimensions.`);
      tile.visualization.chartType = 'heatmap';
      tile.visualization.xAxis = dimensions[0].alias || dimensions[0].field;
      tile.visualization.yAxis = [dimensions[1].alias || dimensions[1].field];
      tile.visualization.colorField = measures[0].alias || measures[0].field;
    }
  }

  return tile;
}
