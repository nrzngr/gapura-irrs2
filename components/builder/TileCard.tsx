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
    <div className="group bg-[var(--surface-1)] border border-[var(--surface-4)] rounded-lg overflow-hidden flex flex-col h-full transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--surface-4)]/50">
        <h4 className="m-0 text-xs font-bold text-[var(--text-primary)] truncate flex-1">
          {title}
        </h4>
        <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Resize dropdown */}
          <select
            value={`${tile.layout.w}-${tile.layout.h}`}
            onChange={e => {
              const [w, h] = e.target.value.split('-').map(Number);
              onResize(tile.id, w, h);
            }}
            className="py-0.5 px-1 text-[10px] bg-transparent border border-[var(--surface-4)] rounded text-[var(--text-muted)] outline-none cursor-pointer"
          >
            {SIZE_OPTIONS.map(s => (
              <option key={`${s.w}-${s.h}`} value={`${s.w}-${s.h}`}>{s.label}</option>
            ))}
          </select>
          <button
            onClick={() => onEdit(tile.id)}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors"
            title="Edit"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={() => onRemove(tile.id)}
            className="p-1 text-[var(--text-muted)] hover:text-red-500 transition-colors"
            title="Hapus"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-[200px] p-1.5">
        {!isConfigured ? (
          <div
            className="flex items-center justify-center h-full cursor-pointer rounded hover:bg-[var(--surface-2)] transition-colors"
            onClick={() => onEdit(tile.id)}
          >
            <p className="text-xs text-[var(--text-muted)]">Klik Edit untuk mengkonfigurasi query</p>
          </div>
        ) : result && result.rows.length > 0 ? (
          <ChartPreview visualization={tile.visualization} result={result} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-[var(--text-muted)]">Menunggu data...</p>
          </div>
        )}
      </div>
    </div>
  );
}
