'use client';

import { useState, useCallback, useEffect } from 'react';
import { Compass, LayoutGrid, Save, RotateCcw, Sparkles, Plus, Loader2 } from 'lucide-react';
import { useQueryBuilder } from '@/lib/hooks/useQueryBuilder';
import { useQueryExecution } from '@/lib/hooks/useQueryExecution';
import { useDashboardState } from '@/lib/hooks/useDashboardState';
import { FieldSidebar } from './FieldSidebar';
import { QueryPanel } from './QueryPanel';
import { ResultsPanel } from './ResultsPanel';
import { ChartPreview } from './ChartPreview';
import { ChartConfigPanel } from './ChartConfigPanel';
import { DashboardComposer } from './DashboardComposer';
import { SaveDashboardModal } from './SaveDashboardModal';
import type { ChartVisualization, QueryResult, FieldDef, AggregateFunction } from '@/types/builder';
import { useAIDashboard } from '@/lib/hooks/useAIDashboard';
import { cn } from '@/lib/utils';

type Mode = 'explore' | 'dashboard';

interface BuilderLayoutProps {
  onSaveDashboard: (name: string, description: string, tiles: any[], config?: any) => Promise<{ embedUrl: string } | null>;
}

const defaultVisualization: ChartVisualization = {
  chartType: 'bar',
  yAxis: [],
  showLegend: true,
  showLabels: false,
};

