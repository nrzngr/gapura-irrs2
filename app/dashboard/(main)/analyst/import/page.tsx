'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { Upload, FileUp, AlertCircle, CheckCircle, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Type Definitions ---
interface ParsedRow {
  [key: string]: unknown;
  Id: string | number;
  'Start time': string | number;
  'Completion time': string | number;
  Email: string;
  Name: string;
  'Date of Event': string | number;
  'Jenis Maskapai': string;
  Airlines: string;
  'Flight Number': string;
  'Reporting Branch': string;
  'Branch (cth: CGK, UPG, DPS)': string;
  HUB: string;
  Route: string;
  'Report Category': string;
  'Irregularity/Complain Category': string;
  Report: string; // Description
  'Root Caused': string;
  'Action Taken': string;
  'Remarks Gapura KPS Action Taken': string;
  'Report By': string;
  'Upload Irregularity Photo': string; // URL
  Area: string;
  'Terminal Area Category': string;
  'Apron Area Category': string;
  'General Category': string;
  Status: string;
  'KODE CABANG (VLOOKUP)': string;
  // ... other fields if needed
}

// Map CSV columns to Reports table columns

// Convert Excel serial number to JS Date
const excelSerialToDate = (val: string | number): Date | null => {
  if (!val || val === '#N/A' || val === 'N/A') return null;
  if (typeof val === 'number') {
    return new Date((val - 25569) * 86400 * 1000);
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

// Returns ISO timestamp string
const parseTimestamp = (val: string | number): string | null => {
  const d = excelSerialToDate(val);
  return d ? d.toISOString() : null;
};

// Returns date-only string (YYYY-MM-DD) for date columns
const parseDateOnly = (val: string | number): string | null => {
  const d = excelSerialToDate(val);
  if (!d) return null;
  return d.toISOString().split('T')[0];
};

// Map CSV Area values to DB constraint: APRON | TERMINAL | GENERAL | null
const normalizeArea = (raw: string | undefined | null): string | null => {
  if (!raw) return null;
  const upper = raw.toUpperCase().trim();
  if (upper.includes('APRON')) return 'APRON';
  if (upper.includes('TERMINAL')) return 'TERMINAL';
  if (upper.includes('GENERAL')) return 'GENERAL';
  return null;
};

// Map CSV Status to DB constraint: MENUNGGU_FEEDBACK | SUDAH_DIVERIFIKASI | SELESAI
const normalizeStatus = (raw: string | undefined | null): string => {
  if (!raw) return 'MENUNGGU_FEEDBACK';
  const upper = raw.toUpperCase().trim();
  if (upper === 'SELESAI' || upper === 'CLOSED' || upper === 'DONE' || upper === 'RESOLVED') return 'SELESAI';
  if (upper === 'SUDAH_DIVERIFIKASI' || upper === 'VERIFIED') return 'SUDAH_DIVERIFIKASI';
  return 'MENUNGGU_FEEDBACK';
};

// Determine target_division from Area: APRON→OT, TERMINAL→OP, GENERAL→GENERAL
const deriveTargetDivision = (area: string | null): string => {
  if (area === 'APRON') return 'OT';
  if (area === 'TERMINAL') return 'OP';
  return 'GENERAL';
};

// Determine airline_type: Lokal or MPA
const deriveAirlineType = (jenisMaskapai: string | undefined | null): string | null => {
  if (!jenisMaskapai || jenisMaskapai === '#N/A' || jenisMaskapai === 'N/A') return null;
  const upper = jenisMaskapai.toUpperCase().trim();
  if (upper.includes('LOKAL') || upper.includes('LOCAL') || upper.includes('DOMESTIK')) return 'Lokal';
  if (upper.includes('MPA') || upper.includes('ASING') || upper.includes('INTERNATIONAL')) return 'MPA';
  return null;
};

const mapRowToReport = (row: ParsedRow) => {
  const mainCategory = row['Report Category'] || null;
  const area = normalizeArea(row.Area);

  return {
    reference_number: `IRR-${row.Id}`,
    title: mainCategory ? `${mainCategory} - ${row.Airlines || 'Unknown'}` : 'Incident Report',
    report: row.Report || 'No description provided',

    // Status & Priority (must match DB constraints)
    status: normalizeStatus(row.Status),
    priority: 'medium',

    // Dimensions
    branch: row['Branch (cth: CGK, UPG, DPS)'] || row['KODE CABANG (VLOOKUP)'] || null,
    airlines: row.Airlines || null,
    jenis_maskapai: deriveAirlineType(row['Jenis Maskapai']),
    flight_number: row['Flight Number'] || null,
    route: row.Route || null,
    area: area,
    target_division: deriveTargetDivision(area),

    // Categorization
    category: mainCategory,

    // Dates
    date_of_event: parseDateOnly(row['Date of Event']),
    event_date: parseTimestamp(row['Date of Event']),
    form_submitted_at: parseTimestamp(row['Start time']),
    form_completed_at: parseTimestamp(row['Completion time']),

    // Actions & Notes
    root_caused: row['Root Caused'] || null,
    action_taken: row['Action Taken'] || null,
    kps_remarks: row['Remarks Gapura KPS Action Taken'] || null,

    // People
    reporter_name: row['Report By'] || row.Name || null,
    reporter_email: row.Email || null,
    reporting_branch: row['Reporting Branch'] || null,

    // Meta
    hub: row.HUB || null,
    csv_id: Number(row.Id) || null,
    evidence_url: row['Upload Irregularity Photo'] || null,

    // System
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
};

export default function ImportDataPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ParsedRow[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [successCount, setSuccessCount] = useState(0);

  const onDrop = (acceptedFiles: File[]) => {
    const uploadedFile = acceptedFiles[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      parseFile(uploadedFile);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    multiple: false
  });

  const parseFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet) as ParsedRow[];
      setPreviewData(jsonData);
      setUploadStatus('idle'); // Reset status on new file
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    if (!previewData.length) return;

    setIsUploading(true);
    setUploadStatus('idle');
    setErrorMessage('');
    setSuccessCount(0);

    try {
      // 1. Map Data
      const mappedData = previewData.map((row) => mapRowToReport(row));

      // 2. Batch Insert (Supabase Limit is usually handled, but good to batch if huge)
      // We'll insert in chunks of 50
      const chunkSize = 50;
      let totalInserted = 0;

      for (let i = 0; i < mappedData.length; i += chunkSize) {
        const chunk = mappedData.slice(i, i + chunkSize);
        
        const { error } = await supabase
          .from('reports')
          .insert(chunk); // 'upsert' if we want to update based on csv_id/reference_number
          
        if (error) {
           console.error('Batch Insert Error:', error);
           throw error;
        }
        totalInserted += chunk.length;
      }

      setSuccessCount(totalInserted);
      setUploadStatus('success');
    } catch (error) {
      console.error('Import Error:', error);
      setUploadStatus('error');
      const message = error instanceof Error ? error.message : 'Gagal mengimport data.';
      setErrorMessage(message);
    } finally {
      setIsUploading(false);
    }
  };

  const reset = () => {
      setFile(null);
      setPreviewData([]);
      setUploadStatus('idle');
      setSuccessCount(0);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import Data Laporan</h1>
        <p className="text-gray-500 mt-1">Upload file CSV atau Excel untuk memasukkan data laporan secara massal.</p>
      </div>

      {/* Upload Logic Area */}
      {!file ? (
         <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer transition-colors
                ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'}
            `}
         >
            <input {...getInputProps()} />
            <div className="w-16 h-16 bg-blue-100/50 rounded-full flex items-center justify-center mb-4 text-blue-600">
               <Upload size={32} />
            </div>
            <p className="text-lg font-semibold text-gray-700">
                {isDragActive ? 'Lepaskan file di sini...' : 'Drag & drop file di sini'}
            </p>
            <p className="text-sm text-gray-500 mt-2">atau klik untuk memilih file (.csv, .xlsx)</p>
         </div>
      ) : (
          <div className="space-y-6">
              {/* File Info Card */}
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                          <FileUp size={24} />
                      </div>
                      <div>
                          <p className="font-semibold text-gray-900">{file.name}</p>
                          <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB • {previewData.length} Baris Data</p>
                      </div>
                  </div>
                  <button onClick={reset} disabled={isUploading} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-colors">
                      <X size={20} />
                  </button>
              </div>

              {/* Status Messages */}
              <AnimatePresence>
                {uploadStatus === 'success' && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-green-50 text-green-700 rounded-xl flex items-center gap-3 border border-green-200">
                        <CheckCircle size={20} />
                        <span className="font-medium">Berhasil mengimport {successCount} data laporan!</span>
                    </motion.div>
                )}
                {uploadStatus === 'error' && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-3 border border-red-200">
                        <AlertCircle size={20} />
                        <span className="font-medium">Error: {errorMessage}</span>
                    </motion.div>
                )}
              </AnimatePresence>

              {/* Preview Table */}
              {previewData.length > 0 && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                          <h3 className="font-semibold text-gray-700">Preview Data (Top 5)</h3>
                          <span className="text-xs bg-gray-200 px-2 py-1 rounded text-gray-600">Total: {previewData.length}</span>
                      </div>
                      <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left">
                              <thead className="bg-gray-50 text-gray-500">
                                  <tr>
                                      {Object.keys(previewData[0]).slice(0, 8).map((header) => (
                                          <th key={header} className="px-6 py-3 font-medium whitespace-nowrap">{header}</th>
                                      ))}
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                  {previewData.slice(0, 5).map((row, i) => {
                                      const keys = Object.keys(row).slice(0, 8);
                                      return (
                                          <tr key={i} className="hover:bg-gray-50/50">
                                              {keys.map((key, j) => {
                                                  const val = row[key];
                                                  // Format Excel serial dates for date columns
                                                  const isDateCol = ['Start time', 'Completion time', 'Date of Event'].includes(key);
                                                  let display = String(val);
                                                  if (isDateCol && typeof val === 'number') {
                                                      const d = excelSerialToDate(val);
                                                      display = d ? d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : String(val);
                                                  } else if (isDateCol && (!val || val === '#N/A')) {
                                                      display = '-';
                                                  }
                                                  return (
                                                      <td key={j} className="px-6 py-3 max-w-[200px] truncate text-gray-600">
                                                          {display}
                                                      </td>
                                                  );
                                              })}
                                          </tr>
                                      );
                                  })}
                              </tbody>
                          </table>
                      </div>
                  </div>
              )}

              {/* Action Button */}
              <div className="flex justify-end pt-4">
                  <button
                      onClick={uploadStatus === 'success' ? reset : handleImport}
                      disabled={isUploading}
                      className={`
                          flex items-center gap-2 px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all
                          ${isUploading
                             ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                             : uploadStatus === 'success'
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-blue-600 text-white hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0'
                          }
                      `}
                  >
                      {isUploading && <Loader2 size={18} className="animate-spin" />}
                      {uploadStatus === 'success' ? 'Selesai' : isUploading ? 'Mengimport...' : 'Import Data Sekarang'}
                  </button>
              </div>
          </div>
      )}
    </div>
  );
}
