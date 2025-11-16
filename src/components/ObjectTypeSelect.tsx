import React, { useState, useRef, useEffect } from 'react';
import { FormField } from './FormField';
import './ObjectTypeSelect.css';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';

interface ObjectTypeOption {
  value: string;
  label: string;
  sendValue: string;
}

interface ObjectTypeSelectProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  placeholder?: string;
  selectedCountry?: string; // for filtering types by country
}

// Fallback defaults to show if API isn't available
const DEFAULT_OBJECT_TYPE_OPTIONS: ObjectTypeOption[] = [
  { value: 'yoga_studio', label: 'Yoga Studio', sendValue: 'yoga_studio' },
  { value: 'retreat_center', label: 'Retreat Center', sendValue: 'retreat_center' },
  { value: 'yoga_retreat', label: 'Yoga Retreat', sendValue: 'yoga_retreat' },
];

export const ObjectTypeSelect: React.FC<ObjectTypeSelectProps> = ({
  label,
  name,
  value,
  onChange,
  error,
  hint,
  required = false,
  placeholder = "Select object type...",
  selectedCountry,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<ObjectTypeOption | null>(null);
  const [options, setOptions] = useState<ObjectTypeOption[]>(DEFAULT_OBJECT_TYPE_OPTIONS);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load object types from API (stats.types) and merge with defaults
  useEffect(() => {
    let isMounted = true;
    const loadTypes = async () => {
      try {
        const base = API_ENDPOINTS.b2bStats;
        const qs = new URLSearchParams();
        if (selectedCountry) qs.set('country', selectedCountry);
        qs.set('has_email', 'true');
        const url = buildApiUrl(qs.toString() ? `${base}?${qs.toString()}` : base);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to load types: ${res.status}`);
        const data = await res.json();
        const types: string[] = Array.isArray(data?.types) ? data.types : [];
        // Map to options; label: Title Case
        const apiOptions: ObjectTypeOption[] = types.map((t) => {
          const label = t
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());
          return { value: t, label, sendValue: t };
        });
        // If a country is selected, use API list only.
        // If no country filter, merge defaults with API.
        let finalOptions: ObjectTypeOption[];
        if (selectedCountry) {
          finalOptions = apiOptions;
        } else {
          const mergedMap = new Map<string, ObjectTypeOption>();
          [...DEFAULT_OBJECT_TYPE_OPTIONS, ...apiOptions].forEach((opt) => {
            if (!mergedMap.has(opt.value)) mergedMap.set(opt.value, opt);
          });
          finalOptions = Array.from(mergedMap.values());
        }
        finalOptions.sort((a, b) => a.label.localeCompare(b.label));
        if (isMounted) setOptions(finalOptions);
      } catch (_e) {
        // Keep defaults on error
      }
    };
    loadTypes();
    return () => {
      isMounted = false;
    };
  }, [selectedCountry]);

  // Find selected option
  useEffect(() => {
    if (value) {
      const option = options.find(o => o.sendValue === value);
      setSelectedOption(option || null);
    } else {
      setSelectedOption(null);
    }
  }, [value, options]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option: ObjectTypeOption) => {
    onChange({ target: { name, value: option.sendValue } } as React.ChangeEvent<HTMLSelectElement>);
    setIsOpen(false);
  };

  return (
    <FormField
      label={label}
      htmlFor={name}
      error={error}
      hint={hint}
      required={required}
    >
      <div className="object-type-select-wrapper" ref={dropdownRef}>
        <div
          className={`object-type-select-display ${error ? 'error' : ''} ${isOpen ? 'open' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          {selectedOption ? (
            <span className="object-type-option">
              <span className="object-type-label">{selectedOption.label}</span>
            </span>
          ) : (
            <span className="placeholder">{placeholder}</span>
          )}
          <span className="dropdown-arrow">▼</span>
        </div>

        {isOpen && (
          <div className="object-type-dropdown">
            {options.map((option) => (
              <div
                key={option.value}
                className="object-type-option"
                onClick={() => handleSelect(option)}
              >
                <span className="object-type-label">{option.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </FormField>
  );
};
