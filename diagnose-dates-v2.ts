
import { reportsService } from './lib/services/reports-service';

async function diagnose() {
  console.log('--- Date Distribution Diagnostic ---');
  try {
    const reports = await reportsService.getReports({ refresh: true });
    console.log('Total reports:', reports.length);
    
    const yearMonthMap: Record<string, number> = {};
    const createdMap: Record<string, number> = {};
    
    reports.forEach(r => {
      // Check date_of_event
      const d1 = r.date_of_event ? String(r.date_of_event).slice(0, 7) : 'Missing';
      yearMonthMap[d1] = (yearMonthMap[d1] || 0) + 1;
      
      // Check created_at
      const d2 = r.created_at ? String(r.created_at).slice(0, 7) : 'Missing';
      createdMap[d2] = (createdMap[d2] || 0) + 1;
    });
    
    console.log('\nDistribution by date_of_event:');
    Object.keys(yearMonthMap).sort().forEach(key => {
      console.log(`${key}: ${yearMonthMap[key]}`);
    });
    
    console.log('\nDistribution by created_at:');
    Object.keys(createdMap).sort().forEach(key => {
      console.log(`${key}: ${createdMap[key]}`);
    });

  } catch (err) {
    console.error('Error during diagnosis:', err);
  }
}

diagnose();
