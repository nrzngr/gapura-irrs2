const { google } = require('googleapis');
const dotenv = require('dotenv');
dotenv.config({ path: '.env' });

const SPREADSHEET_ID = '1TFPZOAWAKubPl7iaUk8BXt2BabY1N-AcLgi-_zBQGzk';

async function listSheets() {
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    console.log('Fetching spreadsheet metadata for:', SPREADSHEET_ID);
    
    try {
        const response = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
        const sheetNames = response.data.sheets.map(s => s.properties.title);
        console.log('Sheets found:', sheetNames);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

listSheets();
