'use client';

import { Brain, FileText } from 'lucide-react';

export default function OTAIReportsPage() {
  return (
    <div className="min-h-screen px-4 md:px-6 py-6">
      <section className="relative overflow-hidden bg-[var(--surface-1)] rounded-3xl p-6 border border-[var(--surface-2)] shadow-spatial-sm">
        <div className="flex items-center gap-2 mb-1">
          <Brain className="w-5 h-5 text-emerald-600" />
          <h1 className="text-lg font-bold text-gray-800">AI Reports</h1>
        </div>
        <p className="text-sm text-gray-500 mb-6">Halaman dummy untuk Divisi OT. Konten analitik AI akan ditambahkan.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl border border-[var(--surface-2)] bg-[var(--surface-1)]">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-gray-600" />
              <span className="text-xs font-semibold text-gray-700">Status</span>
            </div>
            <div className="text-sm text-gray-600">Coming soon</div>
          </div>
        </div>
      </section>
    </div>
  );
}

