import React, { useState, useRef, useEffect } from 'react';
import { FormField } from './FormField';
import './TovSelect.css';

interface TovOption {
  value: string;
  label: string;
}

interface TovSelectProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  placeholder?: string;
}

const TOV_OPTIONS: TovOption[] = [
  { value: 'casual', label: 'Casual' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'professional', label: 'Professional' },
  { value: 'enthusiastic', label: 'Enthusiastic' },
  { value: 'sincere', label: 'Sincere' },
  { value: 'playful', label: 'Playful' },
];

export const TovSelect: React.FC<TovSelectProps> = ({
  label,
  name,
  value,
  onChange,
  error,
  hint,
  required = false,
  placeholder = "Select tone of voice...",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<TovOption | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Find selected option
  useEffect(() => {
    if (value) {
      const option = TOV_OPTIONS.find(o => o.value === value);
      setSelectedOption(option || null);
    } else {
      setSelectedOption(null);
    }
  }, [value]);

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

  const handleSelect = (option: TovOption) => {
    onChange({ target: { name, value: option.value } } as React.ChangeEvent<HTMLSelectElement>);
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
      <div className="tov-select-wrapper" ref={dropdownRef}>
        <div
          className={`tov-select-display ${error ? 'error' : ''} ${isOpen ? 'open' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          {selectedOption ? (
            <span className="tov-option">
              <span className="tov-label">{selectedOption.label}</span>
            </span>
          ) : (
            <span className="placeholder">{placeholder}</span>
          )}
          <span className="dropdown-arrow">▼</span>
        </div>

        {isOpen && (
          <div className="tov-dropdown">
            {TOV_OPTIONS.map((option) => (
              <div
                key={option.value}
                className="tov-option"
                onClick={() => handleSelect(option)}
              >
                <span className="tov-label">{option.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </FormField>
  );
};

