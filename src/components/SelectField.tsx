import React from 'react';
import { FormField } from './FormField';

interface Option {
  value: string;
  label: string;
}

interface SelectFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: Option[];
  error?: string;
  hint?: string;
  required?: boolean;
  placeholder?: string;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  name,
  value,
  onChange,
  options,
  error,
  hint,
  required = false,
  placeholder,
}) => {
  return (
    <FormField
      label={label}
      htmlFor={name}
      error={error}
      hint={hint}
      required={required}
    >
      <select
        id={name}
        name={name}
        className={`form-control ${error ? 'error' : ''}`}
        value={value}
        onChange={onChange}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FormField>
  );
};
