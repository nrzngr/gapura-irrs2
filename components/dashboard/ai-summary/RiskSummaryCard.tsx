"use client";

import { AlertTriangle, Building2, Plane, MapPin, TrendingUp, Shield, Activity, Info } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { RiskSummaryData } from "./types";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

interface RiskSummaryCardProps {
  data: RiskSummaryData | null;
  loading?: boolean;
  error?: string | null;
  className?: string;
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-200/80 bg-white/50 p-3 animate-pulse">
      <div className="h-3 w-16 bg-gray-200 rounded mb-2" />
      <div className="h-6 w-12 bg-gray-200 rounded" />
    </div>
  );
}

function RiskMeter({ value, max, label }: { value: number; max: number; label: string }) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const color = percentage > 70 ? "from-red-500 to-orange-500" : percentage > 40 ? "from-amber-500 to-yellow-500" : "from-emerald-500 to-teal-500";
  
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-gray-500 uppercase">{label}</span>
        <span className="text-xs font-bold text-gray-700">{value}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className={cn("h-full rounded-full bg-gradient-to-r", color)}
        />
      </div>
    </div>
  );
}

export function RiskSummaryCard({
  data,
  loading,
  error,
  className,
}: RiskSummaryCardProps) {
  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center gap-2">
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("rounded-xl border border-red-200 bg-red-50 p-4 text-center", className)}>
        <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="text-sm text-red-600 font-medium">{error}</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // Calculate totals from severity distributions
  const criticalRisks =
    (data.airline_risks?.Critical || 0) +
    (data.branch_risks?.Critical || 0) +
    (data.hub_risks?.Critical || 0);
  const highRisks =
    (data.airline_risks?.High || 0) +
    (data.branch_risks?.High || 0) +
    (data.hub_risks?.High || 0);
  const mediumRisks =
    (data.airline_risks?.Medium || 0) +
    (data.branch_risks?.Medium || 0) +
    (data.hub_risks?.Medium || 0);
  const lowRisks =
    (data.airline_risks?.Low || 0) +
    (data.branch_risks?.Low || 0) +
    (data.hub_risks?.Low || 0);
  const maxSeverity = Math.max(criticalRisks, highRisks, mediumRisks, lowRisks);
  const entitiesTotal = (data.total_airlines || 0) + (data.total_branches || 0) + (data.total_hubs || 0);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-800">Risk Intelligence</h3>
            <div className="flex items-center gap-1">
              <p className="text-[10px] text-gray-500">Cross-domain risk analysis</p>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      aria-label="Risk Intelligence explanation"
                      className="ml-1 inline-flex items-center justify-center rounded-full w-4 h-4 bg-gray-100 text-gray-500 hover:bg-gray-200"
                    >
                      <Info className="w-3 h-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
                    <p>Hitung per entitas (Maskapai/Cabang/Hub) yang masuk ke tiap level risiko.</p>
                    <p className="mt-1">Angka di kartu = jumlah entitas, bukan jumlah laporan.</p>
                    <p className="mt-1">Baris tanpa nama masuk “Unknown”; penulisan nama berbeda bisa dihitung terpisah.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black uppercase tracking-wider">Per Entitas</span>
          <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-[10px] font-bold">{entitiesTotal} Entitas</span>
        </div>
        {data.last_updated && (
          <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
            Updated: {new Date(data.last_updated).toLocaleDateString("id-ID")}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-gray-500 uppercase">Entitas per level risiko</p>
        <div className="flex flex-wrap gap-2">
          <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-semibold flex items-center gap-1">
            <Plane className="w-3 h-3" />
            {data.total_airlines || 0} Airlines
          </span>
          <span className="px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 text-[10px] font-semibold flex items-center gap-1">
            <Building2 className="w-3 h-3" />
            {data.total_branches || 0} Branches
          </span>
          <span className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 text-[10px] font-semibold flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {data.total_hubs || 0} Hubs
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-3 rounded-xl bg-gradient-to-br from-red-50 to-rose-50 border border-red-100 text-center"
        >
          <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center mx-auto mb-1.5">
            <AlertTriangle className="w-3 h-3 text-white" />
          </div>
          <p className="text-lg font-black text-red-700">{criticalRisks}</p>
          <p className="text-[9px] font-bold text-red-500 uppercase">Critical</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="p-3 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 text-center"
        >
          <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center mx-auto mb-1.5">
            <TrendingUp className="w-3 h-3 text-white" />
          </div>
          <p className="text-lg font-black text-orange-700">{highRisks}</p>
          <p className="text-[9px] font-bold text-orange-500 uppercase">High</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-3 rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-100 text-center"
        >
          <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center mx-auto mb-1.5">
            <Activity className="w-3 h-3 text-white" />
          </div>
          <p className="text-lg font-black text-amber-700">{mediumRisks}</p>
          <p className="text-[9px] font-bold text-amber-500 uppercase">Medium</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 text-center"
        >
          <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-1.5">
            <Shield className="w-3 h-3 text-white" />
          </div>
          <p className="text-lg font-black text-emerald-700">{lowRisks}</p>
          <p className="text-[9px] font-bold text-emerald-500 uppercase">Low</p>
        </motion.div>
      </div>

      <div className="space-y-3 p-3 rounded-xl bg-gray-50/50 border border-gray-100">
        <RiskMeter value={criticalRisks} max={maxSeverity} label="Critical" />
        <RiskMeter value={highRisks} max={maxSeverity} label="High" />
        <RiskMeter value={mediumRisks} max={maxSeverity} label="Medium" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {data.top_risky_airlines && data.top_risky_airlines.length > 0 && (
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50/50 to-cyan-50/50 border border-blue-100/50">
            <p className="text-[10px] font-bold text-blue-600 uppercase mb-2 flex items-center gap-1">
              <Plane className="w-3 h-3" /> Top Risk Airlines
            </p>
            <div className="space-y-1.5">
              {data.top_risky_airlines.slice(0, 3).map((airline, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className={cn(
                    "w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center",
                    i === 0 ? "bg-red-100 text-red-600" :
                    i === 1 ? "bg-orange-100 text-orange-600" :
                    "bg-amber-100 text-amber-600"
                  )}>
                    {i + 1}
                  </span>
                  <span className="text-xs text-gray-700 truncate">{airline}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.top_risky_branches && data.top_risky_branches.length > 0 && (
          <div className="p-3 rounded-xl bg-gradient-to-br from-violet-50/50 to-purple-50/50 border border-violet-100/50">
            <p className="text-[10px] font-bold text-violet-600 uppercase mb-2 flex items-center gap-1">
              <Building2 className="w-3 h-3" /> Top Risk Branches
            </p>
            <div className="space-y-1.5">
              {data.top_risky_branches.slice(0, 3).map((branch, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className={cn(
                    "w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center",
                    i === 0 ? "bg-red-100 text-red-600" :
                    i === 1 ? "bg-orange-100 text-orange-600" :
                    "bg-amber-100 text-amber-600"
                  )}>
                    {i + 1}
                  </span>
                  <span className="text-xs text-gray-700 truncate">{branch}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
