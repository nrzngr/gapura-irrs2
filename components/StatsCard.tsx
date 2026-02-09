import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
    label: string;
    value: string | number;
    icon: LucideIcon;
    description?: string;
    color?: 'blue' | 'green' | 'orange' | 'red' | 'purple';
    accent?: boolean;
    onClick?: () => void;
}

// Clean, professional color config
const colorConfig = {
    blue: {
        iconBg: 'bg-blue-50',
        iconColor: 'text-blue-600',
        descColor: 'text-blue-600',
    },
    green: {
        iconBg: 'bg-emerald-50',
        iconColor: 'text-emerald-600',
        descColor: 'text-emerald-600',
    },
    orange: {
        iconBg: 'bg-amber-50',
        iconColor: 'text-amber-600',
        descColor: 'text-amber-600',
    },
    red: {
        iconBg: 'bg-red-50',
        iconColor: 'text-red-600',
        descColor: 'text-red-600',
    },
    purple: {
        iconBg: 'bg-violet-50',
        iconColor: 'text-violet-600',
        descColor: 'text-violet-600',
    },
};

/**
 * StatsCard — Clean enterprise stats card.
 * Complexity: Time O(1) | Space O(1)
 */
export default function StatsCard({
    label,
    value,
    icon: Icon,
    description,
    color = 'blue',
    accent = false,
    onClick,
}: StatsCardProps) {
    const colors = colorConfig[color];
    const Wrapper = onClick ? 'button' : 'div';
    const clickProps = onClick ? { onClick, type: 'button' as const } : {};

    // Accent variant (filled background)
    if (accent) {
        return (
            <Wrapper {...clickProps} className={cn("bg-blue-600 rounded-xl p-5 text-white shadow-lg shadow-blue-600/20 text-left w-full", onClick && "cursor-pointer hover:bg-blue-700 transition-colors")}>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-blue-100 text-sm font-medium">{label}</p>
                        <h3 className="text-3xl font-bold mt-1">{value}</h3>
                        {description && (
                            <p className="text-blue-200 text-xs mt-1">{description}</p>
                        )}
                    </div>
                    <div className="p-3 bg-white/20 rounded-xl">
                        <Icon size={24} />
                    </div>
                </div>
            </Wrapper>
        );
    }

    // Default white card
    return (
        <Wrapper {...clickProps} className={cn("bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow text-left w-full", onClick && "cursor-pointer")}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-slate-500 text-sm font-medium">{label}</p>
                    <h3 className="text-3xl font-bold text-slate-900 mt-1">{value}</h3>
                    {description && (
                        <p className={cn("text-xs mt-1 font-medium", colors.descColor)}>
                            {description}
                        </p>
                    )}
                </div>
                <div className={cn("p-3 rounded-xl", colors.iconBg)}>
                    <Icon size={24} className={colors.iconColor} />
                </div>
            </div>
        </Wrapper>
    );
}
