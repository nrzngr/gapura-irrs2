'use client';

import { useState, useEffect } from 'react';
import { PrismSelect } from '@/components/ui/PrismSelect';

interface DynamicFilterHeaderProps {
  onFilterChange: (filters: any) => void;
  initialFilters?: any;
  variant?: 'default' | 'white';
}

export function DynamicFilterHeader({ onFilterChange, initialFilters, variant = 'default' }: DynamicFilterHeaderProps) {
  const [selectedHub, setSelectedHub] = useState(initialFilters?.hub || 'all');
  const [selectedBranch, setSelectedBranch] = useState(initialFilters?.branch || 'all');
  const [selectedMaskapai, setSelectedMaskapai] = useState(initialFilters?.maskapai || 'all');
  const [selectedAirlines, setSelectedAirlines] = useState(initialFilters?.airlines || 'all');
  const [selectedCategory, setSelectedCategory] = useState(initialFilters?.category || 'all');
  const [selectedArea, setSelectedArea] = useState(initialFilters?.area || 'all');

  const [options, setOptions] = useState<any>({
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
      airlines: selectedAirlines,
      category: selectedCategory,
      area: selectedArea
    });
  }, [selectedHub, selectedBranch, selectedMaskapai, selectedAirlines, selectedCategory, selectedArea, onFilterChange]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="w-32">
        <PrismSelect 
          options={options.hub} 
          value={selectedHub} 
          onChange={setSelectedHub} 
          placeholder="HUB" 
          variant={variant}
          label="HUB Area"
        />
      </div>
      <div className="w-32">
        <PrismSelect 
          options={options.branch} 
          value={selectedBranch} 
          onChange={setSelectedBranch} 
          placeholder="Branch" 
          variant={variant}
          label="Branch / Station"
        />
      </div>
      <div className="w-32">
        <PrismSelect 
          options={options.airline_type} 
          value={selectedMaskapai} 
          onChange={setSelectedMaskapai} 
          placeholder="Maskapai" 
          variant={variant}
          label="Domestic/Intl"
        />
      </div>
      <div className="w-32">
        <PrismSelect 
          options={options.airline} 
          value={selectedAirlines} 
          onChange={setSelectedAirlines} 
          placeholder="Airlines" 
          variant={variant}
          label="Airlines Name"
        />
      </div>
      <div className="w-32">
        <PrismSelect 
          options={options.main_category} 
          value={selectedCategory} 
          onChange={setSelectedCategory} 
          placeholder="Category" 
          variant={variant}
          label="Case Category"
        />
      </div>
      <div className="w-32">
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
