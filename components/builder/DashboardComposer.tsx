'use client';

import { Plus, LayoutGrid, Columns2, Columns3, PanelTop, PanelBottom } from 'lucide-react';
import { TileCard } from './TileCard';
import type { DashboardTile, QueryResult } from '@/types/builder';
import type { LayoutPreset } from '@/lib/hooks/useDashboardState';

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
}

const GAPURA_GREEN = '#6b8e3d';
const GAPURA_BANNER = '#5a7a3a';

const PRESETS: { key: LayoutPreset; label: string; icon: typeof LayoutGrid }[] = [
  { key: '1-col', label: '1 Kolom', icon: LayoutGrid },
  { key: '2-col', label: '2 Kolom', icon: Columns2 },
  { key: '3-col', label: '3 Kolom', icon: Columns3 },
  { key: '2+1', label: '2+1 Grid', icon: PanelBottom },
  { key: '1+2', label: '1+2 Grid', icon: PanelTop },
];

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
}: DashboardComposerProps) {
  // Separate KPI tiles from content tiles
  const kpiTiles = tiles.filter(t => t.visualization.chartType === 'kpi');
  const contentTiles = tiles.filter(t => t.visualization.chartType !== 'kpi');

  return (
    <div className="flex flex-col h-full" style={{ background: '#f5f5f5' }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b" style={{ borderColor: '#e0e0e0' }}>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#999' }}>Layout:</span>
          {PRESETS.map(p => {
            const Icon = p.icon;
            return (
              <button
                key={p.key}
                onClick={() => onApplyPreset(p.key)}
                className="flex items-center gap-1 px-2 py-1 rounded-md transition-colors"
                style={{ fontSize: 10, fontWeight: 500, color: '#666', background: 'transparent' }}
                onMouseOver={e => (e.currentTarget.style.background = '#f0f0f0')}
                onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                title={p.label}
              >
                <Icon size={12} />
                <span className="hidden sm:inline">{p.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={onAddTile}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white rounded-lg transition-all"
          style={{ background: GAPURA_GREEN }}
          onMouseOver={e => (e.currentTarget.style.opacity = '0.9')}
          onMouseOut={e => (e.currentTarget.style.opacity = '1')}
        >
          <Plus size={14} />
          Tambah Tile
        </button>
      </div>

      {/* Preview Area */}
      <div className="flex-1 overflow-auto">
        {tiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <LayoutGrid size={48} style={{ color: '#ddd' }} />
            <p style={{ fontSize: 13, color: '#999' }}>Belum ada tile. Klik &quot;Tambah Tile&quot; untuk memulai.</p>
          </div>
        ) : (
          <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            {/* Gapura Header Preview */}
            <div style={{ background: '#fff', borderBottom: '1px solid #e0e0e0', padding: '12px 20px' }}>
              {/* Logo + Title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <img src="/logo.png" alt="Gapura" style={{ height: 40, objectFit: 'contain' }} />
                <span style={{ fontSize: 18, fontWeight: 700, color: '#333' }}>
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
                  gap: 12, marginTop: 12, textAlign: 'center',
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
                      <div key={tile.id} style={{ position: 'relative' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: GAPURA_GREEN }}>{tile.visualization.title || 'KPI'}</div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: GAPURA_GREEN }}>
                          {typeof value === 'number' ? value.toLocaleString('id-ID') : value}
                        </div>
                        {/* Edit/Remove overlay */}
                        <div style={{
                          position: 'absolute', top: 0, right: 0, display: 'flex', gap: 2,
                        }}>
                          <button
                            onClick={() => onEditTile(tile.id)}
                            style={{ fontSize: 9, color: '#999', background: 'rgba(255,255,255,0.8)', border: '1px solid #e0e0e0', borderRadius: 3, padding: '1px 4px', cursor: 'pointer' }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => onRemoveTile(tile.id)}
                            style={{ fontSize: 9, color: '#e53935', background: 'rgba(255,255,255,0.8)', border: '1px solid #e0e0e0', borderRadius: 3, padding: '1px 4px', cursor: 'pointer' }}
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
