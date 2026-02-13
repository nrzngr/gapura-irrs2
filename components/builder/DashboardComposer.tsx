'use client';

import { useState } from 'react';
import { Plus, RotateCcw, Share2, MoreVertical, User, LayoutGrid, Sparkles } from 'lucide-react';
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
  yearRange?: string;
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
    const half = (w - gap - 2) / 2;
    const topH = (h - gap - 2) * 0.55;
    const botH = h - 2 - topH - gap;
    rects.push({ x: 1, y: 1, w: half, h: topH });
    rects.push({ x: 1 + half + gap, y: 1, w: half, h: topH });
    rects.push({ x: 1, y: 1 + topH + gap, w: w - 2, h: botH });
  } else {
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
  yearRange = '2025 - 2026',
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

  const isCGO = activePage?.name?.toLowerCase().includes('cgo');
  const displayTitle = isCGO 
    ? `CGO Cargo Customer Feedback ${yearRange}`
    : `Landside & Airside Customer Feedback ${yearRange}`;

  return (
    <div className="flex h-full bg-[#f5f5f5]">
      {/* Main Content */}
      <div
        className="flex-1 flex flex-col overflow-hidden"
      >
        {/* Top Bar with Page Tabs + Actions */}
        <div className="flex items-center justify-between gap-2 px-4 py-2 bg-white border-b border-[#e0e0e0]">
          {/* Page tabs for multi-page editing */}
          {hasPages ? (
            <div className="flex items-center gap-1 overflow-x-auto">
              {pages.map((page, idx) => (
                <button
                  key={idx}
                  onClick={() => setActivePageIdx(idx)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all",
                    activePageIdx === idx
                      ? "text-white shadow-sm"
                      : "text-[#666] hover:bg-[#f5f5f5]"
                  )}
                  style={activePageIdx === idx ? { backgroundColor: GAPURA_GREEN } : undefined}
                >
                  {page.name}
                </button>
              ))}
            </div>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#666] hover:bg-[#f5f5f5] rounded-lg transition-colors">
              <RotateCcw size={14} />
              Reset
            </button>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white rounded-lg transition-all hover:opacity-90"
              style={{ backgroundColor: GAPURA_GREEN }}
            >
              <Share2 size={14} />
              Share
            </button>
            <button className="p-1.5 text-[#666] hover:bg-[#f5f5f5] rounded-lg transition-colors">
              <MoreVertical size={18} />
            </button>
            <div className="w-8 h-8 rounded-full bg-[#e0e0e0] flex items-center justify-center">
              <User size={16} className="text-[#666]" />
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-auto">
          <div>
            {/* Gapura Header */}
            <div className="bg-white px-6 py-4">
              {/* Logo + Title Row */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <img src="/logo.png" alt="Gapura" style={{ height: 40, objectFit: 'contain' }} />
                  <h1 className="text-lg font-bold text-[#333]">
                    {displayTitle}
                  </h1>
                </div>
                <button
                  className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-white rounded transition-colors"
                  style={{ backgroundColor: GAPURA_GREEN }}
                >
                  Select date range
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2.5 3.5L5 6L7.5 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>

              {/* Banner */}
              <div 
                className="flex items-center justify-between px-4 py-2 rounded"
                style={{ backgroundColor: GAPURA_BANNER }}
              >
                <span className="text-sm font-bold text-white">
                  {dashboardDescription || 'Irregularity, Complain & Compliment Report'}
                </span>
                <div className="flex items-center gap-2">
                  {['HUB', 'Branch', 'Maskapai', 'Airlines', 'Category', 'Area'].map(f => (
                    <button
                      key={f}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white rounded border border-white/30 hover:bg-white/10 transition-colors"
                      style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                    >
                      {f}
                      <span className="text-[10px]">&#9660;</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* KPI Stats Row */}
              {kpiTiles.length > 0 && (
                <div className="grid grid-cols-4 gap-4 mt-4">
                  {kpiTiles.slice(0, 4).map(tile => {
                    const result = tileResults.get(tile.id);
                    let value: string | number = '-';
                    if (result && result.rows.length > 0) {
                      const row = result.rows[0] as Record<string, unknown>;
                      const yKey = tile.visualization.yAxis?.[0] || result.columns[result.columns.length - 1];
                      value = Number(row[yKey]) || 0;
                    }
                    return (
                      <div 
                        key={tile.id} 
                        className="group relative bg-white rounded-lg px-5 py-4 border border-[#e0e0e0] transition-shadow hover:shadow-md"
                        style={{ borderLeft: `3px solid ${GAPURA_GREEN}` }}
                      >
                        <div className="text-xs font-semibold uppercase" style={{ color: GAPURA_GREEN }}>
                          {tile.visualization.title || 'KPI'}
                        </div>
                        <div className="text-[28px] font-bold mt-1" style={{ color: GAPURA_GREEN }}>
                          {typeof value === 'number' ? value.toLocaleString('id-ID') : value}
                        </div>
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onEditTile(tile.id)}
                            className="text-[10px] text-[#666] bg-white border border-[#e0e0e0] rounded px-1.5 py-0.5 hover:text-[#6b8e3d] transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => onRemoveTile(tile.id)}
                            className="text-[10px] text-red-400 bg-white border border-[#e0e0e0] rounded px-1.5 py-0.5 hover:text-red-600 transition-colors"
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
            <div className="px-6 py-5">
              {contentTiles.length > 0 ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(12, 1fr)',
                    gridAutoRows: '220px',
                    gap: 20,
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
                        dashboardId={activePage?.name || 'untitled'}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="relative p-6 border-2 border-dashed border-[#e0e0e0] rounded-2xl">
                    <LayoutGrid size={40} className="text-[#999] opacity-30" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-[#666] mb-1">Belum ada tile</p>
                    <p className="text-xs text-[#999]">Mulai dengan menambah tile atau gunakan AI</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={onAddTile}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-lg transition-all hover:opacity-90"
                      style={{ backgroundColor: GAPURA_GREEN }}
                    >
                      <Plus size={14} />
                      Tambah Tile
                    </button>
                    <button
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-purple-600 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                    >
                      <Sparkles size={14} />
                      Buat dengan AI
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Timestamp */}
            <div className="px-5 py-3 border-t border-[#e0e0e0] bg-white">
              <p className="text-xs text-[#999]">
                Data Last Updated: 2/13/2026 1:18:37 PM | <button className="text-[#6b8e3d] hover:underline">Privacy Policy</button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
