import type { TableDef, JoinDef, FieldDef } from '@/types/builder';

// ===== Table Definitions =====

export const TABLES: TableDef[] = [
  {
    name: 'reports',
    label: 'Laporan',
    fields: [
      { name: 'id', label: 'ID Laporan', type: 'uuid' },
      { name: 'title', label: 'Judul', type: 'string' },
      { name: 'status', label: 'Status', type: 'string', enumValues: ['MENUNGGU_FEEDBACK', 'SUDAH_DIVERIFIKASI', 'SELESAI'] },
      { name: 'severity', label: 'Severity', type: 'string', enumValues: ['low', 'medium', 'high'] },
      { name: 'priority', label: 'Prioritas', type: 'string', enumValues: ['low', 'medium', 'high', 'urgent'] },
      { name: 'main_category', label: 'Kategori Utama', type: 'string', enumValues: ['Irregularity', 'Complaint', 'Compliment'] },
      { name: 'sub_category', label: 'Sub Kategori', type: 'string', enumValues: [
        'Baggage/Special/Irregularities Handling',
        'Check In/Boarding/Transfer/Transit Handling',
        'Passenger/Cargo/Aircraft Handling',
        'Lounge Handling',
        'Facilities',
        'Ramp/GSE Handling',
        'Cargo Handling',
        'Load Control/Communication',
        'Aircraft Appearance',
        'General',
      ] },
      { name: 'target_division', label: 'Divisi Tujuan', type: 'string', enumValues: ['OS', 'OT', 'OP', 'UQ', 'GENERAL'] },
      { name: 'area', label: 'Area', type: 'string', enumValues: ['APRON', 'TERMINAL', 'GENERAL'] },
      { name: 'area_category', label: 'Kategori Area', type: 'string', enumValues: [
        'Baggage/Special/Irregularities Handling',
        'Check In/Boarding/Transfer/Transit Handling',
        'Passenger/Cargo/Aircraft Handling',
        'Lounge Handling',
        'Facilities',
        'Ramp/GSE Handling',
        'Cargo Handling',
        'Load Control/Communication',
        'Aircraft Appearance',
        'General',
      ] },
      { name: 'airline', label: 'Maskapai', type: 'string' },
      { name: 'station_code', label: 'Kode Stasiun', type: 'string' },
      { name: 'branch', label: 'Cabang', type: 'string' },
      { name: 'route', label: 'Rute', type: 'string' },
      { name: 'flight_number', label: 'Nomor Penerbangan', type: 'string' },
      { name: 'aircraft_reg', label: 'Registrasi Pesawat', type: 'string' },
      { name: 'location', label: 'Lokasi (jarang terisi)', type: 'string' },
      { name: 'specific_location', label: 'Lokasi Spesifik', type: 'string' },
      { name: 'description', label: 'Deskripsi Insiden', type: 'string' },
      { name: 'root_cause', label: 'Akar Masalah', type: 'string' },
      { name: 'action_taken', label: 'Tindakan yang Diambil', type: 'string' },
      { name: 'evidence_urls', label: 'Link Evidence (Google Drive)', type: 'string' },
      { name: 'evidence_url', label: 'Evidence URL (Legacy)', type: 'string' },
      { name: 'reporter_name', label: 'Nama Pelapor', type: 'string' },
      { name: 'reference_number', label: 'Nomor Referensi', type: 'string' },
      { name: 'is_flight_related', label: 'Terkait Penerbangan', type: 'boolean' },
      { name: 'is_gse_related', label: 'Terkait GSE', type: 'boolean' },
      { name: 'incident_date', label: 'Tanggal Insiden', type: 'date' },
      { name: 'event_date', label: 'Tanggal Kejadian', type: 'datetime' },
      { name: 'created_at', label: 'Tanggal Dibuat', type: 'datetime' },
      { name: 'updated_at', label: 'Tanggal Diperbarui', type: 'datetime' },
      { name: 'resolved_at', label: 'Tanggal Diselesaikan', type: 'datetime' },
      { name: 'acknowledged_at', label: 'Tanggal Diakui', type: 'datetime' },
      { name: 'validated_at', label: 'Tanggal Divalidasi', type: 'datetime' },
      { name: 'started_at', label: 'Tanggal Mulai', type: 'datetime' },
      { name: 'sla_deadline', label: 'Batas SLA', type: 'datetime' },
      { name: 'csv_id', label: 'ID Form', type: 'number' },
      { name: 'hub', label: 'Hub', type: 'string' },
      { name: 'airline_type', label: 'Jenis Maskapai', type: 'string', enumValues: ['Lokal', 'MPA'] },
      { name: 'report_content', label: 'Isi Laporan', type: 'string' },
      { name: 'kps_remarks', label: 'Remarks KPS', type: 'string' },
      { name: 'reporting_branch', label: 'Cabang Pelapor', type: 'string' },
      { name: 'week_in_month', label: 'Minggu ke-', type: 'number' },
      { name: 'reporter_email', label: 'Email Pelapor', type: 'string' },
      { name: 'form_submitted_at', label: 'Waktu Submit Form', type: 'datetime' },
      { name: 'form_completed_at', label: 'Waktu Selesai Form', type: 'datetime' },
    ],
  },
  {
    name: 'users',
    label: 'Pengguna',
    fields: [
      { name: 'id', label: 'ID Pengguna', type: 'uuid' },
      { name: 'full_name', label: 'Nama Lengkap', type: 'string' },
      { name: 'email', label: 'Email', type: 'string' },
      { name: 'role', label: 'Role', type: 'string', enumValues: ['SUPER_ADMIN', 'DIVISI_OS', 'DIVISI_OT', 'DIVISI_OP', 'DIVISI_UQ', 'ANALYST', 'CABANG'] },
      { name: 'division', label: 'Divisi', type: 'string', enumValues: ['GENERAL', 'OS', 'OT', 'OP', 'UQ'] },
      { name: 'department', label: 'Departemen', type: 'string' },
      { name: 'status', label: 'Status Akun', type: 'string', enumValues: ['pending', 'active', 'rejected', 'suspended'] },
      { name: 'created_at', label: 'Tanggal Daftar', type: 'datetime' },
    ],
  },
  {
    name: 'stations',
    label: 'Stasiun',
    fields: [
      { name: 'id', label: 'ID Stasiun', type: 'uuid' },
      { name: 'code', label: 'Kode Stasiun', type: 'string' },
      { name: 'name', label: 'Nama Stasiun', type: 'string' },
    ],
  },
  {
    name: 'report_logs',
    label: 'Log Laporan',
    fields: [
      { name: 'id', label: 'ID Log', type: 'uuid' },
      { name: 'action', label: 'Aksi', type: 'string' },
      { name: 'previous_status', label: 'Status Sebelumnya', type: 'string' },
      { name: 'new_status', label: 'Status Baru', type: 'string' },
      { name: 'created_at', label: 'Tanggal', type: 'datetime' },
    ],
  },
  {
    name: 'report_comments',
    label: 'Komentar',
    fields: [
      { name: 'id', label: 'ID Komentar', type: 'uuid' },
      { name: 'content', label: 'Isi Komentar', type: 'string' },
      { name: 'is_system_message', label: 'Pesan Sistem', type: 'boolean' },
      { name: 'created_at', label: 'Tanggal', type: 'datetime' },
    ],
  },
  {
    name: 'incident_types',
    label: 'Tipe Insiden',
    fields: [
      { name: 'id', label: 'ID Tipe', type: 'uuid' },
      { name: 'name', label: 'Nama Tipe', type: 'string' },
      { name: 'default_severity', label: 'Severity Default', type: 'string', enumValues: ['low', 'medium', 'high'] },
    ],
  },
  {
    name: 'locations',
    label: 'Lokasi',
    fields: [
      { name: 'id', label: 'ID Lokasi', type: 'uuid' },
      { name: 'name', label: 'Nama Lokasi', type: 'string' },
      { name: 'area', label: 'Area', type: 'string' },
    ],
  },
];

