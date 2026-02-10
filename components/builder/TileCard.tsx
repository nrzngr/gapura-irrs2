'use client';

import { Pencil, Trash2 } from 'lucide-react';
import type { DashboardTile, QueryResult } from '@/types/builder';
import { ChartPreview } from './ChartPreview';

interface TileCardProps {
  tile: DashboardTile;
  result?: QueryResult | null;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
  onResize: (id: string, w: number, h: number) => void;
}

const SIZE_OPTIONS = [
  { label: '1/3', w: 4, h: 2 },
  { label: '1/2', w: 6, h: 2 },
  { label: 'Full', w: 12, h: 2 },
  { label: '1/2 Tall', w: 6, h: 3 },
  { label: 'Full Tall', w: 12, h: 3 },
];

export function TileCard({ tile, result, onEdit, onRemove, onResize }: TileCardProps) {
  const title = tile.visualization.title || 'Tile Tanpa Judul';
  const hasDims = tile.query.dimensions.length > 0;
  const hasMeasures = tile.query.measures.length > 0;
  const isConfigured = hasDims || hasMeasures;

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e8e8e8',
        borderRadius: 8,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        transition: 'box-shadow 0.2s',
      }}
      onMouseOver={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)')}
      onMouseOut={e => (e.currentTarget.style.boxShadow = 'none')}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', borderBottom: '1px solid #f0f0f0',
      }}>
        <h4 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {title}
        </h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 8 }}>
          {/* Resize dropdown */}
          <select
            value={`${tile.layout.w}-${tile.layout.h}`}
            onChange={e => {
              const [w, h] = e.target.value.split('-').map(Number);
              onResize(tile.id, w, h);
            }}
            style={{
              padding: '2px 4px', fontSize: 10, background: 'transparent',
              border: '1px solid #e0e0e0', borderRadius: 3, color: '#999',
              outline: 'none', cursor: 'pointer',
            }}
          >
            {SIZE_OPTIONS.map(s => (
              <option key={`${s.w}-${s.h}`} value={`${s.w}-${s.h}`}>{s.label}</option>
            ))}
          </select>
          <button
            onClick={() => onEdit(tile.id)}
            style={{ padding: 3, color: '#999', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 3, transition: 'color 0.2s' }}
            onMouseOver={e => (e.currentTarget.style.color = '#6b8e3d')}
            onMouseOut={e => (e.currentTarget.style.color = '#999')}
            title="Edit"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={() => onRemove(tile.id)}
            style={{ padding: 3, color: '#999', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 3, transition: 'color 0.2s' }}
            onMouseOver={e => (e.currentTarget.style.color = '#e53935')}
            onMouseOut={e => (e.currentTarget.style.color = '#999')}
            title="Hapus"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, minHeight: 200, padding: 6 }}>
        {!isConfigured ? (
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: '100%', cursor: 'pointer', transition: 'background 0.2s',
            }}
            onClick={() => onEdit(tile.id)}
            onMouseOver={e => (e.currentTarget.style.background = '#fafafa')}
            onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
          >
            <p style={{ fontSize: 12, color: '#bbb' }}>Klik Edit untuk mengkonfigurasi query</p>
          </div>
        ) : result && result.rows.length > 0 ? (
          <ChartPreview visualization={tile.visualization} result={result} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <p style={{ fontSize: 12, color: '#bbb' }}>Menunggu data...</p>
          </div>
        )}
      </div>
    </div>
  );
}
