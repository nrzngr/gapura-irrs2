'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  fetchRootCauseStatsAi, 
  fetchRootCauseCategories,
  RootCauseStatsAi
} from '@/lib/services/gapura-ai';
import { 
  Zap, 
  Search, 
  AlertCircle, 
  Activity, 
  ShieldCheck
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip, 
} from 'recharts';

const COLORS = [
  'oklch(0.65 0.22 260)',
  'oklch(0.7 0.25 30)',
  'oklch(0.6 0.2 160)',
  'oklch(0.65 0.2 60)',
  'oklch(0.55 0.2 320)',
  'oklch(0.6 0.25 5)',
];

interface RootCauseCategory {
  name: string;
  description: string;
  keyword_count: number;
  severity_multiplier: number;
}

export function AiRootCauseInvestigation({ 
  title = "AI Root Cause Investigation",
  source
}: { 
  title?: string;
  source?: string;
}) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<RootCauseStatsAi | null>(null);
  const [categories, setCategories] = useState<Record<string, RootCauseCategory> | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        const [statsData, categoriesData] = await Promise.all([
          fetchRootCauseStatsAi(source),
          fetchRootCauseCategories()
        ]);
        setStats(statsData);
        setCategories(categoriesData);
        if (statsData && statsData.top_categories && statsData.top_categories.length > 0) {
          setActiveCategory(statsData.top_categories[0][0]);
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

  const chartData = useMemo(() => {
    if (!stats?.top_categories) return [];
    return stats.top_categories.map(([name, data]) => ({ 
      name, 
      value: typeof data === 'object' ? (data as any).count : data 
    }));
  }, [stats]);

  const activeCategoryData = useMemo(() => {
    if (!activeCategory || !stats?.by_category) return null;
    return stats.by_category[activeCategory];
  }, [activeCategory, stats]);

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

  if (error || !stats) {
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
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Records</p>
          <p className="text-2xl font-black text-slate-900">{stats.total_records}</p>
        </div>
        <div className="bg-white/60 backdrop-blur-xl p-4 rounded-2xl border border-white shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Classified</p>
          <p className="text-2xl font-black text-indigo-600">{stats.classified}</p>
        </div>
        <div className="bg-white/60 backdrop-blur-xl p-4 rounded-2xl border border-white shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Unknown</p>
          <p className="text-2xl font-black text-slate-900">{stats.unknown}</p>
        </div>
        <div className="bg-white/60 backdrop-blur-xl p-4 rounded-2xl border border-white shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Classification Rate</p>
          <p className="text-2xl font-black text-emerald-600">{stats.classification_rate}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel: Distribution */}
        <div className="lg:col-span-5 bg-white/80 backdrop-blur-2xl rounded-3xl border border-white p-6 shadow-xl shadow-slate-200/50 overflow-hidden relative">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Zap size={20} className="text-amber-500 fill-amber-500" />
              Root Cause Distribution
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
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Categories</span>
                <span className="text-xl font-black text-slate-900">{chartData.length}</span>
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
                  {activeCategoryData?.description || categories?.[activeCategory || '']?.description || "Analyzing behavioral patterns and operational friction points identified by AI logic engine."}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Top Areas */}
                  <div>
                    <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                      <Activity size={12} style={{ color: activeColor }} />
                      Critical Hotspots (Area)
                    </h5>
                    <div className="space-y-3">
                      {activeCategoryData && Object.entries(activeCategoryData.top_areas || {}).slice(0, 3).map(([area, val]) => (
                        <div key={area} className="group cursor-default">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-slate-200">{area}</span>
                            <span className="text-[10px] text-slate-500">{String(val)}</span>
                          </div>
                          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(Number(val) / activeCategoryData.count) * 100}%` }}
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
                      Impact Distribution (Airline)
                    </h5>
                    <div className="space-y-3">
                      {activeCategoryData && Object.entries(activeCategoryData.top_airlines || {}).slice(0, 3).map(([airline, val]) => (
                        <div key={airline} className="group cursor-default">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-slate-200">{airline}</span>
                            <span className="text-[10px] text-slate-500">{String(val)}</span>
                          </div>
                          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(Number(val) / activeCategoryData.count) * 100}%` }}
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

                {/* Issue Categories */}
                {activeCategoryData && Object.keys(activeCategoryData.top_issue_categories || {}).length > 0 && (
                  <div className="mt-8">
                    <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">
                      Top Issue Categories
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(activeCategoryData.top_issue_categories || {}).slice(0, 5).map(([issue, count]) => (
                        <span 
                          key={issue}
                          className="px-3 py-1.5 bg-white/10 rounded-full text-xs font-medium text-slate-200"
                        >
                          {issue || '(empty)'} ({count})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
