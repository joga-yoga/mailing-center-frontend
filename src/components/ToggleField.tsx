import React from 'react';
import { FormField } from './FormField';

interface ToggleFieldProps {
  label: string;
  name: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  hint?: string;
}

export const ToggleField: React.FC<ToggleFieldProps> = ({
  label,
  name,
  checked,
  onChange,
  error,
  hint,
}) => {
  return (
    <FormField
      label=""
      htmlFor={name}
      error={error}
      hint={hint}
    >
      <div className="checkbox-group">
        <input
          type="checkbox"
          id={name}
          name={name}
          checked={checked}
          onChange={onChange}
        />
        <label htmlFor={name} style={{ marginBottom: 0, cursor: 'pointer' }}>
          {label}
        </label>
      </div>
    </FormField>
  );
};
