import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { reportsService } from '@/lib/services/reports-service';
import { Report } from '@/types';

// GET master data
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');

        let data: any[] = [];
        switch (type) {
            case 'stations':
                data = await reportsService.getStations();
                break;
            case 'units':
                data = await reportsService.getUnits();
                break;
            case 'positions':
                data = await reportsService.getPositions();
                break;
            case 'incident_types':
                data = await reportsService.getIncidentTypes();
                break;
            case 'locations':
                const stationId = searchParams.get('station_id');
                data = await reportsService.getLocations(stationId || undefined);
                break;
            default:
                return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
        }

        return NextResponse.json(data, {
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
