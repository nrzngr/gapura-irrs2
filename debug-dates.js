const { google } = require('googleapis');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const SPREADSHEET_ID = '1TFPZOAWAKubPl7iaUk8BXt2BabY1N-AcLgi-_zBQGzk';

async function checkData() {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

    if (!email || !privateKey) {
        console.error('Missing credentials');
        return;
    }

    const auth = new google.auth.JWT({
        email,
        key: privateKey,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    console.log('Checking NON CARGO sheet...');
    
    try {
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'NON CARGO!A1:AT100', // Just top 100 rows
        });
        const rows = res.data.values;
        if (!rows || rows.length === 0) {
            console.log('No data found.');
            return;
        }

        const headers = rows[0];
        const dateIdx = headers.findIndex(h => h.includes('Date_of_Event') || h.includes('Date of Event'));
        console.log('Date column index:', dateIdx);

        const rowDates = rows.slice(1).map(r => r[dateIdx]).filter(Boolean);
        console.log('Sample dates from top of sheet:', rowDates.slice(0, 5));

        // Check recent rows (at the end of sheet)
        // Let's get the whole column A to AT to see total count
        const metadata = await sheets.spreadsheets.get({
            spreadsheetId: SPREADSHEET_ID,
            ranges: ['NON CARGO'],
            includeGridData: false
        });
        // Get all dates to see the range
        const resAll = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'NON CARGO!A:A', 
        });
        const allRows = resAll.data.values;
        if (allRows && allRows.length > 0) {
            const allDates = allRows.map(r => r[0]).filter(Boolean).slice(1);
            console.log('Total reports found:', allDates.length);
            console.log('Last 10 dates:', allDates.slice(-10));
            
            const has2026 = allDates.some(d => String(d).includes('2026') || String(d).includes('/26'));
            console.log('Found 2026 in dates?', has2026);
        } else {
            console.log('No data in column A.');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}
checkData();
