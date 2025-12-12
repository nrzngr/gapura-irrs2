export interface User {
    id: string;
    email: string;
    full_name: string;
    role: 'reporter' | 'supervisor' | 'investigator' | 'manager' | 'admin';
    status: 'pending' | 'active' | 'rejected';
    nik?: string;
    phone?: string;
    station_id?: string;
    unit_id?: string;
    position_id?: string;
    created_at: string;
    updated_at: string;
}

export interface Report {
    id: string;
    user_id: string;
    title: string;
    description: string;
    location: string;
    evidence_url?: string;
    status: 'pending' | 'reviewed' | 'resolved';
    severity: 'low' | 'medium' | 'high';
    flight_number?: string;
    aircraft_reg?: string;
    gse_number?: string;
    station_id?: string;
    unit_id?: string;
    location_id?: string;
    incident_type_id?: string;
    investigator_notes?: string;
    resolved_at?: string;
    resolved_by?: string;
    created_at: string;
    updated_at: string;
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
    default_severity: 'low' | 'medium' | 'high';
}

export interface Location {
    id: string;
    station_id: string;
    name: string;
    area?: string;
}
