import React, { useState, useRef, useEffect } from 'react';
import { FormField } from './FormField';
import './ObjectTypeSelect.css';

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
}

const OBJECT_TYPE_OPTIONS: ObjectTypeOption[] = [
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
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<ObjectTypeOption | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Find selected option
  useEffect(() => {
    if (value) {
      const option = OBJECT_TYPE_OPTIONS.find(o => o.sendValue === value);
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
            {OBJECT_TYPE_OPTIONS.map((option) => (
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
