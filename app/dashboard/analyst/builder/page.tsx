'use client';

import { useState, useEffect } from 'react';
import { BuilderLayout } from '@/components/builder/BuilderLayout';
import { Trash2, ExternalLink, Clock } from 'lucide-react';

interface SavedDashboard {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  created_at: string;
}

export default function DashboardBuilderPage() {
  const [savedDashboards, setSavedDashboards] = useState<SavedDashboard[]>([]);

  useEffect(() => {
    fetchDashboards();
  }, []);

  const fetchDashboards = async () => {
    try {
      const res = await fetch('/api/dashboards');
      if (res.ok) {
        const data = await res.json();
        setSavedDashboards(data.dashboards || []);
      }
    } catch { /* ignore */ }
  };

  const handleSave = async (name: string, description: string, tiles: any[], config?: any) => {
    try {
      const response = await fetch('/api/dashboards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          charts: tiles.map((t, i) => ({
            title: t.title,
            chartType: t.chartType,
            dataField: t.dataField || 'custom',
            width: t.width || 'half',
            position: i,
            query_config: t.query_config,
            visualization_config: t.visualization_config,
            layout: t.layout,
            page_name: t.page_name || 'Ringkasan Umum',
          })),
          config: config || { dateRange: '7d', autoRefresh: true, theme: 'dark' },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save');
      }

      const result = await response.json();
      fetchDashboards();
      return { embedUrl: result.dashboard.embedUrl };
    } catch (err) {
      console.error('Failed to save dashboard:', err);
      return null;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/dashboards?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSavedDashboards(prev => prev.filter(d => d.id !== id));
      }
    } catch { /* ignore */ }
  };

  return (
    <div
      className="fixed inset-0 flex flex-col bg-[var(--surface-1)] md:left-[260px]"
      style={{ zIndex: 10 }}
    >
      {/* Builder — takes remaining space, scrolls internally */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <BuilderLayout onSaveDashboard={handleSave} />
      </div>

      {/* Saved Dashboards — fixed at bottom, scrolls if needed */}
      {savedDashboards.length > 0 && (
        <div className="shrink-0 border-t border-[var(--surface-4)] bg-[var(--surface-1)] px-6 py-3 max-h-[180px] overflow-y-auto">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">
            Dashboard Tersimpan ({savedDashboards.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {savedDashboards.map(d => (
              <div
                key={d.id}
                className="flex items-center justify-between p-3 bg-[var(--surface-2)] border border-[var(--surface-4)] rounded-xl hover:shadow-sm transition-shadow"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[var(--text-primary)] truncate">{d.name}</p>
                  {d.description && (
                    <p className="text-[10px] text-[var(--text-muted)] truncate">{d.description}</p>
                  )}
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-[var(--text-muted)]">
                    <Clock size={10} />
                    {new Date(d.created_at).toLocaleDateString('id-ID')}
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <a
                    href={`/embed/custom/${d.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors"
                    title="Preview"
                  >
                    <ExternalLink size={14} />
                  </a>
                  <button
                    onClick={() => handleDelete(d.id)}
                    className="p-1.5 text-[var(--text-muted)] hover:text-red-500 transition-colors"
                    title="Hapus"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
