export type UserRole = 'SUPER_ADMIN' | 'DIVISI_OS' | 'DIVISI_OT' | 'DIVISI_OP' | 'DIVISI_UQ' | 'ANALYST' | 'CABANG';

export type ReportStatus = 'MENUNGGU_FEEDBACK' | 'SUDAH_DIVERIFIKASI' | 'SELESAI';

export type ReportPriority = 'low' | 'medium' | 'high' | 'urgent';

export type ReportSeverity = 'low' | 'medium' | 'high' | 'urgent';

export type DivisionType = 'OS' | 'OP' | 'OT' | 'UQ' | 'GENERAL';

export interface SessionPayload {
    id: string;
    email: string;
    role: string;
    full_name?: string;
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
    main_category?: string;
    sub_category?: string;
    target_division?: DivisionType | string;
    
    // Details
    investigator_notes?: string;
    manager_notes?: string;
    partner_response_notes?: string;
    validation_notes?: string;
    immediate_action?: string;
    specific_location?: string;
    incident_date?: string;
    incident_time?: string;
    reference_number?: string;
    evidence_meta?: Record<string, unknown>;

    // Workflow
    created_at: string;
    updated_at: string;
    resolved_at?: string;
    resolved_by?: string;
    assigned_to?: string;
    acknowledged_at?: string;
    acknowledged_by?: string;
    started_at?: string;
    validated_at?: string;
    validated_by?: string;
    sla_deadline?: string;
    partner_evidence_urls?: string[];

    // Joined Relations
    users?: User;     
    stations?: Station;
    incident_types?: IncidentType; 
    
    // Alternative Joined Relations (for consistency)
    user?: User;
    station?: Station;
    incident_type?: IncidentType;
    
    // Frontend-specific props that might be added
    comments?: Comment[];
    
    // Legacy / Alternative fields from API
    category?: string;
    root_cause?: string;
    action_taken?: string;
    airline?: string;
    route?: string;
    area?: string;
    area_category?: string;
    branch?: string;
    reporter_name?: string;
    event_date?: string;
    station_code?: string;

    // CSV-aligned fields
    csv_id?: number;
    hub?: string;
    airline_type?: 'Lokal' | 'MPA';
    report_content?: string;
    kps_remarks?: string;
    reporting_branch?: string;
    week_in_month?: number;
    reporter_email?: string;
    form_submitted_at?: string;
    form_completed_at?: string;
}

export interface Comment {
    id: string;
    report_id: string;
    user_id: string;
    content: string;
    created_at: string;
    is_system_message?: boolean;
    attachments?: string[];
    users?: {
        id: string;
        full_name: string;
        email?: string;
        avatar_url?: string;
        role?: string;
        division?: string;
    };
}
