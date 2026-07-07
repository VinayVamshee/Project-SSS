import React from 'react';

/**
 * MultiSelectField — Renders a multi-select dropdown.
 *
 * Props:
 *   options  – Array of { value, label }
 *   value    – Currently selected values (array)
 *   onChange – Callback: (newValues) => void
 *   required – Is this field required?
 *   readOnly – Is this field read-only?
 */
export default function MultiSelectField({ options, value, onChange, required, readOnly }) {
  const handleChange = (e) => {
    const values = Array.from(e.target.selectedOptions, option => option.value);
    onChange(values);
  };

  return (
    <select
      multiple
      className="form-select df-select"
      required={required}
      disabled={readOnly}
      value={value || []}
      onChange={handleChange}
      style={{ height: '100px' }}
    >
      {options?.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
