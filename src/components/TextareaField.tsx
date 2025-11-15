import React from 'react';
import { FormField } from './FormField';

interface TextareaFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  rows?: number;
  placeholder?: string;
}

export const TextareaField = React.forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  (
    {
      label,
      name,
      value,
      onChange,
      error,
      hint,
      required = false,
      rows = 4,
      placeholder,
    },
    ref
  ) => {
    return (
      <FormField
        label={label}
        htmlFor={name}
        error={error}
        hint={hint}
        required={required}
      >
        <textarea
          ref={ref}
          id={name}
          name={name}
          className={`form-control ${error ? 'error' : ''}`}
          value={value}
          onChange={onChange}
          rows={rows}
          placeholder={placeholder}
        />
      </FormField>
    );
  }
);
