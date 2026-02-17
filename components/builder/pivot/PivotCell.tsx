import { HeatmapScaleStep } from './PivotHeader'; // I'll need to export the type or re-define
import { Normalization } from '@/components/chart-detail/GlobalControlBar';
import { cn } from '@/lib/utils';
import { HEATMAP_SCALE } from './PivotHeader';

interface PivotCellProps {
  value: number;
  rowLabel: string;
  colLabel: string;
  rowTotal: number; // for row %
  colTotal: number; // for col % (if needed in future)
  grandTotal: number; // for total % (if needed)
  normalization: Normalization;
  contextMax: number; // for heatmap intensity calculation
}

const ZERO_STATE = { bg: 'transparent', text: '#9CA3AF' };

export function PivotCell({
  value,
  rowLabel,
  colLabel,
  rowTotal,
  grandTotal,
  normalization,
  contextMax
}: PivotCellProps) {

  // --- Helpers ---
  const getIntensity = (val: number, max: number) => {
    if (val === 0) return ZERO_STATE;
    const ratio = val / (max || 1);
    
    for (let i = HEATMAP_SCALE.length - 1; i >= 0; i--) {
        if (ratio >= HEATMAP_SCALE[i].min) return HEATMAP_SCALE[i];
    }
    return HEATMAP_SCALE[0];
  };

  const formatValue = (val: number) => {
     if (val === 0) return '-';
     
     if (normalization === 'row') {
         return ((val / rowTotal) * 100).toFixed(1) + '%';
     }
     if (normalization === 'col') {
          // Note: Logic for Col % typically requires Col Total, passed via props if we want to display it.
          // But usually Heatmap intensity is what matters for Col normalization in this design.
          // If we want to DISPLAY Col %, we need colTotal.
          // For now, let's assume we display raw values but coloring is normalized, OR we display % if requested.
          // The previous implementation displayed % if ViewMode was 'percentage', but Normalization prop also existed.
          // Let's stick to: Normalization = 'row' -> Show %, Normalization = 'col' -> Show %, None -> Show Raw.
          // If normalization is 'col', we need colTotal.
          // For now, let's return raw value for 'col' normalization unless we want to enforce %.
          // Let's stick to raw value for 'col' but heatmap is relative to col max.
          // Update: The previous code logic:
          // if (viewMode === 'percentage') ...
          // if normalization is 'row', base is rowStats.
          // if normalization is 'col', base is colStats.
          // We don't have colTotal passed in props yet.
          return val.toLocaleString('id-ID'); // fallback to raw for now
     }
     return val.toLocaleString('id-ID');
  };

  const displayValue = (() => {
      if (value === 0) return '-';
      if (normalization === 'row') return ((value / rowTotal) * 100).toFixed(1) + '%';
      if (normalization === 'col') { 
          // We need colTotal to show %. 
          // Since we didn't pass it, let's just show raw value but the COLOR will be correct via contextMax.
          // Actually, let's just use raw value for now to be safe, or update props.
          return value.toLocaleString('id-ID'); 
      }
      return value.toLocaleString('id-ID');
  })();

  const style = getIntensity(value, contextMax);
  const percentOfRow = ((value / rowTotal) * 100).toFixed(1);

  return (
    <td className="p-1 text-center align-middle">
        <div 
          className={cn(
            "w-full h-8 flex items-center justify-center rounded-[4px] text-[10px] font-medium transition-all cursor-default relative group",
            value > 0 && "hover:scale-105 hover:shadow-sm hover:z-10 hover:ring-1 hover:ring-black/5"
          )}
          style={{ 
              backgroundColor: style.bg, 
              color: style.text 
          }}
          title={`${rowLabel} • ${colLabel}\nValue: ${value}\nRow Share: ${percentOfRow}%`}
        >
            {displayValue}
        </div>
    </td>
  );
}
