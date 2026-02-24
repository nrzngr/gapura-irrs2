
import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || '1TFPZOAWAKubPl7iaUk8BXt2BabY1N-AcLgi-_zBQGzk';

export function getGoogleAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !privateKey) {
    throw new Error('Missing Google Service Account credentials');
  }

  return new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

async function debugSheets() {
  try {
    console.log('--- DEBUG GOOGLE SHEETS ---');
    console.log('Spreadsheet ID:', SPREADSHEET_ID);
    
    const auth = getGoogleAuth();
    const sheetsApi = google.sheets({ version: 'v4', auth });
    const sheets = ['NON CARGO', 'CGO'];
    
    for (const sheetName of sheets) {
      console.log(`\nSheet: ${sheetName}`);
      
      try {
        const response = await sheetsApi.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `${sheetName}!A1:AT`,
        });
        
        const rows = response.data.values || [];
        console.log(`Total rows: ${rows.length}`);
        
        if (rows.length > 0) {
          const headers = rows[0];
          console.log('Headers count:', headers.length);
          
          const statusIdx = headers.findIndex(h => h.trim().toLowerCase() === 'status');
          console.log(`Status column index: ${statusIdx} (${headers[statusIdx]})`);
          
          const targetDivIdx = headers.findIndex(h => h.trim().toLowerCase() === 'target division' || h.trim().toLowerCase() === 'target_division');
          console.log(`Target Division column index: ${targetDivIdx} (${headers[targetDivIdx]})`);

          if (rows.length > 1) {
            console.log('Sample data (Row 2):', rows[1]);
            if (statusIdx !== -1) {
              console.log(`Sample status: ${rows[1][statusIdx]}`);
            }
            if (targetDivIdx !== -1) {
              console.log(`Sample Target Division: ${rows[1][targetDivIdx]}`);
            }
          }
        }
      } catch (err: any) {
        console.error(`Error reading sheet ${sheetName}:`, err.message);
      }
    }
    
    console.log('\n--- END DEBUG ---');
  } catch (error) {
    console.error('Debug failed:', error);
  }
}

debugSheets();
