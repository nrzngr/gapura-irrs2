const { google } = require('googleapis');
const dotenv = require('dotenv');
const fs = require('fs');
dotenv.config({ path: '.env' });

const SPREADSHEET_ID = '1TFPZOAWAKubPl7iaUk8BXt2BabY1N-AcLgi-_zBQGzk';

async function debugData() {
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: "'NON CARGO'!A1:ZZ20",
        });
        
        const rows = response.data.values;
        if (rows && rows.length) {
            fs.writeFileSync('debug-sheets-data.json', JSON.stringify(rows, null, 2));
            console.log('Saved 20 rows of NON CARGO data to debug-sheets-data.json');
        } else {
            console.log('No data found.');
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

debugData();
