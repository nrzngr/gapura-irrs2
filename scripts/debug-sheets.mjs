#!/usr/bin/env node
/**
 * Debug Script: Fetch data directly from Google Sheets
 * Usage: npm run debug:sheets [sheet-name] [column-name]
 * 
 * Examples:
 *   npm run debug:sheets
 *   npm run debug:sheets "NON CARGO"
 *   npm run debug:sheets "NON CARGO" "Target_Division"
 */

import { google } from 'googleapis';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root
config({ path: join(__dirname, '../.env') });

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || '1TFPZOAWAKubPl7iaUk8BXt2BabY1N-AcLgi-_zBQGzk';
const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
const GOOGLE_PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY) {
  console.error('❌ Error: GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY not found in .env');
  console.error('Please check your .env file');
  console.error('Looking for: GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY');
  process.exit(1);
}

async function getGoogleSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: GOOGLE_CLIENT_EMAIL,
      private_key: GOOGLE_PRIVATE_KEY,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

async function fetchSheetList() {
  const sheets = await getGoogleSheets();
  const response = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  
  console.log('\n📊 Available Sheets:');
  console.log('=' .repeat(50));
  response.data.sheets?.forEach((sheet, idx) => {
    console.log(`  ${idx + 1}. ${sheet.properties?.title} (ID: ${sheet.properties?.sheetId})`);
  });
  
  return response.data.sheets?.map(s => s.properties?.title) || [];
}

async function fetchColumnDebug(sheetName, columnName) {
  const sheets = await getGoogleSheets();
  
  console.log(`\n🔍 Fetching data from "${sheetName}" column "${columnName}"...\n`);
  
  // Get all data
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
  });
  
  const rows = response.data.values || [];
  if (rows.length === 0) {
    console.log('❌ No data found');
    return;
  }
  
  const headers = rows[0];
  const dataRows = rows.slice(1);
  
  console.log(`✓ Total rows: ${dataRows.length}`);
  console.log(`✓ Headers: ${headers.join(', ')}\n`);
  
  // Find column index (case insensitive, ignore underscores and spaces)
  const searchName = columnName.toLowerCase().replace(/[_\s]/g, '');
  const colIndex = headers.findIndex(h => 
    h?.toString().toLowerCase().replace(/[_\s]/g, '') === searchName
  );
  
  if (colIndex === -1) {
    console.log(`❌ Column "${columnName}" not found!`);
    console.log('\n🔍 Looking for similar columns...');
    const similar = headers.filter(h => 
      h?.toString().toLowerCase().includes(columnName.toLowerCase().split('_')[0])
    );
    if (similar.length > 0) {
      console.log(`   Found similar: ${similar.join(', ')}`);
    }
    return;
  }
  
  const actualColumnName = headers[colIndex];
  console.log(`✓ Found column "${actualColumnName}" at index ${colIndex}\n`);
  
  // Analyze data
  const valueCounts = {};
  let nullCount = 0;
  let emptyCount = 0;
  
  dataRows.forEach((row, idx) => {
    const value = row[colIndex];
    if (value === undefined || value === null) {
      nullCount++;
    } else if (value.toString().trim() === '') {
      emptyCount++;
    } else {
      const key = value.toString().trim();
      if (!valueCounts[key]) {
        valueCounts[key] = { count: 0, firstRow: idx + 2 };
      }
      valueCounts[key].count++;
    }
  });
  
  console.log('📈 Data Distribution:');
  console.log('=' .repeat(50));
  console.log(`  Null values: ${nullCount}`);
  console.log(`  Empty strings: ${emptyCount}`);
  console.log(`  Valid values: ${dataRows.length - nullCount - emptyCount}`);
  console.log(`  Unique values: ${Object.keys(valueCounts).length}\n`);
  
  console.log('🏆 Top 10 Values:');
  console.log('=' .repeat(50));
  const sorted = Object.entries(valueCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10);
  
  sorted.forEach(([value, data], idx) => {
    const percentage = ((data.count / dataRows.length) * 100).toFixed(1);
    console.log(`  ${idx + 1}. "${value}"`);
    console.log(`     Count: ${data.count} (${percentage}%) | First row: ${data.firstRow}`);
  });
  
  // Sample rows
  console.log('\n📝 Sample Rows (first 5 with this column):');
  console.log('=' .repeat(50));
  let sampleCount = 0;
  for (let i = 0; i < Math.min(dataRows.length, 20) && sampleCount < 5; i++) {
    const value = dataRows[i][colIndex];
    if (value && value.toString().trim() !== '') {
      console.log(`  Row ${i + 2}: "${value}"`);
      sampleCount++;
    }
  }
  
  if (sampleCount === 0) {
    console.log('  (No non-empty values found in first 20 rows)');
  }
}

