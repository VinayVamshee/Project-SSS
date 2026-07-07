import React from 'react';

/**
 * SelectField — Renders a standard dropdown select.
 *
 * Props:
 *   options  – Array of { value, label }
 *   value    – Currently selected value
 *   onChange – Callback: (newValue) => void
 *   required – Is this field required?
 *   readOnly – Is this field read-only?
 */
export default function SelectField({ options, value, onChange, required, readOnly }) {
  return (
    <select
      className="form-select df-select"
      required={required}
      disabled={readOnly}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
    >
      <option value="">-- Select Option --</option>
      {options?.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
