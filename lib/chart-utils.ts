// ISO datetime pattern:
// - 2026-01-23T00:00:00+00:00
// - 2026-01-23T00:00:00.000Z
// - 2026-01-23 00:00:00+00
// - 2026-01-23 (YYYY-MM-DD)
// - 2026-01 (YYYY-MM)
// - 2026 (YYYY)
export const ISO_DATETIME_RE = /^\d{4}(?:-\d{2}(?:-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})?)?)?)?$/;

const DATE_HINT_TOKENS = new Set(['date', 'datetime', 'timestamp', 'created', 'updated', 'time']);

function isDateLikeColumnName(colName: string): boolean {
  const tokens = colName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return tokens.some(token => DATE_HINT_TOKENS.has(token));
}

export function formatDateValue(val: unknown): string {
  if (typeof val !== 'string' || !ISO_DATETIME_RE.test(val)) return String(val ?? '');
  
  // Format YYYY-MM as "Jan 2026"
  if (/^\d{4}-\d{2}$/.test(val)) {
    const [year, month] = val.split('-');
    const d = new Date(parseInt(year), parseInt(month) - 1);
    const monthStr = d.toLocaleDateString('id-ID', { month: 'short' });
    return `${monthStr} ${year}`;
  }

  const normalized = val.includes(' ') && !val.includes('T') ? val.replace(' ', 'T') : val;
  const d = new Date(normalized);
  
  if (isNaN(d.getTime())) return String(val);
  
  const day = d.getUTCDate();
  const month = d.toLocaleDateString('id-ID', { month: 'short', timeZone: 'UTC' });
  const year = d.getUTCFullYear();
  
  if (day === 1 && d.getUTCHours() === 0 && d.getUTCMinutes() === 0) {
    return `${month} ${year}`;
  }
  
  return `${day} ${month} ${year}`;
}

/**
 * Centralized formatter for all display values in tables and charts.
 * Handles dates, numbers (id-ID), and booleans.
 */
export function formatDisplayValue(val: unknown, colName?: string): string {
  if (val === null || val === undefined) return '-';
  
  // Date detection
  if (typeof val === 'string' && ISO_DATETIME_RE.test(val)) {
    return formatDateValue(val);
  }

  // Column name hints for dates (fallback)
  if (colName) {
    if (isDateLikeColumnName(colName)) {
      const d = new Date(String(val));
      if (!isNaN(d.getTime())) return formatDateValue(d.toISOString());
    }
  }
  
  // Numbers
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return val.toLocaleString('id-ID');
    return val.toLocaleString('id-ID', { maximumFractionDigits: 2 });
  }

  // Booleans
  if (typeof val === 'boolean') return val ? 'Ya' : 'Tidak';
  
  return String(val);
}

export function isDateColumn(rows: Record<string, unknown>[], key: string): boolean {
  if (!rows || rows.length === 0) return false;
  for (const row of rows.slice(0, 5)) {
    const v = row[key];
    if (typeof v === 'string' && ISO_DATETIME_RE.test(v)) return true;
  }
  return false;
}

export function processChartData(
  rows: Record<string, unknown>[],
  xKey: string,
): Record<string, unknown>[] {
  if (!isDateColumn(rows, xKey)) return rows;
  // Sort by raw date value (oldest to newest) before formatting
  const sorted = [...rows].sort((a, b) => {
    const aVal = String(a[xKey] ?? '');
    const bVal = String(b[xKey] ?? '');
    return aVal.localeCompare(bVal);
  });
  return sorted.map(row => ({
    ...row,
    [xKey]: formatDateValue(row[xKey]),
  }));
}