// ===== Join Definitions =====

export const JOINS: JoinDef[] = [
  {
    key: 'reports_users',
    from: 'reports',
    fromField: 'user_id',
    to: 'users',
    toField: 'id',
    label: 'Pelapor',
  },
  {
    key: 'reports_stations',
    from: 'reports',
    fromField: 'station_id',
    to: 'stations',
    toField: 'id',
    label: 'Stasiun',
  },
  {
    key: 'reports_incident_types',
    from: 'reports',
    fromField: 'incident_type_id',
    to: 'incident_types',
    toField: 'id',
    label: 'Tipe Insiden',
  },
  {
    key: 'reports_locations',
    from: 'reports',
    fromField: 'location_id',
    to: 'locations',
    toField: 'id',
    label: 'Lokasi Detail',
  },
  {
    key: 'reports_report_logs',
    from: 'reports',
    fromField: 'id',
    to: 'report_logs',
    toField: 'report_id',
    label: 'Log Aktivitas',
  },
  {
    key: 'reports_report_comments',
    from: 'reports',
    fromField: 'id',
    to: 'report_comments',
    toField: 'report_id',
    label: 'Komentar',
  },
  {
    key: 'report_logs_users',
    from: 'report_logs',
    fromField: 'user_id',
    to: 'users',
    toField: 'id',
    label: 'Pelaku Log',
  },
];

// ===== Helpers =====

const tableMap = new Map(TABLES.map(t => [t.name, t]));
const joinMap = new Map(JOINS.map(j => [j.key, j]));

export function getTable(name: string): TableDef | undefined {
  return tableMap.get(name);
}

export function getFieldsForTable(tableName: string): FieldDef[] {
  return tableMap.get(tableName)?.fields ?? [];
}

export function getFieldDef(tableName: string, fieldName: string): FieldDef | undefined {
  return tableMap.get(tableName)?.fields.find(f => f.name === fieldName);
}

export function getJoinsForSource(source: string): JoinDef[] {
  return JOINS.filter(j => j.from === source);
}

export function getJoinDef(key: string): JoinDef | undefined {
  return joinMap.get(key);
}

/** Validate a table.field exists in the schema */
export function isValidField(table: string, field: string): boolean {
  const t = tableMap.get(table);
  if (!t) return false;
  return t.fields.some(f => f.name === field);
}

/** Validate a table exists */
export function isValidTable(table: string): boolean {
  return tableMap.has(table);
}

/** Get all table names */
export function getAllTableNames(): string[] {
  return TABLES.map(t => t.name);
}
export function buildSchemaContextForAI(): string {
  const tableDescriptions = TABLES.map(t => {
    const fields = t.fields.map(f => {
      let desc = `    - ${f.name} (${f.type}, label: "${f.label}")`;
      if (f.enumValues && f.enumValues.length > 0) {
        desc += ` — enum: [${f.enumValues.map(v => `"${v}"`).join(', ')}]`;
      }
      return desc;
    }).join('\n');
    return `  Table: "${t.name}" (label: "${t.label}")\n  Fields:\n${fields}`;
  }).join('\n\n');

  const joinDescriptions = JOINS.map(j =>
    `  - key: "${j.key}" — ${j.from}.${j.fromField} → ${j.to}.${j.toField} (label: "${j.label}")`
  ).join('\n');

  return `DATABASE SCHEMA:\n\n${tableDescriptions}\n\nAVAILABLE JOINS:\n${joinDescriptions}`;
}
