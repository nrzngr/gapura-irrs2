'use client';

import { useState, useEffect } from 'react';
import { BuilderLayout } from '@/components/builder/BuilderLayout';
import { Trash2, ExternalLink, Clock, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';

interface SavedDashboard {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  created_at: string;
}

export default function DashboardBuilderPage() {
  const [savedDashboards, setSavedDashboards] = useState<SavedDashboard[]>([]);
  const [savedExpanded, setSavedExpanded] = useState(true);

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

      {/* Saved Dashboards — fixed at bottom, collapsible */}
      {savedDashboards.length > 0 && (
        <div className="shrink-0 border-t border-[var(--surface-4)] bg-[var(--surface-1)]">
          {/* Collapsible header */}
          <button
            onClick={() => setSavedExpanded(!savedExpanded)}
            className="w-full flex items-center justify-between px-6 py-2.5 hover:bg-[var(--surface-2)] transition-colors"
          >
            <div className="flex items-center gap-2">
              <BarChart3 size={13} className="text-[var(--text-muted)]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Dashboard Tersimpan
              </h3>
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[var(--surface-3)] text-[var(--text-muted)] rounded-full">
                {savedDashboards.length}
              </span>
            </div>
            {savedExpanded ? <ChevronDown size={14} className="text-[var(--text-muted)]" /> : <ChevronUp size={14} className="text-[var(--text-muted)]" />}
          </button>

          {/* Expandable content */}
          {savedExpanded && (
            <div className="px-6 pb-3 max-h-[300px] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {savedDashboards.map(d => (
                  <div
                    key={d.id}
                    className="group flex items-center justify-between p-3 bg-[var(--surface-2)] border border-[var(--surface-4)] rounded-xl hover:shadow-md hover:border-[var(--brand-primary)]/30 hover:-translate-y-px transition-all"
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
                    <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
      )}
    </div>
  );
}
