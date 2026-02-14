import type {
  QueryDefinition,
  QueryFilter,
} from '@/types/builder';
import { isValidField, isValidTable, getJoinDef, getFieldDef } from './schema';

const MAX_LIMIT = 5000;

interface BuildResult {
  sql: string;
  params: (string | number | boolean)[];
}

/** Validate a QueryDefinition and return human-readable errors */
export function validateQuery(def: QueryDefinition): string[] {
  const errors: string[] = [];

  if (!def.source) {
    errors.push('Sumber tabel harus dipilih');
    return errors;
  }

  if (!isValidTable(def.source)) {
    errors.push(`Tabel "${def.source}" tidak valid`);
    return errors;
  }

  const dimensions = def.dimensions || [];
  const measures = def.measures || [];
  const filters = def.filters || [];
  const joins = def.joins || [];
  const sorts = def.sorts || [];

  if (dimensions.length === 0 && measures.length === 0) {
    errors.push('Pilih minimal satu dimensi atau ukuran');
  }

  // Collect valid tables (source + joined tables)
  const validTables = new Set<string>([def.source]);
  for (const join of joins) {
    const joinDef = getJoinDef(join.joinKey);
    if (!joinDef) {
      errors.push(`Join "${join.joinKey}" tidak ditemukan`);
    } else {
      validTables.add(joinDef.to);
    }
  }

  // Validate dimensions
  for (const dim of dimensions) {
    if (!validTables.has(dim.table)) {
      errors.push(`Tabel dimensi "${dim.table}" belum di-join`);
    } else if (!isValidField(dim.table, dim.field)) {
      errors.push(`Field "${dim.table}.${dim.field}" tidak valid`);
    }
  }

  // Validate measures
  for (const m of measures) {
    if (!validTables.has(m.table)) {
      errors.push(`Tabel ukuran "${m.table}" belum di-join`);
    } else if (!isValidField(m.table, m.field)) {
      errors.push(`Field "${m.table}.${m.field}" tidak valid`);
    }
  }

  // Validate filters
  for (const f of filters) {
    if (!validTables.has(f.table)) {
      errors.push(`Tabel filter "${f.table}" belum di-join`);
    } else if (!isValidField(f.table, f.field)) {
      errors.push(`Field filter "${f.table}.${f.field}" tidak valid`);
    }
  }

  return errors;
}

/** Build parameterized SQL from a QueryDefinition */
export function buildQuery(def: QueryDefinition): BuildResult {
  const params: (string | number | boolean)[] = [];
  let paramIdx = 0;

  const dimensions = def.dimensions || [];
  const measures = def.measures || [];
  const filters = def.filters || [];
  const joins = def.joins || [];
  const sorts = def.sorts || [];

  const nextParam = (value: string | number | boolean): string => {
    paramIdx++;
    params.push(value);
    return `$${paramIdx}`;
  };

  // === SELECT ===
  const selectParts: string[] = [];

  for (const dim of dimensions) {
    const col = qualifiedCol(dim.table, dim.field);
    const alias = dim.alias || `${dim.table}_${dim.field}`;
    const fieldDef = getFieldDef(dim.table, dim.field);

    if (dim.dateGranularity && fieldDef && (fieldDef.type === 'date' || fieldDef.type === 'datetime')) {
      selectParts.push(`DATE_TRUNC('${sanitizeGranularity(dim.dateGranularity)}', ${col}) AS "${alias}"`);
    } else {
      selectParts.push(`${col} AS "${alias}"`);
    }
  }

  for (const m of measures) {
    const col = qualifiedCol(m.table, m.field);
    const alias = m.alias || `${m.function.toLowerCase()}_${m.table}_${m.field}`;
    const aggExpr = buildAggregate(m.function, col);
    selectParts.push(`${aggExpr} AS "${alias}"`);
  }

  if (selectParts.length === 0) {
    selectParts.push('1');
  }

  // === FROM ===
  const fromClause = `"${def.source}"`;

  // === JOINS ===
  const joinClauses: string[] = [];
  for (const join of joins) {
    const joinDef = getJoinDef(join.joinKey);
    if (!joinDef) continue;
    joinClauses.push(
      `LEFT JOIN "${joinDef.to}" ON "${joinDef.from}"."${joinDef.fromField}" = "${joinDef.to}"."${joinDef.toField}"`
    );
  }

  // === WHERE ===
  const whereParts: string[] = [];
  for (let i = 0; i < filters.length; i++) {
    const f = filters[i];
    const col = qualifiedCol(f.table, f.field);
    const fieldDef = getFieldDef(f.table, f.field);
    const castSuffix = fieldDef?.type === 'date' ? '::date'
      : fieldDef?.type === 'datetime' ? '::timestamptz'
      : '';
    const clause = buildFilterClause(col, f, nextParam, castSuffix);
    if (clause) {
      if (whereParts.length > 0) {
        whereParts.push(f.conjunction === 'OR' ? 'OR' : 'AND');
      }
      whereParts.push(clause);
    }
  }

  // === GROUP BY ===
  const groupByParts: string[] = [];
  if (measures.length > 0 && dimensions.length > 0) {
    for (let i = 0; i < dimensions.length; i++) {
      groupByParts.push(`${i + 1}`);
    }
  }

  // === ORDER BY ===
  const orderByParts: string[] = [];
  for (const s of sorts) {
    const dir = s.direction === 'desc' ? 'DESC' : 'ASC';
    if (s.alias) {
      orderByParts.push(`"${s.alias}" ${dir}`);
    } else {
      orderByParts.push(`"${s.field}" ${dir}`);
    }
  }

  // Default sort: first measure desc, or first dimension asc
  if (orderByParts.length === 0) {
    if (measures.length > 0) {
      const m = measures[0];
      const alias = m.alias || `${m.function.toLowerCase()}_${m.table}_${m.field}`;
      orderByParts.push(`"${alias}" DESC`);
    } else if (dimensions.length > 0) {
      orderByParts.push(`1 ASC`);
    }
  }

  // === LIMIT ===
  const limit = Math.min(def.limit || 1000, MAX_LIMIT);

  // === Assemble ===
  let sql = `SELECT ${selectParts.join(', ')}\nFROM ${fromClause}`;

  if (joinClauses.length > 0) {
    sql += `\n${joinClauses.join('\n')}`;
  }

  if (whereParts.length > 0) {
    sql += `\nWHERE ${whereParts.join(' ')}`;
  }

  if (groupByParts.length > 0) {
    sql += `\nGROUP BY ${groupByParts.join(', ')}`;
  }

  if (orderByParts.length > 0) {
    sql += `\nORDER BY ${orderByParts.join(', ')}`;
  }

  sql += `\nLIMIT ${limit}`;

  return { sql, params };
}

