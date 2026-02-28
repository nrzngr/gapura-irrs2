'use client';

import { useEffect, useMemo, useState } from 'react';
import { Brain, AlertTriangle, RefreshCw, TrendingUp, CheckCircle2, Target, Lightbulb, Loader2, AlertCircle, X, ChevronLeft, ChevronRight, Calendar, MapPin, Plane, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

type AnalysisItem = {
  originalData: any;
  prediction?: { predictedDays?: number };
  classification?: { severity?: string; category?: string };
};

type AnalyzeAllResponse = {
  summary?: {
    severityDistribution?: Record<string, number>;
    predictionStats?: { min: number; max: number; mean: number };
    top_categories?: Record<string, number>;
  };
  results: AnalysisItem[];
};

type RootCauseStats = {
  by_category: Record<string, { count: number; percentage: number; description?: string }>;
};

const severityWeight: Record<string, number> = { Critical: 100, High: 75, Medium: 50, Low: 25 };
const sevStyle: Record<string, string> = {
  Critical: 'bg-red-100 text-red-700 border-red-200',
  High: 'bg-orange-100 text-orange-700 border-orange-200',
  Medium: 'bg-amber-100 text-amber-700 border-amber-200',
  Low: 'bg-green-100 text-green-700 border-green-200',
};

const recommendActions = (category?: string, severity?: string): string[] => {
  const sev = (severity || '').toLowerCase();
  const cat = (category || '').toLowerCase();
  const common = ['Koordinasi lintas unit untuk service recovery', 'Buat ticket dan pantau progres penyelesaian'];
  const byCat: Record<string, string[]> = {
    baggage: ['Audit proses baggage handling', 'Tambahkan pengecekan double-tag dan rute bagasi'],
    document: ['Perkuat verifikasi dokumen', 'Sosialisasi ulang SOP ke frontliner'],
    gse: ['Periksa readiness & maintenance GSE', 'Siapkan unit cadangan saat peak time'],
    boarding: ['Optimalkan antrian boarding', 'Penambahan personel sesuai beban'],
  };
  const matched = Object.entries(byCat).find(([k]) => cat.includes(k))?.[1] || ['Lakukan RCA cepat dan tindakan korektif'];
  const sevExtra = (sev.includes('critical') || sev.includes('high')) ? ['Eskalasi ke supervisor/manager', 'Prioritaskan service recovery'] : ['Monitoring dampak dan dokumentasi pembelajaran'];
  return [...matched, ...sevExtra, ...common];
};

export default function OSAIReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<AnalyzeAllResponse | null>(null);
  const [rootStats, setRootStats] = useState<RootCauseStats | null>(null);
  const [detail, setDetail] = useState<{ index: number; open: boolean } | null>(null);
  const [showFullDesc, setShowFullDesc] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [resA, resB] = await Promise.all([
        fetch('/api/ai/analyze-all?exclude_closed=true'),
        fetch('/api/ai/root-cause/stats'),
      ]);
      const jsonA = resA.ok ? await resA.json() : null;
      const jsonB = resB.ok ? await resB.json() : null;
      if (!resA.ok) {
        const msg = jsonA?.error || `Gagal memuat data AI (${resA.status})`;
        throw new Error(msg);
      }
      setData(jsonA);
      setRootStats(jsonB);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat data AI');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const distribution = useMemo(() => data?.summary?.severityDistribution || {}, [data]);
  const prioritized = useMemo(() => {
    const rows = data?.results || [];
    return rows
      .map((r) => {
        const sev = r.classification?.severity || 'Low';
        const days = r.prediction?.predictedDays ?? 0;
        const score = (severityWeight[sev] || 25) + Math.min(50, days * 5);
        return { item: r, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [data]);
  const topPatterns = useMemo(() => {
    const bc = rootStats?.by_category || {};
    return Object.entries(bc).sort((a, b) => b[1].count - a[1].count).slice(0, 6);
  }, [rootStats]);

  const current = (() => {
    if (!detail || !detail.open) return null;
    return prioritized[detail.index]?.item || null;
  })();

  const nav = (dir: -1 | 1) => {
    if (!detail) return;
    const next = detail.index + dir;
    if (next < 0 || next >= prioritized.length) return;
    setDetail({ index: next, open: true });
    setShowFullDesc(false);
  };

  useEffect(() => {
    if (!detail?.open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') nav(-1);
      if (e.key === 'ArrowRight') nav(1);
      if (e.key === 'Escape') setDetail(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [detail?.open, nav]);

  return (
    <div className="min-h-screen px-4 md:px-6 py-6 bg-gray-50">
      <section className="relative overflow-hidden bg-white rounded-3xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-200">
              <Brain className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-800">AI Reports · Divisi OS</h1>
              <p className="text-xs text-gray-500">Analisis data otomatis: prioritas, pola risiko, dan rekomendasi</p>
            </div>
          </div>
          <button
            onClick={fetchAll}
            disabled={loading}
            className={cn('inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border', 'border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50')}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Muat Ulang
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="p-5 rounded-2xl border border-gray-200 bg-white">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  <h2 className="text-base font-bold text-gray-800">Insight Severity Risk</h2>
                </div>
                <div className="space-y-3">
                  {Object.entries(distribution).map(([sev, count]) => {
                    const total = Object.values(distribution).reduce((a, b) => a + b, 0) || 1;
                    const pct = Math.round((count / total) * 100);
                    return (
                      <div key={sev} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold">{sev}</span>
                          <span className="text-gray-500">{count} • {pct}%</span>
                        </div>
                        <div className="h-2 rounded bg-gray-100 overflow-hidden">
                          <div className={cn('h-full rounded', sev === 'Critical' ? 'bg-red-500' : sev === 'High' ? 'bg-orange-500' : sev === 'Medium' ? 'bg-amber-500' : 'bg-green-500')} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="p-5 rounded-2xl border border-gray-200 bg-white">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-base font-bold text-gray-800">Prioritas Kasus</h2>
                </div>
                <div className="space-y-3">
                  {prioritized.map(({ item }, idx) => {
                    const sev = item.classification?.severity || 'Low';
                    const days = item.prediction?.predictedDays ?? 0;
                    return (
                      <div
                        key={idx}
                        className="flex items-start gap-4 p-4 rounded-xl border border-gray-200 bg-white cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => setDetail({ index: idx, open: true })}
                      >
                        <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center font-bold text-emerald-700">{idx + 1}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-bold border', sevStyle[sev] || sevStyle.Low)}>{sev}</span>
                            {days ? <span className="text-xs text-gray-600">Prediksi penyelesaian ~ {days.toFixed(1)} hari</span> : <span className="text-xs text-gray-400">Tanpa prediksi waktu</span>}
                          </div>
                          <p className="mt-1 text-sm font-semibold text-gray-800 truncate" title={item.originalData?.Report || item.originalData?.report || ''}>
                            {item.originalData?.Report || item.originalData?.report || item.originalData?.issueType || 'Deskripsi tidak tersedia'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {item.originalData?.Airlines || item.originalData?.airlines || 'Maskapai -'} • {item.originalData?.Route || item.originalData?.route || '-'}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {recommendActions(item.classification?.category, sev).slice(0, 3).map((rec, i) => (
                              <span key={i} className="text-[11px] font-medium px-2 py-1 rounded-md bg-gray-50 border border-gray-200 text-gray-700">{rec}</span>
                            ))}
                          </div>
                        </div>
                        <div className="hidden sm:flex flex-col items-end gap-1">
                          <TrendingUp className="w-4 h-4 text-emerald-600" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="p-5 rounded-2xl border border-gray-200 bg-white">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  <h2 className="text-base font-bold text-gray-800">Rekomendasi Tindakan</h2>
                </div>
                <div className="space-y-3">
                  {prioritized.slice(0, 5).map(({ item }, idx) => {
                    const sev = item.classification?.severity || 'Low';
                    const list = recommendActions(item.classification?.category, sev).slice(0, 4);
                    return (
                      <div key={idx} className="p-3 rounded-xl border border-gray-200 bg-white">
                        <div className="flex items-center gap-2 mb-2">
                          <Lightbulb className="w-4 h-4 text-amber-600" />
                          <span className="text-xs font-semibold text-gray-700 truncate">{item.classification?.category || 'Umum'}</span>
                        </div>
                        <ul className="list-disc pl-4 space-y-1">
                          {list.map((r, i) => (
                            <li key={i} className="text-xs text-gray-700">{r}</li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="p-5 rounded-2xl border border-gray-200 bg-white">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-5 h-5 text-purple-600" />
                  <h2 className="text-base font-bold text-gray-800">Pola Risiko Tinggi</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {topPatterns.map(([cat, info], idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-gray-200 bg-white">
                      <p className="text-sm font-bold text-gray-800">{cat || 'Tidak terklasifikasi'}</p>
                      <p className="text-xs text-gray-500">{info.count} kasus • {info.percentage}%</p>
                      {info.description ? <p className="text-xs text-gray-600 mt-1 line-clamp-3">{info.description}</p> : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        <Sheet open={Boolean(detail?.open)} onOpenChange={(open) => setDetail(detail ? { index: detail.index, open } : null)}>
          <SheetContent className="w-full sm:max-w-2xl md:max-w-3xl p-0 bg-white">
            <SheetHeader>
              <SheetTitle className="sr-only">Detail Laporan</SheetTitle>
            </SheetHeader>
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 md:px-6 py-3 border-b bg-white">
              <div className="flex items-center gap-2">
                <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-bold border', sevStyle[current?.classification?.severity || 'Low'])}>
                  {current?.classification?.severity || 'Low'}
                </span>
                {typeof current?.prediction?.predictedDays === 'number' ? (
                  <span className="text-xs text-gray-600">Prediksi ~ {current?.prediction?.predictedDays?.toFixed(1)} hari</span>
                ) : null}
                <span className="ml-3 text-sm font-semibold text-gray-800">Detail Laporan</span>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-2 rounded border border-gray-200 hover:bg-gray-50" onClick={() => nav(-1)} disabled={(detail?.index || 0) <= 0}>
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button className="p-2 rounded border border-gray-200 hover:bg-gray-50" onClick={() => nav(1)} disabled={(detail?.index || 0) >= prioritized.length - 1}>
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button className="ml-1 p-2 rounded border border-gray-200 hover:bg-gray-50" onClick={() => setDetail(null)} aria-label="Tutup">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            {current ? (
              <div className="p-4 md:p-6 space-y-5">
                <div>
                  <p className={cn('text-sm font-semibold text-gray-800', showFullDesc ? '' : 'line-clamp-4')}>
                    {current.originalData?.Report || current.originalData?.report || 'Deskripsi tidak tersedia'}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      {current.classification?.category ? `Kategori: ${current.classification.category}` : null}
                    </p>
                    {(current.originalData?.Report || current.originalData?.report) ? (
                      <button onClick={() => setShowFullDesc((s) => !s)} className="text-xs text-emerald-700 hover:underline">
                        {showFullDesc ? 'Tampilkan ringkas' : 'Lihat selengkapnya'}
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Tanggal', value: current.originalData?.Date_of_Event || current.originalData?.date || current.originalData?.created_at, icon: Calendar },
                    { label: 'Maskapai', value: current.originalData?.Airlines || current.originalData?.airlines, icon: Plane },
                    { label: 'No. Penerbangan', value: current.originalData?.Flight_Number || current.originalData?.flight_number, icon: FileText },
                    { label: 'Rute', value: current.originalData?.Route || current.originalData?.route, icon: MapPin },
                  ].map((it, i) => it.value ? (
                    <div key={i} className="p-3 rounded-xl border border-gray-200 bg-white shadow-sm">
                      <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                        <it.icon className="w-3.5 h-3.5 text-gray-500" /> {it.label}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">{String(it.value)}</div>
                    </div>
                  ) : null)}
                </div>

                {current.originalData?.Root_Caused || current.originalData?.Action_Taken ? (
                  <div className="grid grid-cols-1 gap-3">
                    {current.originalData?.Root_Caused ? (
                      <div className="p-3 rounded-xl border border-gray-200 bg-white">
                        <div className="text-xs font-semibold text-gray-700 mb-1">Root Cause</div>
                        <div className="text-xs text-gray-600 whitespace-pre-wrap">{current.originalData?.Root_Caused}</div>
                      </div>
                    ) : null}
                    {current.originalData?.Action_Taken ? (
                      <div className="p-3 rounded-xl border border-gray-200 bg-white">
                        <div className="text-xs font-semibold text-gray-700 mb-1">Tindakan</div>
                        <div className="text-xs text-gray-600 whitespace-pre-wrap">{current.originalData?.Action_Taken}</div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div>
                  <div className="text-xs font-semibold text-gray-700 mb-2">Rekomendasi</div>
                  <div className="flex flex-wrap gap-2">
                    {recommendActions(current.classification?.category, current.classification?.severity).map((r, i) => (
                      <span key={i} className="text-[11px] font-medium px-2 py-1 rounded-md bg-gray-50 border border-gray-200 text-gray-700">{r}</span>
                    ))}
                  </div>
                </div>

              </div>
            ) : (
              <div className="p-6 text-sm text-gray-500">Pilih laporan untuk melihat detail.</div>
            )}
          </SheetContent>
        </Sheet>
      </section>
    </div>
  );
}

 