async function fetchSampleData(sheetName) {
  const sheets = await getGoogleSheets();
  
  console.log(`\n📄 Fetching sample data from "${sheetName}"...\n`);
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
  });
  
  const rows = response.data.values || [];
  if (rows.length === 0) {
    console.log('❌ No data found');
    return;
  }
  
  const headers = rows[0];
  const dataRows = rows.slice(1);
  
  console.log('📋 Column Headers:');
  console.log('=' .repeat(80));
  headers.forEach((h, i) => {
    console.log(`  ${i.toString().padStart(2)}: ${h}`);
  });
  
  console.log(`\n📊 Total Data Rows: ${dataRows.length}\n`);
  
  // Find important columns
  const importantCols = {
    area: headers.findIndex(h => h?.toString().toLowerCase() === 'area'),
    terminal: headers.findIndex(h => h?.toString().toLowerCase().includes('terminal')),
    apron: headers.findIndex(h => h?.toString().toLowerCase().includes('apron')),
    general: headers.findIndex(h => h?.toString().toLowerCase().includes('general')),
    category: headers.findIndex(h => h?.toString().toLowerCase().includes('category') && !h?.toString().toLowerCase().includes('area')),
    status: headers.findIndex(h => h?.toString().toLowerCase().includes('status')),
    severity: headers.findIndex(h => h?.toString().toLowerCase().includes('severity')),
    priority: headers.findIndex(h => h?.toString().toLowerCase().includes('priority')),
    division: headers.findIndex(h => h?.toString().toLowerCase().includes('division') || h?.toString().toLowerCase().includes('target_division')),
    subCategory: headers.findIndex(h => h?.toString().toLowerCase().includes('irregularity_complain')),
  };
  
  console.log('🔍 Important Column Indices:');
  console.log('=' .repeat(80));
  Object.entries(importantCols).forEach(([name, idx]) => {
    const status = idx >= 0 ? `✓ Found at index ${idx} (${headers[idx]})` : '✗ Not found';
    console.log(`  ${name.padEnd(15)}: ${status}`);
  });
  
  // Sample rows
  console.log('\n📝 Sample Data (first 3 rows):');
  console.log('=' .repeat(80));
  dataRows.slice(0, 3).forEach((row, idx) => {
    console.log(`\nRow ${idx + 2}:`);
    headers.forEach((h, i) => {
      if (i < 15) { // Only show first 15 columns
        const value = row[i] || '(empty)';
        console.log(`  ${h.padEnd(25)}: ${value}`);
      }
    });
    if (headers.length > 15) {
      console.log(`  ... and ${headers.length - 15} more columns`);
    }
  });
}

// Main
async function main() {
  const args = process.argv.slice(2);
  const sheetName = args[0] || 'NON CARGO';
  const columnName = args[1];
  
  console.log('🚀 Google Sheets Debug Tool');
  console.log('=' .repeat(50));
  console.log(`Spreadsheet ID: ${SPREADSHEET_ID}`);
  console.log(`Sheet: ${sheetName}\n`);
  
  try {
    if (!columnName) {
      // If no column specified, list available sheets and show sample data
      await fetchSheetList();
      await fetchSampleData(sheetName);
    } else {
      // If column specified, debug that specific column
      await fetchColumnDebug(sheetName, columnName);
    }
    
    console.log('\n✅ Done!\n');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
