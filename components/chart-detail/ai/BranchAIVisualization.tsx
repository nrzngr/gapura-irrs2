'use client';

import { useEffect, useState } from 'react';
import { 
  Shield, AlertTriangle, TrendingUp, TrendingDown, 
  Activity, MapPin, Building2, RefreshCw, CheckCircle, XCircle,
  ArrowUp, ArrowDown, Minus
} from 'lucide-react';
import { motion } from 'framer-motion';

const GAPURA_AI_BASE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://localhost:8000';

interface BranchRiskData {
  name: string;
  risk_score: number;
  risk_level: string;
  severity_distribution: Record<string, number>;
  issue_categories: string[];
  total_issues?: number;
  critical_high_count?: number;
}

interface BranchMetrics {
  name: string;
  total_reports: number;
  avg_resolution_days: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  top_categories: Record<string, number>;
  seasonality?: Record<string, number>;
}

interface BranchVisualizationProps {
  branchName?: string;
  filters?: Array<{
    field: string;
    value: string;
  }>;
}

export function BranchAIVisualization({ branchName, filters = [] }: BranchVisualizationProps) {
  const [riskData, setRiskData] = useState<BranchRiskData[] | null>(null);
  const [branchMetrics, setBranchMetrics] = useState<BranchMetrics | null>(null);
  const [rankingData, setRankingData] = useState<BranchRiskData[] | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<BranchRiskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'risk' | 'ranking' | 'metrics'>('risk');

  useEffect(() => {
    const fetchBranchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [riskRes, rankingRes] = await Promise.all([
          fetch(`${GAPURA_AI_BASE_URL}/api/ai/risk/branches`),
          fetch(`${GAPURA_AI_BASE_URL}/api/ai/branch/ranking?limit=10`)
        ]);

        let branches = [];
        if (riskRes.ok) {
          const riskJson = await riskRes.json();
          branches = riskJson.branches || riskJson;
          if (!Array.isArray(branches)) {
            branches = Object.entries(branches).map(([name, details]: [string, any]) => ({
              name,
              ...details
            }));
          }
        }

        let ranking = [];
        if (rankingRes.ok) {
          const rankingJson = await rankingRes.json();
          ranking = rankingJson.ranking || rankingJson.top_branches || rankingJson || [];
        }

        setRiskData(branches);
        setRankingData(ranking);

        if (branchName && branches.length > 0) {
          const matched = branches.find((b: BranchRiskData) => 
            b.name.toLowerCase() === branchName.toLowerCase() ||
            b.name.toLowerCase().includes(branchName.toLowerCase())
          );
          if (matched) setSelectedBranch(matched);
          
          try {
            const metricsRes = await fetch(`${GAPURA_AI_BASE_URL}/api/ai/branch/${encodeURIComponent(branchName)}`);
            if (metricsRes.ok) {
              const metrics = await metricsRes.json();
              setBranchMetrics(metrics);
            }
          } catch (e) {
            console.log('Could not fetch branch metrics:', e);
          }
        }
      } catch (err) {
        console.error('Error fetching branch data:', err);
        setError('Unable to load branch data');
      } finally {
        setLoading(false);
      }
    };

    fetchBranchData();
  }, [branchName]);

  const getRiskColor = (level: string) => {
    const l = level?.toLowerCase() || '';
    if (l.includes('critical')) return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' };
    if (l.includes('high')) return { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' };
    if (l.includes('medium')) return { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' };
    return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' };
  };

  const getRiskIcon = (level: string, score: number) => {
    const l = level?.toLowerCase() || '';
    if (l.includes('critical') || l.includes('high')) return <AlertTriangle className="w-4 h-4" />;
    if (score > 50) return <Activity className="w-4 h-4" />;
    return <Shield className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || (!riskData || riskData.length === 0)) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 text-amber-600">
          <AlertTriangle className="w-5 h-5" />
          <span className="text-sm font-medium">{error || 'No branch data available'}</span>
        </div>
      </div>
    );
  }

  const displayData = selectedBranch 
    ? [selectedBranch] 
    : riskData.slice(0, 8);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 bg-gradient-to-r from-emerald-50 to-white border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="text-sm font-bold text-emerald-900 uppercase tracking-wide">
                AI Risk Analysis — Branch
              </h3>
              <p className="text-xs text-gray-500">
                {selectedBranch 
                  ? `Analisis risiko untuk ${selectedBranch.name}`
                  : 'Branch risk profiling & performance ranking'
                }
              </p>
            </div>
          </div>
          
          {!selectedBranch && (
            <div className="flex gap-1 bg-white rounded-lg p-1 border border-gray-200">
              {(['risk', 'ranking', 'metrics'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    activeTab === tab 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-4">
        {activeTab === 'risk' && (
          <div className="space-y-3">
            {displayData.map((branch, idx) => {
              const colors = getRiskColor(branch.risk_level);
              return (
                <motion.div
                  key={branch.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    selectedBranch?.name === branch.name 
                      ? 'border-emerald-200 bg-emerald-50/50' 
                      : 'border-gray-100 hover:border-emerald-100 hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedBranch(
                    selectedBranch?.name === branch.name ? null : branch
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${colors.bg}`}>
                        <span className={colors.text}>
                          {getRiskIcon(branch.risk_level, branch.risk_score)}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">{branch.name}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                          {branch.risk_level || 'Unknown'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-gray-900">{branch.risk_score?.toFixed(1) || 'N/A'}</div>
                      <div className="text-[10px] text-gray-500 uppercase">Risk Score</div>
                    </div>
                  </div>

                  {selectedBranch?.name === branch.name && branch.severity_distribution && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3 pt-3 border-t border-emerald-100"
                    >
                      <div className="grid grid-cols-4 gap-2">
                        {Object.entries(branch.severity_distribution).map(([sev, count]) => (
                          <div 
                            key={sev}
                            className={`text-center p-2 rounded-lg ${
                              sev.toLowerCase() === 'critical' ? 'bg-red-100' :
                              sev.toLowerCase() === 'high' ? 'bg-orange-100' :
                              sev.toLowerCase() === 'medium' ? 'bg-yellow-100' :
                              'bg-green-100'
                            }`}
                          >
                            <div className="text-xs font-bold text-gray-700">{String(count)}</div>
                            <div className="text-[9px] text-gray-500 uppercase">{sev}</div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {activeTab === 'ranking' && rankingData && rankingData.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-gray-500 mb-3">Top 10 Branch Rankings by Risk</div>
            {rankingData.map((branch, idx) => {
              const colors = getRiskColor(branch.risk_level);
              const rank = idx + 1;
              return (
                <motion.div
                  key={branch.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    rank <= 3 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">{branch.name}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                        {branch.risk_level}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900">{branch.risk_score?.toFixed(1)}</div>
                    <div className="text-[9px] text-gray-500">score</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {activeTab === 'metrics' && branchMetrics && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-black text-gray-900">{branchMetrics.total_reports}</div>
                <div className="text-[10px] text-gray-500 uppercase">Total Reports</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-black text-gray-900">{branchMetrics.avg_resolution_days?.toFixed(1)}</div>
                <div className="text-[10px] text-gray-500 uppercase">Avg Resolution (Days)</div>
              </div>
            </div>
            
            <div>
              <div className="text-xs font-semibold text-gray-600 mb-2">Severity Breakdown</div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Critical', key: 'critical_count', color: 'bg-red-500' },
                  { label: 'High', key: 'high_count', color: 'bg-orange-500' },
                  { label: 'Medium', key: 'medium_count', color: 'bg-yellow-500' },
                  { label: 'Low', key: 'low_count', color: 'bg-green-500' }
                ].map(sev => (
                  <div key={sev.key} className="text-center">
                    <div className={`h-2 rounded-full ${sev.color} mb-1`} style={{ width: '100%' }}></div>
                    <div className="text-xs font-bold">{String(branchMetrics[sev.key as keyof BranchMetrics] || 0)}</div>
                    <div className="text-[9px] text-gray-500">{sev.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {branchMetrics.top_categories && Object.keys(branchMetrics.top_categories).length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-600 mb-2">Top Categories</div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(branchMetrics.top_categories).slice(0, 6).map(([cat, count]) => (
                    <span key={cat} className="text-[10px] bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                      {cat} ({count})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
