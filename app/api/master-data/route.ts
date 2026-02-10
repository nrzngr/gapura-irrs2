import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET master data
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');

        let data;
        switch (type) {
            case 'stations':
                const { data: stations } = await supabase
                    .from('stations')
                    .select('*')
                    .order('code');
                data = stations;
                break;
            case 'units':
                const { data: units } = await supabase
                    .from('units')
                    .select('*')
                    .order('name');
                data = units;
                break;
            case 'positions':
                const { data: positions } = await supabase
                    .from('positions')
                    .select('*')
                    .order('level');
                data = positions;
                break;
            case 'incident_types':
                const { data: incidentTypes } = await supabase
                    .from('incident_types')
                    .select('*')
                    .order('name');
                data = incidentTypes;
                break;
            case 'locations':
                const stationId = searchParams.get('station_id');
                let query = supabase.from('locations').select('*').order('name');
                if (stationId) {
                    query = query.eq('station_id', stationId);
                }
                const { data: locations } = await query;
                data = locations;
                break;
            default:
                return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
        }

        return NextResponse.json(data || [], {
            headers: {
                'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
                'CDN-Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
            },
        });
    } catch (error) {
        console.error('Error fetching master data:', error);
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }
}
