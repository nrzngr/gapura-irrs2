import { LayoutGrid, ArrowRight, ArrowDown } from 'lucide-react';
import { Normalization } from '@/components/chart-detail/GlobalControlBar';
import { cn } from '@/lib/utils';

// 5-Step Green Scale (WCAG Optimized) - Shared Constant
export interface HeatmapScaleStep {
  bg: string;
  text: string;
  min: number;
  label: string;
}

export const HEATMAP_SCALE: HeatmapScaleStep[] = [
  { bg: '#E8F5E9', text: '#374151', min: 0.00, label: 'Very Low' },  // 50
  { bg: '#C8E6C9', text: '#1B5E20', min: 0.15, label: 'Low' },       // 100
  { bg: '#81C784', text: '#1B5E20', min: 0.40, label: 'Medium' },    // 300
  { bg: '#43A047', text: '#FFFFFF', min: 0.60, label: 'High' },      // 600
  { bg: '#1B5E20', text: '#FFFFFF', min: 0.80, label: 'Very High' }  // 900
];

interface PivotHeaderProps {
  title?: string;
  totalRecords: number;
  normalization: Normalization;
  onNormalizationChange: (norm: Normalization) => void;
  compact?: boolean;
}

export function PivotHeader({ 
  title, 
  totalRecords, 
  normalization, 
  onNormalizationChange,
  compact 
}: PivotHeaderProps) {
  
  return (
    <div className={cn(
      "flex items-center justify-between bg-white/80 backdrop-blur-sm z-20 border-b border-gray-100",
      compact ? "px-3 py-2" : "px-5 py-3"
    )}>
      
      {/* Left: Title or Toggles if no title */}
      <div className="flex items-center gap-4">
        {title && (
           <h3 className="text-sm font-semibold text-gray-800 tracking-tight hidden sm:block">
             {title}
           </h3>
        )}
        
        {/* View Toggles */}
        <div className="flex items-center gap-1 bg-gray-50/80 p-0.5 rounded-lg border border-gray-200/50">
            {[
                { id: 'none', label: 'Values', icon: LayoutGrid },
                { id: 'row', label: 'Row %', icon: ArrowRight },
                { id: 'col', label: 'Col %', icon: ArrowDown },
            ].map(m => (
                <button
                    key={m.id}
                    onClick={() => onNormalizationChange(m.id as Normalization)}
                    className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium transition-all",
                        normalization === m.id 
                            ? "bg-white text-emerald-700 shadow-sm ring-1 ring-black/5 font-bold" 
                            : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                    )}
                    title={`View mode: ${m.label}`}
                >
                    <m.icon size={13} strokeWidth={2} className="opacity-80" />
                    <span className="hidden sm:inline">{m.label}</span>
                </button>
            ))}
        </div>
      </div>

      {/* Right: Legend & Total */}
      <div className="flex items-center gap-4">
           {/* Legend */}
           <div className="hidden md:flex items-center gap-2 pr-4 border-r border-gray-100">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Intensity</span>
              <div className="flex gap-0.5">
                  {HEATMAP_SCALE.map((step, i) => (
                      <div 
                          key={i} 
                          className="w-2.5 h-2.5 rounded-[2px] transition-transform hover:scale-125 hover:z-10 cursor-help" 
                          style={{ backgroundColor: step.bg }} 
                          title={`${step.label} (>${Math.round(step.min * 100)}%)`}
                      />
                  ))}
              </div>
           </div>
           
           {/* Total Cases Indicator */}
           <div className="flex items-center gap-2 text-xs font-medium text-gray-600 tabular-nums">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
               <span>{totalRecords.toLocaleString('id-ID')} <span className="text-gray-400 font-normal">Records</span></span>
           </div>
      </div>
    </div>
  );
}
