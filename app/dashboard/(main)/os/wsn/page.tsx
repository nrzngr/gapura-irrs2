'use client';

import { useEffect, useMemo, useState } from 'react';
import { PresentationSlide } from '@/components/dashboard/PresentationSlide';

type WSNRecord = {
  Bulan: string;
  NomorWSN: string;
  Keterangan: string;
  Unit: string;
  Petugas: string;
  Link: string;
};

type APIResponse = {
  total: number;
  filters: { bulan: string[]; unit: string[]; petugas: string[] };
  records: WSNRecord[];
};

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-[var(--text-muted)]">{label}</span>
      <select
        className="px-3 py-2 rounded-xl border border-[var(--surface-4)] bg-white text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="All">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function driveId(link: string): string | null {
  if (!link) return null;
  const fileD = link.match(/\/file\/d\/([^/]+)/);
  if (fileD?.[1]) return fileD[1];
  const idParam = link.match(/[?&]id=([^&]+)/);
  if (idParam?.[1]) return idParam[1];
  const openParam = link.match(/open\?id=([^&]+)/);
  if (openParam?.[1]) return openParam[1];
  const plain = link.match(/^[A-Za-z0-9_-]{20,}$/);
  if (plain?.[0]) return plain[0];
  return null;
}

function drivePreview(link: string): string | null {
  const id = driveId(link);
  return id ? `https://drive.google.com/file/d/${id}/preview` : null;
}

function driveCandidates(link: string, size = 480): string[] {
  const id = driveId(link);
  if (!id) return [link];
  return [
    `https://lh3.googleusercontent.com/d/${id}=w${size}`,
    `https://drive.google.com/thumbnail?id=${id}&sz=w${size}`,
    `https://drive.google.com/uc?export=download&id=${id}`,
  ];
}

function DriveImage({ link, alt, className, size = 480 }: { link: string; alt?: string; className?: string; size?: number }) {
  const [attempt, setAttempt] = useState(0);
  const urls = useMemo(() => driveCandidates(link, size), [link, size]);
  const src = attempt < urls.length ? urls[attempt] : '';
  const onError = () => {
    setAttempt((a) => (a + 1));
  };
  const placeholder =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${Math.floor(
        size * 4 / 3
      )}" viewBox="0 0 ${size} ${Math.floor(size * 4 / 3)}"><rect width="100%" height="100%" fill="#f0f2f5"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="14" fill="#99a1ab">No Thumbnail</text></svg>`
    );
  return <img src={src || placeholder} alt={alt} className={className} onError={onError} />;
}

