import React, { useState, useRef, useEffect, useMemo } from 'react';
import { SRI_LANKA_DISTRICTS_WITH_PROVINCE, DistrictInfo } from '../../utils/sriLankaDistricts';
import { MapPin, ChevronDown, Check, X } from 'lucide-react';

export interface DistrictSelectProps {
  value?: string;
  onChange: (district: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
  id?: string;
}

export const DistrictSelect: React.FC<DistrictSelectProps> = ({
  value = '',
  onChange,
  label = 'District *',
  placeholder = 'Type or select district...',
  required = false,
  disabled = false,
  error,
  helperText,
  className = '',
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectId = id || (label ? label.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'district-select');

  // Keep internal text synced when external value prop changes
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  // Filter districts based on what user typed in the single input
  const filteredDistricts = useMemo(() => {
    const q = inputValue.trim().toLowerCase();

    // If empty or identical to the currently selected value, show all 25 districts
    if (!q || (value && q === value.toLowerCase())) {
      return SRI_LANKA_DISTRICTS_WITH_PROVINCE;
    }

    // Sort prefix matches first, then substring matches
    return [...SRI_LANKA_DISTRICTS_WITH_PROVINCE]
      .sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(q);
        const bStarts = b.name.toLowerCase().startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.name.localeCompare(b.name);
      })
      .filter((d) => d.name.toLowerCase().includes(q) || d.province.toLowerCase().includes(q));
  }, [inputValue, value]);

  // Adjust highlighted index if filtered list changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredDistricts.length]);

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeEl = listRef.current.children[highlightedIndex] as HTMLElement | undefined;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Handle selecting a district
  const handleSelect = (district: DistrictInfo) => {
    setInputValue(district.name);
    onChange(district.name);
    setIsOpen(false);
  };

  // Clear selection
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInputValue('');
    onChange('');
    setIsOpen(true);
    inputRef.current?.focus();
  };

  // Close dropdown and reconcile text to a valid district
  const handleClose = () => {
    setIsOpen(false);
    const trimmed = inputValue.trim().toLowerCase();
    if (!trimmed) {
      onChange('');
      setInputValue('');
      return;
    }

    // Check if what user typed matches one of the 25 districts
    const exactMatch = SRI_LANKA_DISTRICTS_WITH_PROVINCE.find(
      (d) => d.name.toLowerCase() === trimmed
    );

    if (exactMatch) {
      setInputValue(exactMatch.name);
      onChange(exactMatch.name);
    } else {
      // Revert to previously selected value if invalid input was typed
      setInputValue(value || '');
    }
  };

  // Handle click outside to close and validate
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, inputValue, value]);

  // Keyboard navigation on the input field
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < filteredDistricts.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredDistricts.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredDistricts[highlightedIndex]) {
          handleSelect(filteredDistricts[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setInputValue(value || '');
        setIsOpen(false);
        break;
      case 'Tab':
        handleClose();
        break;
      default:
        break;
    }
  };

  return (
    <div ref={containerRef} className={`w-full space-y-1.5 relative ${className}`}>
      {label && (
        <label htmlFor={selectId} className="block text-xs font-medium text-slate-700">
          {label}
        </label>
      )}

      {/* Single Unified Input Combobox */}
      <div className="relative flex items-center">
        {/* Left MapPin Icon */}
        <div className="absolute left-3 text-slate-400 pointer-events-none">
          <MapPin className={`w-4 h-4 ${value ? 'text-[#01A8F3]' : 'text-slate-400'}`} />
        </div>

        {/* The single text input for both display and search */}
        <input
          id={selectId}
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={disabled}
          required={required}
          value={inputValue}
          placeholder={placeholder}
          onFocus={() => setIsOpen(true)}
          onClick={() => setIsOpen(true)}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className={`w-full bg-white border ${
            error
              ? 'border-red-500 focus:border-red-600 focus:ring-red-500/20'
              : isOpen
              ? 'border-[#01A8F3] ring-2 ring-[#01A8F3]/20'
              : 'border-slate-300 hover:border-slate-400'
          } rounded-lg py-2 pl-9 pr-14 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors shadow-2xs ${
            disabled ? 'bg-slate-100 cursor-not-allowed opacity-60' : ''
          }`}
        />

        {/* Right side controls: Clear 'X' button & Chevron toggle */}
        <div className="absolute right-2.5 flex items-center gap-1 text-slate-400">
          {inputValue && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={() => {
              if (isOpen) {
                handleClose();
              } else {
                setIsOpen(true);
                inputRef.current?.focus();
              }
            }}
            className="p-1 hover:text-slate-600 rounded-full transition-colors cursor-pointer"
            aria-label="Toggle district list"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#01A8F3]' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Floating Options Dropdown (No nested search input - pure district selection) */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header count indicator */}
          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>
              {filteredDistricts.length === 25
                ? 'All 25 Sri Lankan Districts'
                : `${filteredDistricts.length} matching district${filteredDistricts.length === 1 ? '' : 's'}`}
            </span>
            <span className="text-[10px] text-slate-400 hidden sm:inline">Press ↑↓ to navigate, Enter to select</span>
          </div>

          {/* District Options List */}
          <ul
            ref={listRef}
            role="listbox"
            className="max-h-56 overflow-y-auto p-1 divide-y divide-slate-50 focus:outline-none text-xs"
          >
            {filteredDistricts.length === 0 ? (
              <li className="p-3 text-center text-slate-400 text-xs">
                No district matches "{inputValue}".
              </li>
            ) : (
              filteredDistricts.map((district, index) => {
                const isSelected = district.name.toLowerCase() === value.toLowerCase();
                const isHighlighted = index === highlightedIndex;

                return (
                  <li
                    key={district.name}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(district)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#E8F7FE] text-[#0188C7] font-semibold'
                        : isHighlighted
                        ? 'bg-slate-100 text-slate-900 font-medium'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{district.name}</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        ({district.province} Province)
                      </span>
                    </div>

                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-[#01A8F3] shrink-0" />
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}

      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
      {helperText && !error && <p className="text-xs text-slate-400">{helperText}</p>}
    </div>
  );
};
