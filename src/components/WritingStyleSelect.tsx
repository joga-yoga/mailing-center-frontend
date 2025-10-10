import React, { useState, useRef, useEffect } from 'react';
import { FormField } from './FormField';
import './WritingStyleSelect.css';

interface StyleOption {
  value: string;
  label: string;
}

interface WritingStyleSelectProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  placeholder?: string;
}

const STYLE_OPTIONS: StyleOption[] = [
  { value: 'short', label: 'Short' },
  { value: 'storytelling', label: 'Storytelling' },
  { value: 'question_centric', label: 'Question Centric' },
  { value: 'compliment_first', label: 'Compliment First' },
  { value: 'conversational', label: 'Conversational' },
  { value: 'structured', label: 'Structured' },
];

export const WritingStyleSelect: React.FC<WritingStyleSelectProps> = ({
  label,
  name,
  value,
  onChange,
  error,
  hint,
  required = false,
  placeholder = "Select writing style...",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<StyleOption | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Find selected option
  useEffect(() => {
    if (value) {
      const option = STYLE_OPTIONS.find(o => o.value === value);
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

  const handleSelect = (option: StyleOption) => {
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
      <div className="writing-style-select-wrapper" ref={dropdownRef}>
        <div
          className={`writing-style-select-display ${error ? 'error' : ''} ${isOpen ? 'open' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          {selectedOption ? (
            <span className="writing-style-option">
              <span className="writing-style-label">{selectedOption.label}</span>
            </span>
          ) : (
            <span className="placeholder">{placeholder}</span>
          )}
          <span className="dropdown-arrow">▼</span>
        </div>

        {isOpen && (
          <div className="writing-style-dropdown">
            {STYLE_OPTIONS.map((option) => (
              <div
                key={option.value}
                className="writing-style-option"
                onClick={() => handleSelect(option)}
              >
                <span className="writing-style-label">{option.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </FormField>
  );
};

