// ISO datetime pattern: 2026-01-23T00:00:00+00:00 or 2026-01-23T00:00:00.000Z
// Also matches 2026-01-23 00:00:00+00
export const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/;

export function formatDateValue(val: unknown): string {
  if (typeof val !== 'string' || !ISO_DATETIME_RE.test(val)) return String(val ?? '');
  
  // Replace space with T for valid Date parsing if needed
  const normalized = val.includes(' ') && !val.includes('T') ? val.replace(' ', 'T') : val;
  const d = new Date(normalized);
  
  if (isNaN(d.getTime())) return String(val);
  
  const day = d.getUTCDate();
  // Using Intl with UTC to avoid local timezone shifts
  const month = d.toLocaleDateString('id-ID', { month: 'short', timeZone: 'UTC' });
  const year = d.getUTCFullYear();
  
  // If time is 00:00:00, check if we should show only Month Year (for monthly trends)
  // Monthly trends typically have day=1
  if (day === 1 && d.getUTCHours() === 0 && d.getUTCMinutes() === 0) {
    return `${month} ${year}`;
  }
  
  return `${day} ${month} ${year}`;
}

export function isDateColumn(rows: Record<string, unknown>[], key: string): boolean {
  if (!rows || rows.length === 0) return false;
  // Check first 5 rows
  for (const row of rows.slice(0, 5)) {
    const v = row[key];
    if (typeof v === 'string' && ISO_DATETIME_RE.test(v)) return true;
  }
  return false;
}

/** Pre-process data: format datetime xKey values for display while keeping original for sorting if possible */
export function processChartData(
  rows: Record<string, unknown>[],
  xKey: string,
): Record<string, unknown>[] {
  if (!isDateColumn(rows, xKey)) return rows;
  return rows.map(row => ({
    ...row,
    [xKey]: formatDateValue(row[xKey]),
  }));
}
