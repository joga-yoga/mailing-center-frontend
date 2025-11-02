import React, { useState, useRef, useEffect } from 'react';
import { FormField } from './FormField';
import './ObjectTypeSelect.css';
import { buildApiUrl, API_ENDPOINTS } from '../config/api';

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

// Helper function to format object type label (convert snake_case to Title Case)
const formatObjectTypeLabel = (type: string): string => {
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

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
  const [objectTypes, setObjectTypes] = useState<ObjectTypeOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch object types from API
  useEffect(() => {
    const fetchObjectTypes = async () => {
      setIsLoading(true);
      const response = await fetch(buildApiUrl(API_ENDPOINTS.b2bStats));
      if (response.ok) {
        const data = await response.json();
        const typeNames: string[] = data.types || [];
        const typesList: ObjectTypeOption[] = typeNames
          .sort((a, b) => a.localeCompare(b))
          .map(type => ({
            value: type,
            label: formatObjectTypeLabel(type),
            sendValue: type,
          }));
        setObjectTypes(typesList);
      }
      setIsLoading(false);
    };
    fetchObjectTypes();
  }, []);

  // Find selected option
  useEffect(() => {
    if (isLoading) return;
    
    if (value) {
      const option = objectTypes.find(o => o.sendValue === value);
      setSelectedOption(option || null);
    } else {
      setSelectedOption(null);
    }
  }, [value, objectTypes, isLoading]);

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
            {isLoading ? (
              <div className="object-type-option">
                <span className="object-type-label">Loading...</span>
              </div>
            ) : objectTypes.length === 0 ? (
              <div className="object-type-option">
                <span className="object-type-label">No object types available</span>
              </div>
            ) : (
              objectTypes.map((option) => (
                <div
                  key={option.value}
                  className="object-type-option"
                  onClick={() => handleSelect(option)}
                >
                  <span className="object-type-label">{option.label}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </FormField>
  );
};
