'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ComparisonMetric } from '@/types';
import { cn } from '@/lib/utils';

interface ComparisonTableProps {
    metrics: ComparisonMetric[];
    title?: string;
    className?: string;
}

const DeltaBadge = ({ value, diff, label, isNA }: { value: number; diff: number; label: string; isNA?: boolean }) => {
    const isPositive = value > 0;
    const isZero = value === 0;

    return (
        <div className="flex flex-col items-end gap-0.5">
            <span className="text-[9px] text-[var(--text-muted)] uppercase font-bold tracking-tight">{label}</span>
            <div className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-all",
                isNA ? "bg-[var(--surface-3)] text-[var(--text-muted)]" :
                isZero ? "bg-[var(--surface-3)] text-[var(--text-muted)]" :
                isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
            )}>
                {isNA ? <Minus size={10} /> : isZero ? <Minus size={10} /> : isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {isNA ? 'N/A' : `${Math.abs(value).toFixed(1)}% (${diff > 0 ? '+' : ''}${diff})`}
            </div>
        </div>
    );
};

export const ComparisonTable: React.FC<ComparisonTableProps> = ({ metrics, title, className }) => {
    if (!metrics || metrics.length === 0) return null;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("bg-[var(--surface-1)] rounded-2xl border border-[var(--surface-3)] overflow-hidden shadow-sm", className)}
        >
            {title && (
                <div className="px-4 py-3 border-b border-[var(--surface-3)] bg-[var(--surface-2)]/50">
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-[var(--text-secondary)]">{title}</h4>
                </div>
            )}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-[var(--surface-2)]/30">
                            <th className="px-4 py-2.5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Item</th>
                            <th className="px-4 py-2.5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">Current</th>
                            <th className="px-4 py-2.5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">Previous</th>
                            <th className="px-4 py-2.5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider text-right" title="MoM = vs bulan lalu • YoY = vs bulan yang sama tahun lalu">
                                MoM Δ / YoY Δ
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--surface-3)]">
                        {metrics.map((metric, idx) => (
                            <tr key={metric.label + idx} className="hover:bg-[var(--surface-2)]/50 transition-colors group">
                                <td className="px-4 py-3">
                                    <span className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors">
                                        {metric.label}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <span className="text-sm font-mono font-bold text-[var(--text-primary)]">
                                        {metric.current.toLocaleString()}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex flex-col items-end">
                                        <span className="text-xs font-mono font-medium text-[var(--text-secondary)]">
                                            {metric.previous.toLocaleString()}
                                        </span>
                                        {metric.yoyPrevious !== undefined && (
                                            <span className="text-[9px] text-[var(--text-muted)] font-bold">
                                                LY: {metric.yoyPrevious.toLocaleString()}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center justify-end gap-3">
                                        <DeltaBadge value={metric.momDelta} diff={metric.current - metric.previous} label="MoM" isNA={metric.previous === 0} />
                                        <DeltaBadge value={metric.yoyDelta ?? 0} diff={metric.current - (metric.yoyPrevious ?? 0)} label="YoY" isNA={metric.yoyPrevious === 0 || metric.yoyPrevious === undefined} />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="px-4 py-2 bg-[var(--surface-1)] text-[10px] text-[var(--text-muted)]">
                    MoM membandingkan dengan bulan sebelumnya; YoY membandingkan dengan bulan yang sama tahun lalu. Angka di dalam kurung menunjukkan selisih absolut.
                </div>
            </div>
        </motion.div>
    );
};
