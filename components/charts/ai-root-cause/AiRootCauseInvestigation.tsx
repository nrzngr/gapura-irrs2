'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  fetchRootCauseStatsAi, 
  fetchRootCauseSummaryAi, 
  RootCauseStatsAi, 
  RootCauseSummary 
} from '@/lib/services/gapura-ai';
import { 
  Zap, 
  Search, 
  AlertCircle, 
  Activity, 
  ShieldCheck, 
  ArrowRight,
  List
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip, 
} from 'recharts';

const COLORS = [
  'oklch(0.65 0.22 260)', // Tech Blue
  'oklch(0.7 0.25 30)',   // Energetic Orange
  'oklch(0.6 0.2 160)',   // Success Green
  'oklch(0.65 0.2 60)',   // Warning Amber
  'oklch(0.55 0.2 320)',  // Deep Purple
  'oklch(0.6 0.25 5)',    // Urgent Red
];

export function AiRootCauseInvestigation({ 
  title = "AI Root Cause Investigation",
  source
}: { 
  title?: string;
  source?: string;
}) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<RootCauseStatsAi | null>(null);
  const [summary, setSummary] = useState<RootCauseSummary | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        const [statsData, summaryData] = await Promise.all([
          fetchRootCauseStatsAi(source),
          fetchRootCauseSummaryAi(source)
        ]);
        setStats(statsData);
        setSummary(summaryData);
        if (summaryData && summaryData.top_categories.length > 0) {
          setActiveCategory(summaryData.top_categories[0][0]);
        }
      } catch (err) {
        console.error('AI Root Cause Fetch Error:', err);
        setError('Failed to load AI intelligence data');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [source]);

  // --- STRICT FILTERING LOGIC ---
  const filteredData = useMemo(() => {
    if (!stats || !summary) return { stats: null, summary: null };

    const prefix = source === 'CGO' ? 'CGO' : 'NON CARGO';
    
    // 1. Filter Audit Trail Records & Summaries
    const newCategoryDistribution: RootCauseSummary['category_distribution'] = {};
    let totalFilteredRecords = 0;
    let totalWithRootCause = 0;
    const catCounts: Record<string, number> = {};

    Object.entries(summary.category_distribution).forEach(([cat, data]) => {
      const filteredRecords = data.records.filter(r => r.record_id.startsWith(prefix));
      if (filteredRecords.length > 0 || cat === "Unknown") {
        newCategoryDistribution[cat] = {
          ...data,
          records: filteredRecords,
          count: filteredRecords.length
        };
        totalFilteredRecords += filteredRecords.length;
        if (cat !== "Unknown") {
          totalWithRootCause += filteredRecords.length;
          catCounts[cat] = filteredRecords.length;
        }
      }
    });

    // 2. Build Filtered Summary
    const sortedCategories = Object.entries(catCounts)
      .sort((a, b) => b[1] - a[1]) as [string, number][];

    const filteredSummary: RootCauseSummary = {
      ...summary,
      total_records: totalFilteredRecords,
      with_root_cause: totalWithRootCause,
      without_root_cause: totalFilteredRecords - totalWithRootCause,
      root_cause_coverage: totalFilteredRecords > 0 ? `${((totalWithRootCause / totalFilteredRecords) * 100).toFixed(1)}%` : "0%",
      top_categories: sortedCategories,
      category_distribution: newCategoryDistribution
    };

    // 3. Build Filtered Stats
    const filteredStats: RootCauseStatsAi = {
      ...stats,
      total_records: totalFilteredRecords,
      classified: totalWithRootCause,
      unknown: totalFilteredRecords - totalWithRootCause,
      classification_rate: totalFilteredRecords > 0 ? ((totalWithRootCause / totalFilteredRecords) * 100).toFixed(1) : "0",
      top_categories: sortedCategories,
      by_category: { ...stats.by_category }
    };

    // Patch by_category counts
    Object.keys(filteredStats.by_category).forEach(cat => {
      if (catCounts[cat]) {
        filteredStats.by_category[cat].count = catCounts[cat];
      }
    });

    return { stats: filteredStats, summary: filteredSummary };
  }, [stats, summary, source]);

  const activeStats = filteredData.stats;
  const activeSummary = filteredData.summary;

  const chartData = useMemo(() => {
    if (!activeSummary) return [];
    return activeSummary.top_categories.map(([name, count]) => ({ name, value: count }));
  }, [activeSummary]);

  const activeCategoryData = useMemo(() => {
    if (!activeCategory || !activeStats?.by_category) return null;
    return activeStats.by_category[activeCategory];
  }, [activeCategory, activeStats]);

  const activeRecords = useMemo(() => {
    if (!activeCategory || !activeSummary?.category_distribution) return [];
    return activeSummary.category_distribution[activeCategory]?.records || [];
  }, [activeCategory, activeSummary]);

  const activeColor = useMemo(() => {
    if (!activeCategory || chartData.length === 0) return COLORS[0];
    const index = chartData.findIndex(d => d.name === activeCategory);
    return index !== -1 ? COLORS[index % COLORS.length] : COLORS[0];
  }, [activeCategory, chartData]);

  if (loading) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center space-y-4 bg-slate-50/50 rounded-3xl border border-dotted border-slate-300">
        <Activity className="animate-pulse text-indigo-500" size={32} />
        <p className="text-sm font-medium text-slate-500">Decrypting AI Intelligence...</p>
      </div>
    );
  }

  if (error || !activeSummary || !activeStats) {
    return (
      <div className="h-[200px] flex items-center justify-center text-slate-500 bg-red-50/50 rounded-3xl border border-red-100 italic">
        <AlertCircle className="mr-2" size={18} />
        Intelligence service temporarily offline.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stat Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/60 backdrop-blur-xl p-4 rounded-2xl border border-white shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Coverage</p>
          <p className="text-2xl font-black text-slate-900">{activeSummary.root_cause_coverage}</p>
        </div>
        <div className="bg-white/60 backdrop-blur-xl p-4 rounded-2xl border border-white shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Clarity</p>
          <p className="text-2xl font-black text-indigo-600">{activeStats.classification_rate}%</p>
        </div>
        <div className="bg-white/60 backdrop-blur-xl p-4 rounded-2xl border border-white shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Audit Log</p>
          <p className="text-2xl font-black text-slate-900">{activeSummary.total_records}</p>
        </div>
        <div className="bg-white/60 backdrop-blur-xl p-4 rounded-2xl border border-white shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Verified</p>
          <p className="text-2xl font-black text-emerald-600">{activeSummary.with_root_cause}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel: Distribution */}
        <div className="lg:col-span-5 bg-white/80 backdrop-blur-2xl rounded-3xl border border-white p-6 shadow-xl shadow-slate-200/50 overflow-hidden relative">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Zap size={20} className="text-amber-500 fill-amber-500" />
              Intelligence Distribution
            </h3>
          </div>

          <div className="h-[300px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  onClick={(data) => setActiveCategory(data.name)}
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                      className="cursor-pointer transition-all hover:opacity-80"
                      style={{ filter: activeCategory === entry.name ? 'drop-shadow(0 0 12px currentColor)' : 'none' }}
                    />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Classified</span>
                <span className="text-xl font-black text-slate-900">{activeStats.classified}</span>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {chartData.map((cat, idx) => (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(cat.name)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${
                  activeCategory === cat.name 
                    ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20' 
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Right Panel: Deep Dive */}
        <div className="lg:col-span-7 space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden ring-1 ring-white/10 shadow-2xl"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                <Search size={180} />
              </div>

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div 
                    className="p-2 rounded-xl transition-colors"
                    style={{ backgroundColor: `${activeColor}20` }}
                  >
                    <ShieldCheck style={{ color: activeColor }} size={20} />
                  </div>
                  <h4 className="text-2xl font-black tracking-tight text-white">{activeCategory}</h4>
                </div>

                <p className="text-slate-200 text-sm leading-relaxed mb-8 max-w-xl font-medium">
                  {activeCategoryData?.description || (
                    activeCategory === "Unknown" 
                      ? "Intelligence patterns currently undergoing classification. These cases represent complex or multi-faceted operational events requiring further data points for precise categorization."
                      : "Analyzing behavioral patterns and operational friction points identified by AI logic engine."
                  )}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Top Areas */}
                  <div>
                    <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                      <Activity size={12} style={{ color: activeColor }} />
                      Critical Hotspots (Area)
                    </h5>
                    <div className="space-y-3">
                      {activeCategoryData && Object.entries(activeCategoryData.top_areas).slice(0, 3).map(([area, val]) => (
                        <div key={area} className="group cursor-default">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-slate-200">{area}</span>
                            <span className="text-[10px] text-slate-500">{val}</span>
                          </div>
                          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(val / activeCategoryData.count) * 100}%` }}
                              transition={{ duration: 1, ease: 'easeOut' }}
                              className="h-full transition-colors"
                              style={{ backgroundColor: activeColor }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Airlines */}
                  <div>
                    <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                      <Activity size={12} style={{ color: activeColor }} />
                      Impact Dist (Airline)
                    </h5>
                    <div className="space-y-3">
                      {activeCategoryData && Object.entries(activeCategoryData.top_airlines).slice(0, 3).map(([airline, val]) => (
                        <div key={airline} className="group cursor-default">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-slate-200">{airline}</span>
                            <span className="text-[10px] text-slate-500">{val}</span>
                          </div>
                          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(val / activeCategoryData.count) * 100}%` }}
                              transition={{ duration: 1, ease: 'easeOut' }}
                              className="h-full transition-colors"
                              style={{ backgroundColor: activeColor }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Audit Trail */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white overflow-hidden shadow-xl shadow-slate-200/40">
            <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
              <h5 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <List size={14} className="text-indigo-500" />
                Intelligence Audit Trail
              </h5>
              <div className="flex items-center gap-2">
                 <span className="px-2 py-0.5 bg-indigo-100 text-[9px] font-black text-indigo-600 rounded-full tracking-tighter">
                    {activeRecords.length} VERIFIED
                 </span>
              </div>
            </div>
            <div className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
              <div className="divide-y divide-slate-100">
                {activeRecords.map((record, i) => (
                  <div key={i} className="p-4 hover:bg-slate-50/80 transition-colors group">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 bg-slate-100 text-[10px] font-black text-slate-600 rounded uppercase tracking-tighter">
                        {record.airline}
                      </span>
                      <span className="px-2 py-0.5 bg-indigo-50 text-[10px] font-black text-indigo-600 rounded uppercase tracking-tighter">
                        {record.branch}
                      </span>
                      <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowRight size={14} className="text-slate-300" />
                      </div>
                    </div>
                    <p className="text-xs text-slate-800 font-medium mb-1 line-clamp-2 leading-relaxed">
                      {record.report}
                    </p>
                    {record.root_cause && !['-', 'NIL', '#N/A', ''].includes(record.root_cause) && (
                      <div className="flex items-start gap-1 p-2 bg-amber-50/80 rounded-xl border border-amber-100/50 mt-2">
                        <ShieldCheck size={12} className="text-amber-600 mt-0.5 shrink-0" />
                        <p className="text-[10px] text-amber-900 font-semibold italic leading-relaxed">
                          {record.root_cause}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
                {activeRecords.length === 0 && (
                  <div className="p-12 text-center text-slate-400 text-xs italic">
                    No verified records in this intelligence pool.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