export function BuilderLayout({ onSaveDashboard }: BuilderLayoutProps) {
  const [mode, setMode] = useState<Mode>('explore');
  const [visualization, setVisualization] = useState<ChartVisualization>({ ...defaultVisualization });
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [editingTileId, setEditingTileId] = useState<string | null>(null);
  const [tileResults, setTileResults] = useState<Map<string, QueryResult>>(new Map());
  const [showWelcome, setShowWelcome] = useState(true);

  const [aiPrompt, setAiPrompt] = useState('');

  const qb = useQueryBuilder();
  const qe = useQueryExecution();
  const dash = useDashboardState();
  const ai = useAIDashboard();

  const hasDimensions = qb.query.dimensions.length > 0;
  const hasMeasures = qb.query.measures.length > 0;
  const hasQuery = hasDimensions || hasMeasures;
  const hasResult = qe.data !== null && qe.data.rows.length > 0;

  // Hide welcome once they interact
  useEffect(() => {
    if (hasQuery) setShowWelcome(false);
  }, [hasQuery]);

  const handleFieldClick = useCallback((table: string, field: FieldDef) => {
    if (field.type === 'number' || field.type === 'uuid') {
      const fn: AggregateFunction = field.type === 'uuid' ? 'COUNT' : 'SUM';
      qb.addMeasure({
        table,
        field: field.name,
        function: fn,
        alias: `${fn.toLowerCase()}_${field.name}`,
      });
    } else {
      const isDate = field.type === 'date' || field.type === 'datetime';
      qb.addDimension({
        table,
        field: field.name,
        alias: `${table}_${field.name}`,
        dateGranularity: isDate ? 'month' : undefined,
      });
    }
  }, [qb]);

  const handleExecute = useCallback(async () => {
    const result = await qe.execute(qb.query);

    if (result && result.columns.length > 0) {
      const dims = qb.query.dimensions.map(d => d.alias || `${d.table}_${d.field}`);
      const measures = qb.query.measures.map(m => m.alias || `${m.function.toLowerCase()}_${m.table}_${m.field}`);

      setVisualization(prev => ({
        ...prev,
        xAxis: dims[0] || result.columns[0],
        yAxis: measures.length > 0 ? measures : [result.columns[1] || result.columns[0]],
        chartType: prev.chartType !== 'bar' ? prev.chartType :
          dims.length === 1 && measures.length === 1
            ? (dims[0] && (qb.query.dimensions[0]?.dateGranularity) ? 'line' : 'bar')
            : dims.length === 0 && measures.length === 1 ? 'kpi' : 'bar',
      }));
    }

    return result;
  }, [qb.query, qe]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleExecute();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleExecute]);

  const executeTileQueries = useCallback(async () => {
    const results = new Map<string, QueryResult>();
    await Promise.all(
      dash.tiles.map(async tile => {
        if (tile.query.dimensions.length > 0 || tile.query.measures.length > 0) {
          try {
            const res = await fetch('/api/dashboards/query', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: tile.query }),
            });
            if (res.ok) {
              const data = await res.json();
              results.set(tile.id, data);
            }
          } catch { /* ignore */ }
        }
      })
    );
    setTileResults(results);
  }, [dash.tiles]);

  useEffect(() => {
    if (mode === 'dashboard') {
      executeTileQueries();
    }
  }, [mode, executeTileQueries]);

  const handleAIGenerate = useCallback(async () => {
    if (!aiPrompt.trim()) return;
    const def = await ai.generate(aiPrompt.trim());
    if (def) {
      dash.loadDashboard(def);
      setMode('dashboard');
    }
  }, [aiPrompt, ai, dash]);

  const addCurrentAsTile = useCallback(() => {
    if (!hasQuery) return;
    dash.addTile(qb.query, visualization);
    setMode('dashboard');
  }, [qb.query, visualization, dash, hasQuery]);

  const handleEditTile = useCallback((tileId: string) => {
    const tile = dash.tiles.find(t => t.id === tileId);
    if (!tile) return;
    setEditingTileId(tileId);
    qb.loadQuery(tile.query);
    setVisualization(tile.visualization);
    setMode('explore');
  }, [dash.tiles, qb]);

  const handleSaveTileEdit = useCallback(async () => {
    if (!editingTileId) return;
    const result = await handleExecute();
    dash.updateTile(editingTileId, { query: qb.query, visualization });
    if (result) {
      setTileResults(prev => {
        const next = new Map(prev);
        next.set(editingTileId, result);
        return next;
      });
    }
    setEditingTileId(null);
    setMode('dashboard');
  }, [editingTileId, qb.query, visualization, dash, handleExecute]);

  const handleSave = useCallback(async (name: string, description: string) => {
    // Build a tile -> page_name lookup from pages
    const tilePageMap = new Map<string, string>();
    if (dash.pages.length > 0) {
      for (const page of dash.pages) {
        for (const tile of page.tiles) {
          tilePageMap.set(tile.id, page.name);
        }
      }
    }

    const tiles = dash.tiles.map((t, idx) => ({
      title: t.visualization.title || 'Tanpa Judul',
      chartType: t.visualization.chartType,
      dataField: 'custom',
      width: t.layout.w >= 12 ? 'full' : t.layout.w >= 6 ? 'half' : 'third',
      position: idx,
      query_config: t.query,
      visualization_config: t.visualization,
      layout: t.layout,
      page_name: tilePageMap.get(t.id) || 'Ringkasan Umum',
    }));

    const config = {
      dateRange: '7d',
      autoRefresh: true,
      pages: dash.pages.map(p => p.name),
    };

    return onSaveDashboard(name, description, tiles, config);
  }, [dash.tiles, dash.pages, onSaveDashboard]);

  const updateVisualization = useCallback((updates: Partial<ChartVisualization>) => {
    setVisualization(prev => ({ ...prev, ...updates }));
  }, []);

  const chartPreviewNode = qe.data && qe.data.rows.length > 0
    ? <ChartPreview visualization={visualization} result={qe.data} />
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* Top bar with steps */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--surface-1)] border-b border-[var(--surface-4)]">
        <div className="flex items-center gap-3">
          {/* Mode toggle */}
          <div className="flex bg-[var(--surface-2)] rounded-xl p-0.5 border border-[var(--surface-4)]">
            <button
              onClick={() => setMode('explore')}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all",
                mode === 'explore'
                  ? "bg-[var(--brand-primary)] text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              <Compass size={14} />
              Jelajahi Data
            </button>
            <button
              onClick={() => {
                if (editingTileId) handleSaveTileEdit();
                else setMode('dashboard');
              }}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all",
                mode === 'dashboard'
                  ? "bg-[var(--brand-primary)] text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              <LayoutGrid size={14} />
              Susun Dashboard {dash.tiles.length > 0 && `(${dash.tiles.length})`}
            </button>
          </div>

          {editingTileId && mode === 'explore' && (
            <span className="px-3 py-1 text-xs font-bold bg-amber-50 text-amber-600 border border-amber-200 rounded-full">
              Sedang mengedit tile
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {mode === 'explore' && !editingTileId && hasResult && (
            <button
              onClick={addCurrentAsTile}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
            >
              <Plus size={14} />
              Tambah ke Dashboard
            </button>
          )}
          {editingTileId && mode === 'explore' && (
            <button
              onClick={handleSaveTileEdit}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
              <Save size={14} />
              Simpan Perubahan
            </button>
          )}
          {mode === 'explore' && (
            <button
              onClick={() => { qb.reset(); qe.clear(); setVisualization({ ...defaultVisualization }); setEditingTileId(null); setShowWelcome(true); }}
              className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] rounded-lg transition-colors"
              title="Mulai Ulang"
            >
              <RotateCcw size={14} />
            </button>
          )}
          {mode === 'dashboard' && dash.tiles.length > 0 && (
            <button
              onClick={() => setShowSaveModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-[var(--brand-primary)] text-white rounded-lg hover:opacity-90 shadow-sm transition-all"
            >
              <Save size={14} />
              Simpan Dashboard
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      {mode === 'explore' ? (
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Field Sidebar */}
          <div className="w-[300px] shrink-0 overflow-hidden">
            <FieldSidebar
              source={qb.query.source}
              activeJoins={qb.query.joins.map(j => j.joinKey)}
              onFieldClick={handleFieldClick}
              onToggleJoin={qb.toggleJoin}
              onSetSource={qb.setSource}
            />
          </div>

          {/* Center: Query + Results */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Query Config (top) */}
            <div className="border-b border-[var(--surface-4)] max-h-[45%] overflow-auto">
              <QueryPanel
                query={qb.query}
                availableFields={qb.availableFields}
                loading={qe.loading}
                onRemoveDimension={qb.removeDimension}
                onUpdateDimension={qb.updateDimension}
                onRemoveMeasure={qb.removeMeasure}
                onUpdateMeasure={qb.updateMeasure}
                onAddFilter={qb.addFilter}
                onRemoveFilter={qb.removeFilter}
                onUpdateFilter={qb.updateFilter}
                onAddSort={qb.addSort}
                onRemoveSort={qb.removeSort}
                onExecute={handleExecute}
              />
            </div>

            {/* Results (bottom) */}
            <div className="flex-1 overflow-hidden">
              {showWelcome && !hasQuery ? (
                /* Welcome / onboarding state with AI prompt */
                <div className="flex items-center justify-center h-full p-8 overflow-auto">
                  <div className="w-full max-w-2xl">
                    {/* AI Prompt Card */}
                    <div className="relative p-[1px] rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 mb-5">
                      <div className="bg-[var(--surface-1)] rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <Sparkles size={16} className="text-purple-500" />
                          <span className="text-sm font-bold text-[var(--text-primary)]">Buat Dashboard dengan AI</span>
                        </div>
                        <textarea
                          value={aiPrompt}
                          onChange={(e) => { setAiPrompt(e.target.value); ai.clearError(); }}
                          onKeyDown={(e) => {
                            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                              e.preventDefault();
                              handleAIGenerate();
                            }
                          }}
                          placeholder="Contoh: Buatkan dashboard laporan compliment bulan Januari 2026..."
                          className="w-full h-20 px-3 py-2.5 text-sm bg-[var(--surface-2)] border border-[var(--surface-4)] rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                          disabled={ai.loading}
                        />
                        {ai.error && (
                          <p className="mt-2 text-xs text-red-500 text-left">{ai.error}</p>
                        )}
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-[10px] text-[var(--text-muted)]">Ctrl+Enter untuk generate</span>
                          <button
                            onClick={handleAIGenerate}
                            disabled={ai.loading || !aiPrompt.trim()}
                            className={cn(
                              "flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all",
                              ai.loading || !aiPrompt.trim()
                                ? "bg-[var(--surface-3)] text-[var(--text-muted)] cursor-not-allowed"
                                : "bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:shadow-lg hover:shadow-purple-500/25"
                            )}
                          >
                            {ai.loading ? (
                              <>
                                <Loader2 size={14} className="animate-spin" />
                                Membuat...
                              </>
                            ) : (
                              <>
                                <Sparkles size={14} />
                                Buat dengan AI
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-3 mb-5">
                      <div className="flex-1 h-px bg-[var(--surface-4)]" />
                      <span className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider">atau buat manual</span>
                      <div className="flex-1 h-px bg-[var(--surface-4)]" />
                    </div>

                    {/* Compact 3-step guide */}
                    <div className="flex gap-3">
                      <div className="flex-1 p-3 bg-[var(--surface-2)] border border-[var(--surface-4)] rounded-xl">
                        <span className="inline-flex w-5 h-5 rounded-full bg-blue-500 text-white items-center justify-center text-[10px] font-bold mb-1.5">1</span>
                        <p className="text-xs text-[var(--text-secondary)]">Pilih field di panel kiri</p>
                      </div>
                      <div className="flex-1 p-3 bg-[var(--surface-2)] border border-[var(--surface-4)] rounded-xl">
                        <span className="inline-flex w-5 h-5 rounded-full bg-emerald-500 text-white items-center justify-center text-[10px] font-bold mb-1.5">2</span>
                        <p className="text-xs text-[var(--text-secondary)]">Klik &quot;Jalankan Query&quot;</p>
                      </div>
                      <div className="flex-1 p-3 bg-[var(--surface-2)] border border-[var(--surface-4)] rounded-xl">
                        <span className="inline-flex w-5 h-5 rounded-full bg-purple-500 text-white items-center justify-center text-[10px] font-bold mb-1.5">3</span>
                        <p className="text-xs text-[var(--text-secondary)]">Atur grafik &amp; simpan</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <ResultsPanel
                  result={qe.data}
                  loading={qe.loading}
                  error={qe.error}
                  visualization={visualization}
                  chartPreview={chartPreviewNode}
                />
              )}
            </div>
          </div>

          {/* Right: Chart Config — only show when we have results */}
          {hasResult && (
            <div className="w-[280px] shrink-0 overflow-hidden">
              <ChartConfigPanel
                visualization={visualization}
                result={qe.data}
                onChange={updateVisualization}
              />
            </div>
          )}
        </div>
      ) : (
        <DashboardComposer
          tiles={dash.tiles}
          onAddTile={dash.addEmptyTile}
          onEditTile={handleEditTile}
          onRemoveTile={dash.removeTile}
          onResizeTile={(id, w, h) => dash.updateTileLayout(id, { w, h })}
          onApplyPreset={dash.applyLayoutPreset}
          tileResults={tileResults}
          dashboardName={dash.name}
          dashboardDescription={dash.description}
        />
      )}

      <SaveDashboardModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        initialName={dash.name}
        initialDescription={dash.description}
        onSave={handleSave}
      />
    </div>
  );
}