// ===== Internal Helpers =====

function qualifiedCol(table: string, field: string): string {
  return `"${table}"."${field}"`;
}

function sanitizeGranularity(g: string): string {
  const allowed = ['day', 'week', 'month', 'quarter', 'year'];
  return allowed.includes(g) ? g : 'month';
}

function buildAggregate(fn: string, col: string): string {
  switch (fn) {
    case 'COUNT': return `COUNT(${col})`;
    case 'COUNT_DISTINCT': return `COUNT(DISTINCT ${col})`;
    case 'SUM': return `SUM(${col})`;
    case 'AVG': return `AVG(${col})`;
    case 'MIN': return `MIN(${col})`;
    case 'MAX': return `MAX(${col})`;
    default: return `COUNT(${col})`;
  }
}

function buildFilterClause(
  col: string,
  f: QueryFilter,
  nextParam: (v: string | number | boolean) => string,
  castSuffix: string = ''
): string | null {
  if (f.value === null || f.value === undefined) {
    if (f.operator !== 'is_null' && f.operator !== 'is_not_null') return null;
  }
  if (typeof f.value === 'string' && f.value.trim() === '' && !['is_null', 'is_not_null'].includes(f.operator)) {
    return null;
  }
  const p = (v: string | number | boolean) => nextParam(v) + castSuffix;
  switch (f.operator) {
    case 'eq':
      return `${col} = ${p(f.value as string | number | boolean)}`;
    case 'neq':
      return `${col} != ${p(f.value as string | number | boolean)}`;
    case 'gt':
      return `${col} > ${p(f.value as string | number | boolean)}`;
    case 'gte':
      return `${col} >= ${p(f.value as string | number | boolean)}`;
    case 'lt':
      return `${col} < ${p(f.value as string | number | boolean)}`;
    case 'lte':
      return `${col} <= ${p(f.value as string | number | boolean)}`;
    case 'like':
      return `${col} ILIKE ${nextParam(`%${f.value}%`)}`;
    case 'in': {
      const arr = Array.isArray(f.value) ? f.value : [f.value];
      const placeholders = arr.map(v => p(v as string | number | boolean));
      return `${col} IN (${placeholders.join(', ')})`;
    }
    case 'not_in': {
      const arr = Array.isArray(f.value) ? f.value : [f.value];
      const placeholders = arr.map(v => p(v as string | number | boolean));
      return `${col} NOT IN (${placeholders.join(', ')})`;
    }
    case 'between': {
      const arr = Array.isArray(f.value) ? f.value : [];
      if (arr.length >= 2) {
        return `${col} BETWEEN ${p(arr[0] as string | number | boolean)} AND ${p(arr[1] as string | number | boolean)}`;
      }
      return null;
    }
    case 'is_null':
      return `${col} IS NULL`;
    case 'is_not_null':
      return `${col} IS NOT NULL`;
    default:
      return null;
  }
}
