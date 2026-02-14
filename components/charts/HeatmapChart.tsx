

import { useState, useMemo } from 'react';

const HEATMAP_GREEN = '#6b8e3d';
const HEATMAP_BANNER = '#5a7a3a'; // Darker green for headers
const HEATMAP_LIGHT = '#e8f5e9'; // Light green for totals

interface HeatmapChartProps {
    title?: string;
    data: Record<string, any>[];
    xAxis: string;
    yAxis: string | string[];
    metric: string;
    onViewDetail?: () => void;
    showTitle?: boolean;
}

export function HeatmapChart({ 
    title, 
    data, 
    xAxis, 
    yAxis, 
    metric, 
    onViewDetail,
    showTitle = true
}: HeatmapChartProps) {
    // Support single or multiple yAxis fields
    const yFields = Array.isArray(yAxis) ? yAxis : [yAxis];
    const isMultiY = yFields.length > 1;

    // 1. Get unique X values (column headers)
    const xValues = useMemo(() => 
        Array.from(new Set(data.map(d => d[xAxis]))).filter(Boolean).sort(),
    [data, xAxis]);

    // 2. Build row keys from yAxis field(s)
    const SEPARATOR = '|||';
    const getRowKey = (row: Record<string, any>) => yFields.map(f => row[f] ?? '').join(SEPARATOR);
    const parseRowKey = (key: string) => key.split(SEPARATOR);

    // 3. Process Data: Build Pivot Map and Calculate Totals
    const { pivotMap, rowKeys, rowTotals, colTotals, grandTotal } = useMemo(() => {
        const pMap = new Map<string, Map<string, number>>();
        const rTotals: Record<string, number> = {};
        const cTotals: Record<string, number> = {};
        let gTotal = 0;
        
        const seenKeys = new Set<string>();
        const rKeys: string[] = [];

        // First pass: aggregate data into pivot map
        data.forEach(row => {
            const rk = getRowKey(row);
            const x = row[xAxis];
            const val = Number(row[metric]) || 0;
            
            if (!seenKeys.has(rk)) { seenKeys.add(rk); rKeys.push(rk); }
            
            if (!pMap.has(rk)) pMap.set(rk, new Map());
            const existing = pMap.get(rk)!.get(x) || 0;
            pMap.get(rk)!.set(x, existing + val);
        });

        // Second pass: calculate totals
         rKeys.forEach(rk => {
            let rTotal = 0;
            xValues.forEach(x => {
                const val = pMap.get(rk)?.get(x) || 0;
                rTotal += val;
                cTotals[x] = (cTotals[x] || 0) + val;
            });
            rTotals[rk] = rTotal;
            gTotal += rTotal;
        });

        // Sort rows by Grand Total Descending
        rKeys.sort((a, b) => rTotals[b] - rTotals[a]);

        return { pivotMap: pMap, rowKeys: rKeys, rowTotals: rTotals, colTotals: cTotals, grandTotal: gTotal };
    }, [data, xAxis, metric, xValues, yFields]); // eslint-disable-line react-hooks/exhaustive-deps

    // Helper for heatmap cell background
    const allVals = rowKeys.flatMap(rk => xValues.map(x => pivotMap.get(rk)?.get(x) || 0));
    const maxVal = Math.max(...allVals, 1);
    
    const getCellStyle = (val: number): React.CSSProperties => {
        if (!val) return { textAlign: 'center', padding: '6px 8px', fontSize: 13, color: '#999' };
        // Simpler opacity scale for cleaner look
        const alpha = Math.max(0.1, Math.min(0.6, val / maxVal));
        return {
            textAlign: 'center',
            padding: '6px 8px',
            fontSize: 13,
            fontWeight: 600,
            background: `rgba(107, 142, 61, ${alpha})`,
            color: alpha > 0.4 ? '#fff' : '#333',
        };
    };



    // --- PAGINATION LOGIC ---
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 9;
    const totalPages = Math.ceil(rowKeys.length / PAGE_SIZE);
    
    // Ensure current page is valid if data changes
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages);

    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const currentRowKeys = rowKeys.slice(startIndex, startIndex + PAGE_SIZE);

    const nextPage = () => setCurrentPage(p => Math.min(totalPages, p + 1));
    const prevPage = () => setCurrentPage(p => Math.max(1, p - 1));

    return (
        <div style={{
            background: '#fff',
            borderRadius: 8,
            border: '1px solid #e0e0e0',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            fontFamily: "'Segoe UI', system-ui, sans-serif"
        }}>
            {/* Title */}
            {showTitle && title && (
                <div style={{
                    padding: '16px 20px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0,
                    borderBottom: '1px solid #f0f0f0'
                }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#2c3e50' }}>{title}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                         <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>Report Category / Record Count</span>
                        {onViewDetail && (
                            <button
                                onClick={onViewDetail}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    color: '#fff',
                                    backgroundColor: HEATMAP_GREEN,
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 4px rgba(107, 142, 61, 0.25)',
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = HEATMAP_BANNER;
                                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(107, 142, 61, 0.3)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = HEATMAP_GREEN;
                                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(107, 142, 61, 0.25)';
                                }}
                                title="Lihat Detail"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                    <circle cx="12" cy="12" r="3"/>
                                </svg>
                                <span>Detail</span>
                            </button>
                        )}
                    </div>
                </div>
            )}
            
            <div style={{ flex: 1, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                        <tr>
                            {yFields.map(f => (
                                <th key={f} style={{
                                    padding: '10px 12px',
                                    textAlign: 'left',
                                    fontWeight: 600,
                                    background: HEATMAP_BANNER,
                                    color: '#fff',
                                    fontSize: 12,
                                    whiteSpace: 'nowrap',
                                    textTransform: 'capitalize',
                                    borderRight: '1px solid rgba(255,255,255,0.1)'
                                }}>{f.replace(/_/g, ' ')}</th>
                            ))}
                            {xValues.map(x => (
                                <th key={x} style={{
                                    padding: '10px 12px',
                                    textAlign: 'center',
                                    fontWeight: 600,
                                    background: HEATMAP_BANNER,
                                    color: '#fff',
                                    fontSize: 12,
                                    whiteSpace: 'nowrap',
                                    borderRight: '1px solid rgba(255,255,255,0.1)'
                                }}>{x}</th>
                            ))}
                             {/* Grand Total Column Header */}
                            <th style={{
                                padding: '10px 12px',
                                textAlign: 'center',
                                fontWeight: 700,
                                background: HEATMAP_BANNER,
                                color: '#fff',
                                fontSize: 12,
                                whiteSpace: 'nowrap',
                            }}>Grand total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentRowKeys.map((rk, idx) => {
                            const parts = parseRowKey(rk);
                            // Pre-calculate showFirstField correctly without reassigning a variable in render
                            const showFirstField = !isMultiY || (idx === 0 || parts[0] !== parseRowKey(currentRowKeys[idx - 1])[0]);
                            const isOdd = idx % 2 !== 0;
                            
                            return (
                                <tr key={rk} style={{ borderBottom: '1px solid #f0f0f0', background: isOdd ? '#fafafa' : '#fff' }}>
                                    {yFields.map((_, fi) => (
                                        <td key={fi} style={{
                                            padding: '8px 12px',
                                            fontSize: 13,
                                            fontWeight: 600,
                                            color: '#334155',
                                            whiteSpace: 'nowrap',
                                            borderRight: '1px solid #f0f0f0'
                                        }}>
                                            {fi === 0 && isMultiY ? (showFirstField ? parts[fi] : '') : parts[fi]}
                                        </td>
                                    ))}
                                    {xValues.map(x => {
                                        const val = pivotMap.get(rk)?.get(x) || 0;
                                        return (
                                            <td key={x} style={{ ...getCellStyle(val), borderRight: '1px solid #f0f0f0' }}>
                                                {val || '-'}
                                            </td>
                                        );
                                    })}
                                    {/* Row Grand Total */}
                                    <td style={{
                                        padding: '8px 12px',
                                        textAlign: 'center',
                                        fontSize: 13,
                                        fontWeight: 700,
                                        color: '#333',
                                        background: isOdd ? '#f5f9f5' : '#fff' // Subtle green tint for total
                                    }}>{rowTotals[rk]}</td>
                                </tr>
                            );
                        })}
                        {/* Fill empty rows to maintain height if needed, OR just let it compress */}
                        {currentRowKeys.length === 0 && (
                            <tr><td colSpan={yFields.length + xValues.length + 1} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>No data available</td></tr>
                        )}
                    </tbody>
                    <tfoot style={{ position: 'sticky', bottom: 0, zIndex: 10 }}>
                        <tr style={{ background: HEATMAP_LIGHT, borderTop: `2px solid ${HEATMAP_GREEN}` }}>
                            <td colSpan={yFields.length} style={{
                                padding: '10px 12px',
                                fontSize: 13,
                                fontWeight: 700,
                                color: HEATMAP_GREEN,
                            }}>Grand total (All Pages)</td>
                            {xValues.map(x => (
                                <td key={x} style={{
                                    padding: '10px 12px',
                                    textAlign: 'center',
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: HEATMAP_GREEN,
                                }}>{colTotals[x] || 0}</td>
                            ))}
                            <td style={{
                                padding: '10px 12px',
                                textAlign: 'center',
                                fontSize: 14,
                                fontWeight: 800, // Extra bold
                                color: HEATMAP_GREEN,
                            }}>{grandTotal}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

             {/* Pagination Controls */}
             {totalPages > 1 && (
                <div style={{
                    padding: '10px 16px',
                    borderTop: '1px solid #eee',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 10,
                    background: '#fff'
                }}>
                    <span style={{ fontSize: 12, color: '#64748b' }}>
                        Page {currentPage} of {totalPages}
                    </span>
                    <button 
                        onClick={prevPage} 
                        disabled={currentPage === 1}
                        style={{
                            padding: '6px 10px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            background: currentPage === 1 ? '#f8fafc' : '#fff',
                            color: currentPage === 1 ? '#cbd5e1' : '#334155',
                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                            fontSize: 12,
                            fontWeight: 500
                        }}
                    >
                        Prev
                    </button>
                    <button 
                        onClick={nextPage} 
                        disabled={currentPage === totalPages}
                        style={{
                            padding: '6px 10px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            background: currentPage === totalPages ? '#f8fafc' : '#fff',
                            color: currentPage === totalPages ? '#cbd5e1' : '#334155',
                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                            fontSize: 12,
                            fontWeight: 500
                        }}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}
