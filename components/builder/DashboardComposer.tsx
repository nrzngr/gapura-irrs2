'use client';

import { useState } from 'react';
import { Plus, LayoutGrid, Sparkles } from 'lucide-react';
import { TileCard } from './TileCard';
import type { DashboardTile, QueryResult, DashboardPage } from '@/types/builder';
import type { LayoutPreset } from '@/lib/hooks/useDashboardState';
import { cn } from '@/lib/utils';

interface DashboardComposerProps {
  tiles: DashboardTile[];
  onAddTile: () => void;
  onEditTile: (id: string) => void;
  onRemoveTile: (id: string) => void;
  onResizeTile: (id: string, w: number, h: number) => void;
  onApplyPreset: (preset: LayoutPreset) => void;
  tileResults: Map<string, QueryResult>;
  dashboardName?: string;
  dashboardDescription?: string;
  pages?: DashboardPage[];
}

const GAPURA_GREEN = '#6b8e3d';
const GAPURA_BANNER = '#5a7a3a';

const PRESETS: { key: LayoutPreset; label: string; cols: number[] }[] = [
  { key: '1-col', label: '1 Kolom', cols: [1] },
  { key: '2-col', label: '2 Kolom', cols: [1, 1] },
  { key: '3-col', label: '3 Kolom', cols: [1, 1, 1] },
  { key: '2+1', label: '2+1 Grid', cols: [1, 1, 2] },
  { key: '1+2', label: '1+2 Grid', cols: [2, 1, 1] },
];

/** Mini SVG grid preview for layout presets */
function LayoutPreviewSVG({ cols }: { cols: number[] }) {
  const w = 24;
  const h = 16;
  const gap = 1.5;
  const rects: { x: number; y: number; w: number; h: number }[] = [];

  if (cols.length === 1) {
    rects.push({ x: 1, y: 1, w: w - 2, h: h - 2 });
  } else if (cols.length === 2 && cols[0] === cols[1]) {
    const half = (w - gap - 2) / 2;
    rects.push({ x: 1, y: 1, w: half, h: h - 2 });
    rects.push({ x: 1 + half + gap, y: 1, w: half, h: h - 2 });
  } else if (cols.length === 3 && cols.every(c => c === 1)) {
    const third = (w - gap * 2 - 2) / 3;
    rects.push({ x: 1, y: 1, w: third, h: h - 2 });
    rects.push({ x: 1 + third + gap, y: 1, w: third, h: h - 2 });
    rects.push({ x: 1 + (third + gap) * 2, y: 1, w: third, h: h - 2 });
  } else if (cols.length === 3 && cols[2] === 2) {
    // 2+1: two on top, one full bottom
    const half = (w - gap - 2) / 2;
    const topH = (h - gap - 2) * 0.55;
    const botH = h - 2 - topH - gap;
    rects.push({ x: 1, y: 1, w: half, h: topH });
    rects.push({ x: 1 + half + gap, y: 1, w: half, h: topH });
    rects.push({ x: 1, y: 1 + topH + gap, w: w - 2, h: botH });
  } else {
    // 1+2: one full top, two on bottom
    const half = (w - gap - 2) / 2;
    const topH = (h - gap - 2) * 0.45;
    const botH = h - 2 - topH - gap;
    rects.push({ x: 1, y: 1, w: w - 2, h: topH });
    rects.push({ x: 1, y: 1 + topH + gap, w: half, h: botH });
    rects.push({ x: 1 + half + gap, y: 1 + topH + gap, w: half, h: botH });
  }

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} rx={1.5} fill="currentColor" opacity={0.35} />
      ))}
    </svg>
  );
}

