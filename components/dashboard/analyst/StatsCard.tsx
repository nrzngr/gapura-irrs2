'use client';

import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  icon: LucideIcon;
  value: number | string;
  label: string;
  onClick?: () => void;
  className?: string;
}

export function StatsCard({ icon: Icon, value, label, onClick, className }: StatsCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative rounded-2xl p-6 transition-all duration-400 cursor-pointer',
        'bg-surface-2 border border-transparent',
        'hover:-translate-y-1',
        onClick && 'cursor-pointer',
        className
      )}
      style={{
        backgroundImage: `
          linear-gradient(var(--surface-2), var(--surface-2)),
          linear-gradient(135deg, oklch(0.65 0.18 160 / 0.15), oklch(0.58 0.2 162 / 0.08))
        `,
        backgroundOrigin: 'border-box',
        backgroundClip: 'padding-box, border-box',
        boxShadow: '0 2px 8px oklch(0.45 0.06 160 / 0.04)',
        transition: 'all 400ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundImage = `
          linear-gradient(var(--surface-2), var(--surface-2)),
          linear-gradient(135deg, oklch(0.65 0.18 160 / 0.3), oklch(0.58 0.2 162 / 0.15))
        `;
        e.currentTarget.style.boxShadow = '0 8px 24px oklch(0.45 0.06 160 / 0.06), 0 16px 48px oklch(0.65 0.18 160 / 0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundImage = `
          linear-gradient(var(--surface-2), var(--surface-2)),
          linear-gradient(135deg, oklch(0.65 0.18 160 / 0.15), oklch(0.58 0.2 162 / 0.08))
        `;
        e.currentTarget.style.boxShadow = '0 2px 8px oklch(0.45 0.06 160 / 0.04)';
      }}
    >
      {/* Icon */}
      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[oklch(0.65_0.18_160_/_0.1)] mb-4">
        <Icon className="w-6 h-6 text-brand-emerald-600" />
      </div>

      {/* Value */}
      <div className="font-mono font-semibold text-3xl sm:text-4xl text-brand-emerald-600 tracking-tight mb-1">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>

      {/* Label */}
      <div className="font-display font-semibold text-xs uppercase tracking-widest text-text-secondary">
        {label}
      </div>
    </div>
  );
}
