'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

interface Option {
    value: string;
    label: string;
    description?: string;
    icon?: React.ReactNode;
}

interface PrismSelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
    searchable?: boolean;
    required?: boolean;
}

export function PrismSelect({ 
    options, 
    value, 
    onChange, 
    placeholder = 'Select option', 
    label,
    searchable = true,
    required = false
}: PrismSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt => 
        opt.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
        opt.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (opt.description && opt.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const selectedOption = options.find(opt => opt.value === value);

    return (
        <div className="relative" ref={containerRef}>
            {label && (
                <label className="label">
                    {label} {required && <span className="text-[var(--status-error)]">*</span>}
                </label>
            )}
            
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all duration-200
                    ${isOpen 
                        ? 'border-[var(--brand-primary)] bg-[var(--surface-2)] shadow-[0_0_0_4px_oklch(0.55_0.16_160_/_0.1)]' 
                        : 'border-transparent bg-[var(--surface-3)] hover:bg-[var(--surface-4)]'
                    }
                `}
            >
                {selectedOption ? (
                    <div className="flex flex-col items-start text-left">
                        <span className="font-medium text-[var(--text-primary)]">{selectedOption.label}</span>
                        {selectedOption.description && (
                            <span className="text-xs text-[var(--text-secondary)]">{selectedOption.description}</span>
                        )}
                    </div>
                ) : (
                    <span className="text-[var(--text-muted)]">{placeholder}</span>
                )}
                <ChevronDown 
                    size={20} 
                    className={`text-[var(--text-secondary)] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div 
                    className="absolute top-full left-0 right-0 mt-2 p-2 rounded-2xl bg-[var(--surface-2)] border border-[var(--surface-3)] shadow-xl z-50 animate-scale-in origin-top"
                    style={{ maxHeight: '300px', display: 'flex', flexDirection: 'column' }}
                >
                    {/* Search Bar */}
                    {searchable && (
                        <div className="sticky top-0 px-2 pb-2 mb-2 border-b border-[var(--surface-3)]">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
                                <input
                                    type="text"
                                    className="w-full pl-9 pr-4 py-2 rounded-lg bg-[var(--surface-1)] border border-transparent focus:border-[var(--brand-primary)] focus:outline-none text-sm transition-colors"
                                    placeholder="Search..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>
                    )}

                    {/* Options List */}
                    <div className="overflow-y-auto custom-scrollbar flex-1 space-y-1">
                        {filteredOptions.length === 0 ? (
                            <div className="p-4 text-center text-sm text-[var(--text-muted)]">
                                No results found.
                            </div>
                        ) : (
                            filteredOptions.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => {
                                        onChange(opt.value);
                                        setIsOpen(false);
                                        setSearchTerm('');
                                    }}
                                    className={`
                                        w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors
                                        ${value === opt.value 
                                            ? 'bg-[var(--brand-primary)] text-white' 
                                            : 'hover:bg-[var(--surface-3)] text-[var(--text-primary)]'
                                        }
                                    `}
                                >
                                    <div className="flex items-center gap-3">
                                        {opt.icon}
                                        <div>
                                            <div className="font-medium text-sm">{opt.label}</div>
                                            {opt.description && (
                                                <div className={`text-xs ${value === opt.value ? 'text-white/80' : 'text-[var(--text-muted)]'}`}>
                                                    {opt.description}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {value === opt.value && <Check size={16} />}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
