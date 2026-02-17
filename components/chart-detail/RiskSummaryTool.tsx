'use client';

import React from 'react';
import { 
  AlertTriangle, 
  TrendingUp, 
  ShieldAlert, 
  Activity, 
  Clock,
  ChevronRight,
  Plane,
  MapPin,
  Building2
} from 'lucide-react';
import { RiskSummaryResponse } from '@/lib/api/risk';
import { motion } from 'framer-motion';

interface RiskSummaryToolProps {
  data: RiskSummaryResponse;
}

const RiskCard = ({ 
  title, 
  icon: Icon, 
  risks, 
  total,
  colorClass 
}: { 
  title: string; 
  icon: any; 
  risks: Record<string, number>; 
  total: number;
  colorClass: string;
}) => (
  <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10`}>
          <Icon size={18} className={colorClass.replace('bg-', 'text-')} />
        </div>
        <h4 className="font-bold text-gray-800 text-sm">{title}</h4>
      </div>
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total: {total}</span>
    </div>

    <div className="space-y-2">
      {Object.entries(risks).map(([level, count]) => {
        const percentage = total > 0 ? (count / total) * 100 : 0;
        const levelColor = 
          level === 'Critical' ? 'bg-red-500' :
          level === 'High' ? 'bg-orange-500' :
          level === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500';

        return (
          <div key={level} className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="font-semibold text-gray-600">{level}</span>
              <span className="text-gray-400">{count} ({percentage.toFixed(0)}%)</span>
            </div>
            <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                className={`h-full ${levelColor} rounded-full`}
              />
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

export const RiskSummaryTool: React.FC<RiskSummaryToolProps> = ({ data }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <ShieldAlert className="text-red-500" />
            Operational Risk Summary
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            AI-generated risk assessment based on historical irregularity and complaint patterns.
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded-md">
            <Clock size={12} />
            Updated: {new Date(data.last_updated).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <RiskCard 
          title="Airline Risks" 
          icon={Plane} 
          risks={data.airline_risks} 
          total={data.total_airlines}
          colorClass="bg-blue-500"
        />
        <RiskCard 
          title="Branch Risks" 
          icon={MapPin} 
          risks={data.branch_risks} 
          total={data.total_branches}
          colorClass="bg-indigo-500"
        />
        <RiskCard 
          title="Hub Risks" 
          icon={Building2} 
          risks={data.hub_risks} 
          total={data.total_hubs}
          colorClass="bg-purple-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Risky Airlines */}
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="text-amber-500" size={18} />
            <h4 className="font-black text-gray-800 text-sm tracking-tight uppercase">Top Risky Airlines</h4>
          </div>
          <div className="space-y-2">
            {data.top_risky_airlines.map((airline, idx) => (
              <div key={airline} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 shadow-sm hover:border-amber-200 transition-colors group">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-amber-500 bg-amber-50 w-6 h-6 rounded flex items-center justify-center">{idx + 1}</span>
                  <span className="text-sm font-bold text-gray-700">{airline}</span>
                </div>
                <ChevronRight size={14} className="text-gray-300 group-hover:translate-x-1 transition-transform" />
              </div>
            ))}
          </div>
        </div>

        {/* Top Risky Branches */}
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="text-red-500" size={18} />
            <h4 className="font-black text-gray-800 text-sm tracking-tight uppercase">Top Risky Branches</h4>
          </div>
          <div className="space-y-2">
            {data.top_risky_branches.map((branch, idx) => (
              <div key={branch} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 shadow-sm hover:border-red-200 transition-colors group">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-red-500 bg-red-50 w-6 h-6 rounded flex items-center justify-center">{idx + 1}</span>
                  <span className="text-sm font-bold text-gray-700">{branch}</span>
                </div>
                <ChevronRight size={14} className="text-gray-300 group-hover:translate-x-1 transition-transform" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3 items-start">
        <Activity className="text-blue-500 shrink-0 mt-0.5" size={18} />
        <div>
          <h5 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-1">System Insight</h5>
          <p className="text-sm text-blue-700 leading-relaxed">
            Concentration of <strong>Critical</strong> risks is highest in <strong>{data.top_risky_branches[0]}</strong>. 
            Prioritization of safety audits and operational reviews is recommended for the top 5 risky entities listed above.
          </p>
        </div>
      </div>
    </div>
  );
};
