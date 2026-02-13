'use client';

import { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { PrismSelect } from '@/components/ui/PrismSelect';
import { PrismButton as Button } from '@/components/ui/PrismButton';
import { RotateCcw, Share2, MoreVertical, Calendar } from 'lucide-react';

// Placeholder data for filters
const hubOptions = [{ value: 'all', label: 'All HUB' }];
const branchOptions = [{ value: 'all', label: 'All Branch' }];
const maskapaiOptions = [{ value: 'all', label: 'All Maskapai' }];
const airlinesOptions = [{ value: 'all', label: 'All Airlines' }];
const categoryOptions = [{ value: 'all', label: 'All Category' }];
const areaOptions = [{ value: 'all', label: 'All Area' }];

import { CustomerFeedbackDashboardCharts } from '@/components/dashboard/CustomerFeedbackCharts';

export default function CustomerFeedbackPage() {
    // Filter states
    const [selectedHub, setSelectedHub] = useState('all');
    const [selectedBranch, setSelectedBranch] = useState('all');
    const [selectedMaskapai, setSelectedMaskapai] = useState('all');
    const [selectedAirlines, setSelectedAirlines] = useState('all');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedArea, setSelectedArea] = useState('all');

    return (
        <div className="p-6 space-y-6 min-h-screen bg-[var(--surface-1)] text-[var(--text-primary)] font-sans">
            {/* Top Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Customer Feedback 2025 - 2026</h1>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--border-subtle)] text-sm font-medium hover:bg-[var(--surface-2)] transition-colors">
                        <RotateCcw size={16} />
                        Reset
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-medium hover:bg-blue-200 transition-colors">
                        <Share2 size={16} />
                        Share
                    </button>
                    <button className="p-2 rounded-full border border-[var(--border-subtle)] hover:bg-[var(--surface-2)] transition-colors">
                        <MoreVertical size={16} />
                    </button>
                </div>
            </div>

            {/* Main Content Card */}
            <GlassCard className="space-y-6" padding="lg">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                         {/* Logo Placeholder */}
                        <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center text-green-600 font-bold text-xs uppercase text-center border-2 border-green-500">
                             Gapura<br/>Logo
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold text-[var(--brand-primary)]">Landside & Airside Customer Feedback 2025 - 2026</h2>
                             <div className="flex items-center gap-2 mt-2 bg-green-500 text-white px-3 py-1 rounded w-fit">
                                <span className="font-semibold">Irregularity, Complain & Compliment Report</span>
                            </div>
                        </div>
                    </div>

                    {/* Date Range Picker Placeholder */}
                     <div className="bg-white border text-black border-gray-200 rounded-md px-4 py-2 flex items-center gap-2 min-w-[200px]">
                        <Calendar size={16} className="text-gray-500"/>
                        <span className="text-sm">Select date range</span>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="grid grid-cols-6 gap-3">
                    <PrismSelect options={hubOptions} value={selectedHub} onChange={setSelectedHub} placeholder="HUB" />
                    <PrismSelect options={branchOptions} value={selectedBranch} onChange={setSelectedBranch} placeholder="Branch" />
                    <PrismSelect options={maskapaiOptions} value={selectedMaskapai} onChange={setSelectedMaskapai} placeholder="Maskapai" />
                    <PrismSelect options={airlinesOptions} value={selectedAirlines} onChange={setSelectedAirlines} placeholder="Airlines" />
                    <PrismSelect options={categoryOptions} value={selectedCategory} onChange={setSelectedCategory} placeholder="Category" />
                    <PrismSelect options={areaOptions} value={selectedArea} onChange={setSelectedArea} placeholder="Area" />
                </div>

                {/* KPI/Stats Row */}
                <div className="grid grid-cols-4 gap-6 text-center border-t border-b border-[var(--border-subtle)] py-6">
                    <div>
                        <div className="text-sm text-[var(--text-secondary)] mb-1">Report</div>
                        <div className="text-4xl font-bold text-[var(--brand-primary)]">427</div>
                    </div>
                    <div>
                         <div className="text-sm text-[var(--text-secondary)] mb-1">Branch</div>
                        <div className="text-4xl font-bold text-[var(--brand-primary)]">27</div>
                    </div>
                     <div>
                         <div className="text-sm text-[var(--text-secondary)] mb-1">Airlines</div>
                        <div className="text-4xl font-bold text-[var(--brand-primary)]">33</div>
                    </div>
                     <div>
                         <div className="text-sm text-[var(--text-secondary)] mb-1">Compliment Report</div>
                        <div className="text-4xl font-bold text-[var(--brand-primary)]">18</div>
                    </div>
                </div>

                {/* Charts Area */}
                <CustomerFeedbackDashboardCharts />


                {/* Detail Table Placeholder */}
                 <div className="min-h-[200px] flex items-center justify-center border-2 dashed border-[var(--border-subtle)] rounded-xl bg-[var(--surface-2)]">
                    <p className="text-[var(--text-muted)]">Collapsible Detail Table will be rendered here...</p>
                </div>

            </GlassCard>
        </div>
    );
}