export default function WSNPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<APIResponse | null>(null);
  const [bulan, setBulan] = useState('All');
  const [unit, setUnit] = useState('All');
  const [petugas, setPetugas] = useState('All');
  const [sheet, setSheet] = useState('All');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<WSNRecord | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (bulan !== 'All') p.set('bulan', bulan);
    if (unit !== 'All') p.set('unit', unit);
    if (petugas !== 'All') p.set('petugas', petugas);
    if (sheet !== 'All') p.set('sheet', sheet);
    if (search.trim()) p.set('search', search.trim());
    return p.toString();
  }, [bulan, unit, petugas, sheet, search]);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    const url = query ? `/api/wsn?${query}` : '/api/wsn';
    fetch(url)
      .then((r) => r.json())
      .then((j: APIResponse) => {
        if (!ignore) {
          setData(j);
          setSelected(j.records?.[0] || null);
          setPage(1);
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [query]);

  const paged = useMemo(() => {
    const rows = data?.records || [];
    return rows.slice((page - 1) * pageSize, page * pageSize);
  }, [data, page]);

  const resetFilters = () => {
    setBulan('All');
    setUnit('All');
    setPetugas('All');
    setSheet('All');
    setSearch('');
  };

  const openLink = (r: WSNRecord) => {
    window.open(r.Link, '_blank');
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--surface-0)' }}>
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6 space-y-6">
        <div className="flex flex-col gap-3">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Dashboard WSN</h1>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <Select label="Sheet" value={sheet} onChange={setSheet} options={['WSN', 'WSN Baru']} />
            <Select label="Bulan" value={bulan} onChange={setBulan} options={data?.filters.bulan || []} />
            <Select label="Unit" value={unit} onChange={setUnit} options={data?.filters.unit || []} />
            <Select label="Petugas" value={petugas} onChange={setPetugas} options={data?.filters.petugas || []} />
            <div className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-xs font-semibold text-[var(--text-muted)]">Cari</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nomor/Keterangan/Unit/Petugas"
                className="px-3 py-2 rounded-xl border border-[var(--surface-4)] bg-white text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="px-3 py-2 rounded-xl border border-[var(--surface-4)] bg-white text-sm font-semibold hover:bg-[var(--surface-2)]"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="min-h-[40vh] flex items-center justify-center">
            <div
              className="w-10 h-10 rounded-full border-4 animate-spin"
              style={{ borderColor: 'var(--surface-4)', borderTopColor: 'var(--brand-primary)' }}
            />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <PresentationSlide className="lg:col-span-2">
                {selected ? (
                  <div className="w-full flex flex-col items-center gap-3">
                    <div className="w-full aspect-[3/4] rounded-xl overflow-hidden border border-[var(--surface-4)] bg-white flex items-center justify-center">
                      {drivePreview(selected.Link) ? (
                        <iframe
                          src={drivePreview(selected.Link) as string}
                          className="w-full h-full"
                          allow="autoplay"
                        />
                      ) : (
                        <DriveImage
                          link={selected.Link}
                          size={1600}
                          alt={selected.Keterangan || selected.NomorWSN}
                          className="w-full h-full object-contain"
                        />
                      )}
                    </div>
                    <div className="w-full flex items-center justify-between">
                      <div className="text-sm">
                        <div className="font-bold">{selected.NomorWSN || '-'}</div>
                        <div className="text-[var(--text-muted)]">{selected.Keterangan || '-'}</div>
                      </div>
                      <button
                        onClick={() => openLink(selected)}
                        className="px-3 py-2 rounded-lg border border-[var(--surface-4)] text-sm font-semibold hover:bg-[var(--surface-2)]"
                      >
                        Buka
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="h-[50vh] flex items-center justify-center text-[var(--text-muted)]">Tidak ada data</div>
                )}
              </PresentationSlide>
              <PresentationSlide>
                <div className="grid gap-2">
                  <div className="p-4 rounded-xl bg-[var(--surface-2)] text-sm font-bold">
                    Record Count: {data?.total ?? 0}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-xl border border-[var(--surface-4)] text-xs">
                      <div className="font-semibold">Unit</div>
                      <div className="text-[var(--text-muted)]">{selected?.Unit || '-'}</div>
                    </div>
                    <div className="p-3 rounded-xl border border-[var(--surface-4)] text-xs">
                      <div className="font-semibold">Petugas</div>
                      <div className="text-[var(--text-muted)]">{selected?.Petugas || '-'}</div>
                    </div>
                    <div className="p-3 rounded-xl border border-[var(--surface-4)] text-xs">
                      <div className="font-semibold">Bulan</div>
                      <div className="text-[var(--text-muted)]">{selected?.Bulan || '-'}</div>
                    </div>
                    <div className="p-3 rounded-xl border border-[var(--surface-4)] text-xs">
                      <div className="font-semibold">Nomor</div>
                      <div className="text-[var(--text-muted)]">{selected?.NomorWSN || '-'}</div>
                    </div>
                  </div>
                </div>
              </PresentationSlide>
            </div>

            <PresentationSlide>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {paged.map((r) => (
                  <button
                    key={`${r.NomorWSN}-${r.Link}`}
                    onClick={() => setSelected(r)}
                    className="group relative border border-[var(--surface-4)] rounded-xl overflow-hidden bg-white hover:shadow"
                    title={r.Keterangan}
                  >
                    <div className="w-full aspect-[3/4] bg-[var(--surface-2)]">
                      <DriveImage link={r.Link} size={480} alt={r.Keterangan || r.NomorWSN} className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-2 py-1">
                      {r.NomorWSN}
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between mt-3 text-sm">
                <span>
                  {data?.total
                    ? `${(page - 1) * pageSize + 1} - ${Math.min(page * pageSize, data.total)} dari ${data.total}`
                    : '0'}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 rounded-lg border border-[var(--surface-4)] disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setPage((p) => (data && p * pageSize < data.total ? p + 1 : p))}
                    disabled={!data || page * pageSize >= data.total}
                    className="px-3 py-1.5 rounded-lg border border-[var(--surface-4)] disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </PresentationSlide>
          </>
        )}
      </div>
    </div>
  );
}
