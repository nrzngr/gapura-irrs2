'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
    { name: 'CGK', reports: 45, high: 12 },
    { name: 'DPS', reports: 32, high: 8 },
    { name: 'SUB', reports: 28, high: 5 },
    { name: 'KNO', reports: 24, high: 3 },
    { name: 'UPG', reports: 20, high: 6 },
    { name: 'BPN', reports: 18, high: 4 },
];

export function OverallAirportChart() {
    return (
        <div className="w-full h-[350px] mt-6 p-6 rounded-[2rem] border border-white/20 bg-white/40 backdrop-blur-xl shadow-xl relative overflow-hidden group">
             {/* Glossy Overlay */}
             <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
             
             <div className="relative z-10 flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-[var(--text-primary)] font-display">Sebaran Laporan Area</h3>
                    <p className="text-xs text-[var(--text-secondary)]">Top 6 Station dengan volume tertinggi</p>
                </div>
                <div className="flex gap-2">
                     <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-sm">Total</span>
                     <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-100 shadow-sm">High Severity</span>
                </div>
            </div>
            
            <ResponsiveContainer width="100%" height={250} className="relative z-10">
                <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={6}>
                    <defs>
                        <linearGradient id="colorReports" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#4F46E5" stopOpacity={1}/>
                            <stop offset="100%" stopColor="#818CF8" stopOpacity={0.8}/>
                        </linearGradient>
                         <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#F97316" stopOpacity={1}/>
                            <stop offset="100%" stopColor="#FDBA74" stopOpacity={0.8}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.04)" />
                    <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontWeight: 700 }}
                        dy={12}
                    />
                    <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                    />
                    <Tooltip 
                        cursor={{ fill: 'rgba(0,0,0,0.02)', radius: 8 }}
                        contentStyle={{ 
                            borderRadius: '16px', 
                            border: '1px solid rgba(255,255,255,0.5)', 
                            background: 'rgba(255,255,255,0.8)',
                            backdropFilter: 'blur(12px)',
                            boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)',
                            fontFamily: 'var(--font-sans)',
                            fontSize: '12px',
                            padding: '12px 16px'
                        }}
                    />
                    <Bar 
                        dataKey="reports" 
                        fill="url(#colorReports)" 
                        radius={[6, 6, 6, 6]} 
                        barSize={20}
                        animationDuration={1500}
                        animationEasing="ease-out"
                    />
                    <Bar 
                        dataKey="high" 
                        fill="url(#colorHigh)" 
                        radius={[6, 6, 6, 6]} 
                        barSize={20}
                        animationDuration={1500}
                        animationEasing="ease-out"
                        animationBegin={200}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
