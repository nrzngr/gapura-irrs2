require('dotenv').config();
const { google } = require('googleapis');

const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const sheetId = process.env.JOUMPA_SHEET_ID;

console.log('JOUMPA_SHEET_ID:', sheetId);
console.log('SERVICE_ACCOUNT:', email);

if (!sheetId || !email || !privateKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const auth = new google.auth.JWT({ email, key: privateKey, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
const sheets = google.sheets({ version: 'v4', auth });

(async () => {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const sheetNames = meta.data.sheets.map(s => s.properties.title);
  console.log('SHEETS:', JSON.stringify(sheetNames));

  for (const name of sheetNames) {
    try {
      const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: `${name}!A1:Z5` });
      const vals = res.data.values || [];
      console.log(`\n=== SHEET: ${name} ===`);
      console.log('HEADERS:', JSON.stringify(vals[0] || []));
      if (vals.length > 1) console.log('SAMPLE1:', JSON.stringify(vals[1]));
      if (vals.length > 2) console.log('SAMPLE2:', JSON.stringify(vals[2]));
      if (vals.length > 3) console.log('SAMPLE3:', JSON.stringify(vals[3]));
    } catch(e) {
      console.log(`ERROR reading sheet ${name}: ${e.message}`);
    }
  }

  for (const name of sheetNames) {
    try {
      const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: `${name}!A:A` });
      console.log(`\nFULL_COUNT ${name}: ${(res.data.values || []).length - 1} data rows`);
    } catch(e) {}
  }
})();
