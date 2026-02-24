'use client';

import { useState, useEffect } from 'react';
import { PrismSelect } from '@/components/ui/PrismSelect';

interface SelectOption {
  value: string;
  label: string;
}

export interface FilterData {
  hub?: string;
  branch?: string;
  maskapai?: string; // Travel type (Jenis Maskapai)
  airline?: string;  // Actual Airline Name
  main_category?: string;
  area?: string;
  target_division?: string;
}

interface FilterOptionsState {
  hub: SelectOption[];
  branch: SelectOption[];
  airline: SelectOption[];
  airline_type: SelectOption[];
  main_category: SelectOption[];
  area: SelectOption[];
}

interface DynamicFilterHeaderProps {
  onFilterChange: (filters: FilterData) => void;
  initialFilters?: FilterData;
  variant?: 'default' | 'white';
}

export function DynamicFilterHeader({ onFilterChange, initialFilters, variant = 'default' }: DynamicFilterHeaderProps) {
  const [selectedHub, setSelectedHub] = useState(initialFilters?.hub || 'all');
  const [selectedBranch, setSelectedBranch] = useState(initialFilters?.branch || 'all');
  const [selectedMaskapai, setSelectedMaskapai] = useState(initialFilters?.maskapai || 'all');
  const [selectedAirline, setSelectedAirline] = useState(initialFilters?.airline || 'all');
  const [selectedCategory, setSelectedCategory] = useState(initialFilters?.main_category || 'all');
  const [selectedArea, setSelectedArea] = useState(initialFilters?.area || 'all');

  // Sync state if initialFilters changes from parent (e.g. via URL navigation)
  useEffect(() => {
    if (initialFilters) {
      if (initialFilters.hub) setSelectedHub(initialFilters.hub);
      if (initialFilters.branch) setSelectedBranch(initialFilters.branch);
      if (initialFilters.maskapai) setSelectedMaskapai(initialFilters.maskapai);
      if (initialFilters.airline) setSelectedAirline(initialFilters.airline);
      if (initialFilters.main_category) setSelectedCategory(initialFilters.main_category);
      if (initialFilters.area) setSelectedArea(initialFilters.area);
    }
  }, [initialFilters]);

  const [options, setOptions] = useState<FilterOptionsState>({
    hub: [{ value: 'all', label: 'HUB: All' }],
    branch: [{ value: 'all', label: 'Branch: All' }],
    airline: [{ value: 'all', label: 'Airlines: All' }],
    airline_type: [{ value: 'all', label: 'Maskapai: All' }],
    main_category: [{ value: 'all', label: 'Category: All' }],
    area: [{ value: 'all', label: 'Area: All' }]
  });

  useEffect(() => {
    async function fetchFilters() {
      try {
        const fields = ['hub', 'branch', 'airline', 'airline_type', 'main_category', 'area'].join(',');
        const res = await fetch(`/api/dashboards/filter-options?fields=${fields}`);
        const data = await res.json();
        
        const mapToOptions = (vals: string[]) => [
          { value: 'all', label: 'All' },
          ...(vals || []).map(v => ({ value: v, label: v }))
        ];

        setOptions({
          hub: mapToOptions(data.hub),
          branch: mapToOptions(data.branch),
          airline: mapToOptions(data.airline),
          airline_type: mapToOptions(data.airline_type),
          main_category: mapToOptions(data.main_category),
          area: mapToOptions(data.area)
        });
      } catch (err) {
        console.error('Error loading filters:', err);
      }
    }
    fetchFilters();
  }, []);

  useEffect(() => {
    onFilterChange({
      hub: selectedHub,
      branch: selectedBranch,
      maskapai: selectedMaskapai,
      airline: selectedAirline,
      main_category: selectedCategory,
      area: selectedArea
    });
  }, [selectedHub, selectedBranch, selectedMaskapai, selectedAirline, selectedCategory, selectedArea, onFilterChange]);

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 w-full">
      <div className="flex-1 min-w-[140px] max-w-[200px]">
        <PrismSelect 
          options={options.hub} 
          value={selectedHub} 
          onChange={setSelectedHub} 
          placeholder="HUB" 
          variant={variant}
          label="HUB Area"
        />
      </div>
      <div className="flex-1 min-w-[140px] max-w-[200px]">
        <PrismSelect 
          options={options.branch} 
          value={selectedBranch} 
          onChange={setSelectedBranch} 
          placeholder="Branch" 
          variant={variant}
          label="Branch / Station"
        />
      </div>
      <div className="flex-1 min-w-[140px] max-w-[200px]">
        <PrismSelect 
          options={options.airline_type} 
          value={selectedMaskapai} 
          onChange={setSelectedMaskapai} 
          placeholder="Maskapai" 
          variant={variant}
          label="Domestic/Intl"
        />
      </div>
      <div className="flex-1 min-w-[140px] max-w-[200px]">
        <PrismSelect 
          options={options.airline} 
          value={selectedAirline} 
          onChange={setSelectedAirline} 
          placeholder="Airlines" 
          variant={variant}
          label="Airlines Name"
        />
      </div>
      <div className="flex-1 min-w-[140px] max-w-[200px]">
        <PrismSelect 
          options={options.main_category} 
          value={selectedCategory} 
          onChange={setSelectedCategory} 
          placeholder="Category" 
          variant={variant}
          label="Case Category"
        />
      </div>
      <div className="flex-1 min-w-[140px] max-w-[200px]">
        <PrismSelect 
          options={options.area} 
          value={selectedArea} 
          onChange={setSelectedArea} 
          placeholder="Area" 
          variant={variant}
          label="Ops. Area"
        />
      </div>
    </div>
  );
}
