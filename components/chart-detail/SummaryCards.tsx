import { BarChart3, DollarSign, Activity, ArrowUp, ArrowDown } from 'lucide-react';
import type { QueryResult } from '@/types/builder';

interface SummaryCardsProps {
  data: QueryResult;
}

export function SummaryCards({ data }: SummaryCardsProps) {
  // Calculate statistics
  const columns = data.columns;
  const rows = data.rows as Record<string, unknown>[];
  
  // Find numeric columns (measures)
  const sampleRow = rows[0] || {};
  const measureCols = columns.filter((col: string) => typeof sampleRow[col] === 'number');
  const measureCol = measureCols[measureCols.length - 1] || columns[columns.length - 1];
  
  const values = rows.map(row => Number(row[measureCol]) || 0);
  const total = values.reduce((a, b) => a + b, 0);
  const avg = values.length > 0 ? total / values.length : 0;
  const max = values.length > 0 ? Math.max(...values) : 0;
  const min = values.length > 0 ? Math.min(...values) : 0;

  const cards = [
    {
      label: 'Total Records',
      value: rows.length.toLocaleString('id-ID'),
      icon: BarChart3,
      color: '#6b8e3d'
    },
    {
      label: 'Total Value',
      value: total.toLocaleString('id-ID'),
      icon: DollarSign,
      color: '#42a5f5'
    },
    {
      label: 'Rata-rata',
      value: Math.round(avg).toLocaleString('id-ID'),
      icon: Activity,
      color: '#7cb342'
    },
    {
      label: 'Nilai Maksimum',
      value: max.toLocaleString('id-ID'),
      icon: ArrowUp,
      color: '#4caf50'
    },
    {
      label: 'Nilai Minimum',
      value: min.toLocaleString('id-ID'),
      icon: ArrowDown,
      color: '#ff9800'
    }
  ];

  return (
    <section className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className="bg-white rounded-xl shadow-sm border border-[#e0e0e0] p-4 flex items-center gap-3"
          style={{ animationDelay: `${idx * 100}ms` }}
        >
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
            style={{ backgroundColor: `${card.color}15`, color: card.color }}
          >
            <card.icon size={20} />
          </div>
          <div>
            <div className="text-[10px] text-[#666] uppercase tracking-wide font-semibold">
              {card.label}
            </div>
            <div className="text-lg font-bold text-[#333]">
              {card.value}
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
