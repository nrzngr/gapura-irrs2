import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { ReportsService } from './lib/services/reports-service';
import { processQuery } from './lib/engine/query-processor';
import { QueryDefinition } from './types/builder';

async function test() {
    console.log('Sheet ID:', process.env.GOOGLE_SHEET_ID);
    const service = new ReportsService();
    const reports = await service.getReports({ refresh: true });
    
    console.log('Total reports:', reports.length);
    
    // Check range of dates in data
    const dates = reports.map(r => r.created_at).filter(Boolean).sort();
    if (dates.length > 0) {
        console.log('Date range in raw data:', dates[0], 'to', dates[dates.length - 1]);
    }
    
    const monthlyQuery: QueryDefinition = {
        source: 'reports',
        joins: [],
        dimensions: [{ table: 'reports', field: 'created_at', alias: 'name', dateGranularity: 'month' }],
        measures: [{ table: 'reports', field: 'id', function: 'COUNT', alias: 'value' }],
        filters: [],
        sorts: [],
        limit: 12
    };
    
    const result = processQuery(monthlyQuery, reports);
    console.log('Monthly Result (no sort):');
    result.rows.forEach(r => console.log(r.name, r.value));
    
    const sortedQuery: QueryDefinition = {
        ...monthlyQuery,
        sorts: [{ field: 'created_at', direction: 'desc' }]
    };
    
    const resultSorted = processQuery(sortedQuery, reports);
    console.log('\nMonthly Result (sort DESC, limit 12):');
    resultSorted.rows.forEach(r => console.log(r.name, r.value));
}

test().catch(console.error);
