'use client';

import { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { PrismSelect } from '@/components/ui/PrismSelect';
import { RotateCcw, MoreVertical, Calendar } from 'lucide-react';

// Initial static options (will be populated dynamicly)
const allOption = { value: 'all', label: 'All' };
const initialOptions = [allOption];

import { CustomerFeedbackDashboardCharts } from '@/components/dashboard/CustomerFeedbackCharts';

interface Option {
    value: string;
    label: string;
}

interface FilterOptions {
    hub: Option[];
    branch: Option[];
    airline: Option[];
    airline_type: Option[];
    main_category: Option[];
    area: Option[];
}

export default function CustomerFeedbackPage() {
    // Filter states
    const [selectedHub, setSelectedHub] = useState('all');
    const [selectedBranch, setSelectedBranch] = useState('all');
    const [selectedMaskapai, setSelectedMaskapai] = useState('all');
    const [selectedAirlines, setSelectedAirlines] = useState('all');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedArea, setSelectedArea] = useState('all');

    // Options states
    const [options, setOptions] = useState<FilterOptions>({
        hub: initialOptions,
        branch: initialOptions,
        airline: initialOptions,
        airline_type: initialOptions,
        main_category: initialOptions,
        area: initialOptions
    });

    useEffect(() => {
        async function fetchFilters() {
            try {
                const res = await fetch('/api/dashboard/filters');
                const data = await res.json();
                
                setOptions({
                    hub: [allOption, ...(data.hub || [])],
                    branch: [allOption, ...(data.branch || [])],
                    airline: [allOption, ...(data.airline || [])],
                    airline_type: [allOption, ...(data.airline_type || [])],
                    main_category: [allOption, ...(data.main_category || [])],
                    area: [allOption, ...(data.area || [])]
                });
            } catch (err) {
                console.error('Error loading filters:', err);
            }
        }
        fetchFilters();
    }, []);

    const handleReset = () => {
        setSelectedHub('all');
        setSelectedBranch('all');
        setSelectedMaskapai('all');
        setSelectedAirlines('all');
        setSelectedCategory('all');
        setSelectedArea('all');
    };

    return (
        <div className="p-6 space-y-6 min-h-screen bg-[var(--surface-1)] text-[var(--text-primary)] font-sans">
            {/* Top Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Customer Feedback</h1>
                <div className="flex gap-3">
                    <button 
                        onClick={handleReset}
                        className="flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--border-subtle)] text-sm font-medium hover:bg-[var(--surface-2)] transition-colors"
                    >
                        <RotateCcw size={16} />
                        Reset
                    </button>
                    {/* Share removed as per previous task */}
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
                            <h2 className="text-3xl font-bold text-[var(--brand-primary)]">Landside & Airside Customer Feedback</h2>
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
                <div className="grid grid-cols-3 gap-4">
                    <PrismSelect label="HUB Area" options={options.hub} value={selectedHub} onChange={setSelectedHub} placeholder="Select HUB" />
                    <PrismSelect label="Branch / Station" options={options.branch} value={selectedBranch} onChange={setSelectedBranch} placeholder="Select Branch" />
                    <PrismSelect label="Domestic / International" options={options.airline_type} value={selectedMaskapai} onChange={setSelectedMaskapai} placeholder="Select Type" />
                    <PrismSelect label="Airlines Name" options={options.airline} value={selectedAirlines} onChange={setSelectedAirlines} placeholder="Select Airline" />
                    <PrismSelect label="Case Category" options={options.main_category} value={selectedCategory} onChange={setSelectedCategory} placeholder="Select Category" />
                    <PrismSelect label="Operational Area" options={options.area} value={selectedArea} onChange={setSelectedArea} placeholder="Select Area" />
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
                <CustomerFeedbackDashboardCharts 
                    filters={{
                        hub: selectedHub,
                        branch: selectedBranch,
                        maskapai: selectedMaskapai,
                        airlines: selectedAirlines,
                        category: selectedCategory,
                        area: selectedArea
                    }}
                />


                {/* Detail Table Placeholder */}
                 <div className="min-h-[200px] flex items-center justify-center border-2 dashed border-[var(--border-subtle)] rounded-xl bg-[var(--surface-2)]">
                    <p className="text-[var(--text-muted)]">Collapsible Detail Table will be rendered here...</p>
                </div>

            </GlassCard>
        </div>
    );
}
