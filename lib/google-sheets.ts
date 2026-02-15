import { google } from 'googleapis';

export const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

export function getGoogleAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !privateKey) {
    throw new Error('Missing Google Service Account credentials');
  }

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: SCOPES,
  });

  return auth;
}

export async function getGoogleSheets() {
  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  return sheets;
}
