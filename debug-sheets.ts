
import { reportsService } from './lib/services/reports-service';

async function debugSheets() {
  try {
    console.log('--- DEBUG GOOGLE SHEETS ---');
    const sheets = ['NON CARGO', 'CGO'];
    
    for (const sheetName of sheets) {
      console.log(`\nSheet: ${sheetName}`);
      // @ts-ignore - accessing private method for debug
      const headers = await reportsService.getHeaderRow(sheetName);
      console.log('Headers:', headers);
      
      // @ts-ignore - accessing private method for debug
      const rows = await reportsService.fetchSheetWithRetry(sheetName);
      console.log(`Total rows: ${rows.length}`);
      
      if (rows.length > 1) {
        console.log('Sample data (Row 2):', rows[1]);
        
        // Check if "Status" column exists and its index
        const statusIdx = headers.findIndex(h => h.trim().toLowerCase() === 'status');
        console.log(`Status column index: ${statusIdx}`);
        if (statusIdx !== -1) {
          console.log(`Sample status: ${rows[1][statusIdx]}`);
        }
      }
    }
    
    console.log('\n--- END DEBUG ---');
  } catch (error) {
    console.error('Debug failed:', error);
  }
}

debugSheets();
