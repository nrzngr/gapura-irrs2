export type UserRole = 'SUPER_ADMIN' | 'DIVISI_OS' | 'DIVISI_OT' | 'DIVISI_OP' | 'DIVISI_UQ' | 'DIVISI_HC' | 'DIVISI_HT' | 'ANALYST' | 'CABANG';

export type ReportStatus = 'BARU' | 'DITOLAK' | 'MENUNGGU_FEEDBACK' | 'SUDAH_DIVERIFIKASI' | 'SELESAI' | 'Closed' | 'OPEN';

export type ReportPriority = 'low' | 'medium' | 'high' | 'urgent';

export type ReportSeverity = 'low' | 'medium' | 'high' | 'urgent';

export type DivisionType = 'OS' | 'OP' | 'OT' | 'UQ' | 'HC' | 'HT' | 'GENERAL';

export interface SessionPayload {
    id: string;
    email: string;
    role: string;
    full_name?: string;
    division?: string;
    sid?: string; // Unique Session ID for database tracking & revocation
}

export interface User {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
    status: 'pending' | 'active' | 'rejected';
    nik?: string;
    phone?: string;
    station_id?: string;
    unit_id?: string;
    position_id?: string;
    created_at: string;
    updated_at: string;
    division?: string;
}

export interface Station {
    id: string;
    code: string;
    name: string;
}

export interface Unit {
    id: string;
    name: string;
    description?: string;
}

export interface Position {
    id: string;
    name: string;
    level: number;
}

export interface IncidentType {
    id: string;
    name: string;
    default_severity: ReportSeverity;
}

export interface Location {
    id: string;
    station_id: string;
    name: string;
    area?: string;
}

export interface Report {
    id: string;
    user_id: string;
    title: string;
    description: string;
    location: string;
    evidence_url?: string;
    evidence_urls?: string[];
    status: ReportStatus;
    severity: ReportSeverity;
    priority?: ReportPriority;

    // Flight Info
    flight_number?: string;
    aircraft_reg?: string;
    is_flight_related?: boolean;

    // GSE Info
    gse_number?: string;
    gse_name?: string;
    is_gse_related?: boolean;

    // Categorization
    station_id?: string;
    unit_id?: string;
    location_id?: string;
    incident_type_id?: string;
    category?: string;
    main_category?: string; // Explicit field for dashboard compatibility
    
    // Details
    investigator_notes?: string;
    manager_notes?: string;
    partner_response_notes?: string;
    validation_notes?: string;
    partner_evidence_urls?: string[];
    source_sheet?: string;
    
    // Timestamps
    created_at: string;
    updated_at: string;
    resolved_at?: string;
    sla_deadline?: string;
    incident_date?: string;

    // Additional fields from Google Sheets / Reports Service
    reporting_branch?: string;
    hub?: string;
    route?: string;
    branch?: string;
    station_code?: string;
    reporter_name?: string;
    date_of_event?: string;
    event_date?: string; // Alias
    specific_location?: string;
    airlines?: string;
    airline?: string; // Alias
    jenis_maskapai?: string;
    reference_number?: string;
    root_caused?: string;
    action_taken?: string;
    immediate_action?: string;
    kps_remarks?: string;
    gapura_kps_action_taken?: string;
    preventive_action?: string;
    remarks_gapura_kps?: string;
    area?: string;
    terminal_area_category?: string;
    apron_area_category?: string;
    general_category?: string;
    week_in_month?: string;
    report?: string;
    irregularity_complain_category?: string;
    kode_cabang?: string;
    kode_hub?: string;
    maskapai_lookup?: string;
    lokal_mpa_lookup?: string;

    // Triage / Pivot Fields
    primary_tag?: string; // 'Landside' | 'Airside'
    sub_category_note?: string;
    target_division?: string; // 'OS' | 'OP' | 'OT' | 'UQ' | 'HC' | 'HT'

    // Triage Fields (Analyst -> Division)
    // primary_tag?: 'Landside' | 'Airside' | string;
    // sub_category_note?: string;
    // target_division?: DivisionType;

    // Joined data
    stations?: { code: string; name: string };
    users?: { full_name: string; email: string; role?: string };
    comments?: {
        id: string;
        content: string;
        created_at: string;
        users: { full_name: string; avatar_url?: string };
        attachments?: string[];
        is_system_message?: boolean;
    }[];
}
