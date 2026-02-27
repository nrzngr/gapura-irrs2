'use client';

import { AlertTriangle } from 'lucide-react';

export default function OTRiskSeverity() {
  return (
    <div className="min-h-screen px-4 md:px-6 py-6">
      <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-5 h-5 text-emerald-600" />
          <h1 className="text-lg font-bold text-gray-800">Report Risk Update & Severity Level</h1>
        </div>
        <p className="text-sm text-gray-500">Placeholder. Konten akan menampilkan update risiko beserta severity level.</p>
      </section>
    </div>
  );
}

