import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
    label: string;
    value: string | number;
    icon: LucideIcon;
    description?: string;
    color?: 'blue' | 'green' | 'orange' | 'red' | 'purple';
}

const colorConfig = {
    blue: {
        gradient: 'from-blue-500 to-blue-600',
        light: 'bg-blue-50',
        text: 'text-blue-600',
        border: 'border-blue-100',
    },
    green: {
        gradient: 'from-emerald-500 to-emerald-600',
        light: 'bg-emerald-50',
        text: 'text-emerald-600',
        border: 'border-emerald-100',
    },
    orange: {
        gradient: 'from-amber-500 to-orange-500',
        light: 'bg-amber-50',
        text: 'text-amber-600',
        border: 'border-amber-100',
    },
    red: {
        gradient: 'from-red-500 to-rose-500',
        light: 'bg-red-50',
        text: 'text-red-600',
        border: 'border-red-100',
    },
    purple: {
        gradient: 'from-purple-500 to-violet-500',
        light: 'bg-purple-50',
        text: 'text-purple-600',
        border: 'border-purple-100',
    },
};

export default function StatsCard({ label, value, icon: Icon, description, color = 'blue' }: StatsCardProps) {
    const colors = colorConfig[color];

    return (
        <div className={`relative overflow-hidden bg-white rounded-2xl border ${colors.border} shadow-sm hover:shadow-lg transition-all duration-300 group`}>
            {/* Gradient Accent */}
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colors.gradient} opacity-10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500`} />

            <div className="relative p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-500 mb-2">{label}</p>
                        <h3 className="text-4xl font-bold text-slate-900 tracking-tight">{value}</h3>
                        {description && (
                            <p className="text-xs text-slate-400 mt-2">{description}</p>
                        )}
                    </div>
                    <div className={`p-4 rounded-2xl bg-gradient-to-br ${colors.gradient} shadow-lg`}>
                        <Icon size={24} className="text-white" />
                    </div>
                </div>
            </div>
        </div>
    );
}