export function DashboardComposer({
  tiles,
  onAddTile,
  onEditTile,
  onRemoveTile,
  onResizeTile,
  onApplyPreset,
  tileResults,
  dashboardName,
  dashboardDescription,
  pages = [],
}: DashboardComposerProps) {
  const [activePageIdx, setActivePageIdx] = useState(0);

  // Determine which tiles to show based on active page
  const hasPages = pages.length > 1;
  const activePage = hasPages ? pages[activePageIdx] : null;
  const filteredTileIds = activePage ? new Set(activePage.tiles.map(t => t.id)) : null;

  const visibleTiles = filteredTileIds
    ? tiles.filter(t => filteredTileIds.has(t.id))
    : tiles;

  // Separate KPI tiles from content tiles
  const kpiTiles = visibleTiles.filter(t => t.visualization.chartType === 'kpi');
  const contentTiles = visibleTiles.filter(t => t.visualization.chartType !== 'kpi');

  return (
    <div className="flex flex-col h-full bg-[var(--surface-2)]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[var(--surface-1)] border-b border-[var(--surface-4)]">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Layout:</span>
          <div className="flex items-center gap-1">
            {PRESETS.map(p => (
              <button
                key={p.key}
                onClick={() => onApplyPreset(p.key)}
                className="flex items-center justify-center w-10 h-8 rounded-lg border border-transparent text-[var(--text-muted)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] hover:bg-[var(--surface-2)] transition-all"
                title={p.label}
              >
                <LayoutPreviewSVG cols={p.cols} />
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onAddTile}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white rounded-lg transition-all hover:opacity-90"
          style={{ background: GAPURA_GREEN }}
        >
          <Plus size={14} />
          Tambah Tile
        </button>
      </div>

      {/* Page Tabs (if multi-page) */}
      {hasPages && (
        <div className="flex items-center gap-1 px-4 py-1.5 bg-[var(--surface-1)] border-b border-[var(--surface-4)] overflow-x-auto">
          {pages.map((page, idx) => (
            <button
              key={idx}
              onClick={() => setActivePageIdx(idx)}
              className={cn(
                "px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all whitespace-nowrap",
                activePageIdx === idx
                  ? "text-white shadow-sm"
                  : "text-[var(--text-muted)] bg-[var(--surface-2)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-3)]"
              )}
              style={activePageIdx === idx ? { background: GAPURA_GREEN } : undefined}
            >
              {page.name}
              <span className="ml-1.5 opacity-60">({page.tiles.length})</span>
            </button>
          ))}
        </div>
      )}

      {/* Preview Area */}
      <div className="flex-1 overflow-auto">
        {tiles.length === 0 ? (
          /* Enhanced empty state */
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="relative p-6 border-2 border-dashed border-[var(--surface-4)] rounded-2xl">
              <LayoutGrid size={40} className="text-[var(--text-muted)] opacity-30" />
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[var(--surface-4)] animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-[var(--text-secondary)] mb-1">Belum ada tile</p>
              <p className="text-xs text-[var(--text-muted)]">Mulai dengan menambah tile atau gunakan AI</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onAddTile}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-lg transition-all hover:opacity-90"
                style={{ background: GAPURA_GREEN }}
              >
                <Plus size={14} />
                Tambah Tile
              </button>
              <button
                onClick={() => {/* AI hint - user should go to explore mode */}}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-purple-600 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <Sparkles size={14} />
                Buat dengan AI
              </button>
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            {/* Gapura Header Preview */}
            <div className="bg-[var(--surface-1)] border-b border-[var(--surface-4)]" style={{ padding: '12px 20px' }}>
              {/* Logo + Title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <img src="/logo.png" alt="Gapura" style={{ height: 40, objectFit: 'contain' }} />
                <span className="text-lg font-bold text-[var(--text-primary)]">
                  {dashboardName || 'Dashboard Preview'}
                </span>
                <div style={{ marginLeft: 'auto' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '5px 12px', borderRadius: 4,
                    background: GAPURA_GREEN, color: '#fff', fontSize: 11, fontWeight: 500,
                  }}>
                    Select date range
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2.5 3.5L5 6L7.5 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                </div>
              </div>

              {/* Banner */}
              <div style={{
                background: GAPURA_BANNER, borderRadius: 4, padding: '7px 14px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6,
              }}>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 12 }}>
                  {dashboardDescription || 'Irregularity, Complain & Compliment Report'}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['HUB', 'Branch', 'Airlines', 'Category'].map(f => (
                    <span key={f} style={{
                      padding: '2px 8px', borderRadius: 3,
                      background: 'rgba(255,255,255,0.2)', color: '#fff',
                      border: '1px solid rgba(255,255,255,0.3)',
                      fontSize: 10, fontWeight: 500,
                    }}>
                      {f} <span style={{ fontSize: 8 }}>&#9660;</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* KPI Stats Row */}
              {kpiTiles.length > 0 && (
                <div style={{
                  display: 'grid', gridTemplateColumns: `repeat(${Math.min(kpiTiles.length, 4)}, 1fr)`,
                  gap: 12, marginTop: 12,
                }}>
                  {kpiTiles.slice(0, 4).map(tile => {
                    const result = tileResults.get(tile.id);
                    let value: string | number = '-';
                    if (result && result.rows.length > 0) {
                      const row = result.rows[0] as Record<string, unknown>;
                      const yKey = tile.visualization.yAxis?.[0] || result.columns[result.columns.length - 1];
                      value = Number(row[yKey]) || 0;
                    }
                    return (
                      <div key={tile.id} className="group relative bg-[var(--surface-2)] rounded-xl p-4 border border-[var(--surface-4)]" style={{ borderLeft: `3px solid ${GAPURA_GREEN}` }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: GAPURA_GREEN }}>{tile.visualization.title || 'KPI'}</div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: GAPURA_GREEN }}>
                          {typeof value === 'number' ? value.toLocaleString('id-ID') : value}
                        </div>
                        {/* Edit/Remove overlay */}
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onEditTile(tile.id)}
                            className="text-[9px] text-[var(--text-muted)] bg-[var(--surface-1)] border border-[var(--surface-4)] rounded px-1.5 py-0.5 hover:text-[var(--brand-primary)] transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => onRemoveTile(tile.id)}
                            className="text-[9px] text-red-400 bg-[var(--surface-1)] border border-[var(--surface-4)] rounded px-1.5 py-0.5 hover:text-red-600 transition-colors"
                          >
                            X
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Content Tiles Grid */}
            <div style={{ padding: 16 }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(12, 1fr)',
                  gridAutoRows: '180px',
                  gap: 12,
                }}
              >
                {contentTiles.map(tile => (
                  <div
                    key={tile.id}
                    style={{
                      gridColumn: `span ${tile.layout.w}`,
                      gridRow: `span ${tile.layout.h}`,
                    }}
                  >
                    <TileCard
                      tile={tile}
                      result={tileResults.get(tile.id)}
                      onEdit={onEditTile}
                      onRemove={onRemoveTile}
                      onResize={onResizeTile}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
