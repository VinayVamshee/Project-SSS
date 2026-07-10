import React from 'react';
import LookupField from './LookupField';
import SelectField from './SelectField';
import MultiSelectField from './MultiSelectField';
import FileField from './FileField';
import ImageField from './ImageField';

/**
 * DynamicField — Renders a single form field based on its type.
 *
 * Completely generic. No module-specific logic.
 *
 * Props:
 *   field    – Field definition object from the template
 *   value    – Current value from form state
 *   onChange – Callback: (fieldKey, newValue) => void
 *   readOnly – Whether the field is read-only
 *   mode     – Form mode: "preview" | "create" | "edit" | "readonly"
 */
export default function DynamicField({ field, value, onChange, readOnly, mode }) {
  const { key, label, type, placeholder, required, options, lookup, helperText } = field;

  const handleChange = (val) => onChange(key, val);

  // ─── Label ────────────────────────────────────────────────────────────────────
  const renderLabel = () => (
    <label className="df-label">
      {label} {required && <span className="df-required">*</span>}
    </label>
  );

  const renderHelperText = () => {
    if (!helperText) return null;
    return <div className="form-text text-muted small mt-1" style={{ fontSize: '0.78rem' }}>{helperText}</div>;
  };

  // ─── Text / Email / Phone / Password / Number / Currency / Date / DateTime / Time
  if (['text', 'email', 'phone', 'password', 'number', 'currency', 'date', 'datetime', 'time'].includes(type)) {
    const inputType =
      type === 'currency' || type === 'number' ? 'number'
        : type === 'datetime' ? 'datetime-local'
          : type;

    return (
      <>
        {renderLabel()}
        <input
          type={inputType}
          className="form-control df-input"
          placeholder={placeholder || `Enter ${label}`}
          required={required}
          readOnly={readOnly}
          value={value || ''}
          onChange={e => handleChange(e.target.value)}
        />
        {renderHelperText()}
      </>
    );
  }

  // ─── Textarea ─────────────────────────────────────────────────────────────────
  if (type === 'textarea') {
    return (
      <>
        {renderLabel()}
        <textarea
          className="form-control df-textarea"
          placeholder={placeholder}
          required={required}
          readOnly={readOnly}
          value={value || ''}
          onChange={e => handleChange(e.target.value)}
          rows={3}
        />
        {renderHelperText()}
      </>
    );
  }

  // ─── Select ───────────────────────────────────────────────────────────────────
  if (type === 'select') {
    return (
      <>
        {renderLabel()}
        <SelectField
          options={options}
          value={value}
          onChange={handleChange}
          required={required}
          readOnly={readOnly}
        />
        {renderHelperText()}
      </>
    );
  }

  // ─── Multi-Select ─────────────────────────────────────────────────────────────
  if (type === 'multiselect') {
    return (
      <>
        {renderLabel()}
        <MultiSelectField
          options={options}
          value={value}
          onChange={handleChange}
          required={required}
          readOnly={readOnly}
        />
        {renderHelperText()}
      </>
    );
  }

  // ─── Radio ────────────────────────────────────────────────────────────────────
  if (type === 'radio') {
    return (
      <>
        {renderLabel()}
        <div className="d-flex gap-3 pt-1">
          {options?.map(o => (
            <div key={o.value} className="form-check">
              <input
                type="radio"
                name={key}
                id={`${key}-${o.value}`}
                className="form-check-input"
                value={o.value}
                checked={value === o.value}
                onChange={e => handleChange(e.target.value)}
                required={required}
                disabled={readOnly}
              />
              <label htmlFor={`${key}-${o.value}`} className="form-check-label small">{o.label}</label>
            </div>
          ))}
        </div>
        {renderHelperText()}
      </>
    );
  }

  // ─── Checkbox ─────────────────────────────────────────────────────────────────
  if (type === 'checkbox') {
    return (
      <>
        {renderLabel()}
        <div className="form-check pt-1">
          <input
            type="checkbox"
            className="form-check-input"
            checked={!!value}
            onChange={e => handleChange(e.target.checked)}
            required={required}
            disabled={readOnly}
          />
          <span className="small text-muted">Confirm selection</span>
        </div>
        {renderHelperText()}
      </>
    );
  }

  // ─── Switch ───────────────────────────────────────────────────────────────────
  if (type === 'switch') {
    return (
      <>
        {renderLabel()}
        <div className="form-check form-switch pt-1">
          <input
            type="checkbox"
            className="form-check-input"
            checked={!!value}
            onChange={e => handleChange(e.target.checked)}
            required={required}
            disabled={readOnly}
          />
          <span className="small text-muted">Toggle Switch Status</span>
        </div>
        {renderHelperText()}
      </>
    );
  }

  // ─── Lookup ───────────────────────────────────────────────────────────────────
  if (type === 'lookup') {
    return (
      <>
        {renderLabel()}
        <LookupField
          fieldKey={key}
          lookup={lookup}
          value={value}
          onChange={handleChange}
          readOnly={readOnly}
        />
        {renderHelperText()}
      </>
    );
  }

  // ─── File ─────────────────────────────────────────────────────────────────────
  if (type === 'file') {
    return (
      <>
        {renderLabel()}
        <FileField
          fieldKey={key}
          value={value}
          onChange={handleChange}
          required={required}
          readOnly={readOnly}
        />
        {renderHelperText()}
      </>
    );
  }

  // ─── Image ────────────────────────────────────────────────────────────────────
  if (type === 'image') {
    return (
      <>
        {renderLabel()}
        <ImageField
          fieldKey={key}
          value={value}
          onChange={handleChange}
          required={required}
          readOnly={readOnly}
        />
        {renderHelperText()}
      </>
    );
  }

  // ─── Fallback ─────────────────────────────────────────────────────────────────
  return (
    <>
      {renderLabel()}
      <input
        type="text"
        className="form-control df-input"
        placeholder={placeholder || `Enter ${label}`}
        required={required}
        readOnly={readOnly}
        value={value || ''}
        onChange={e => handleChange(e.target.value)}
      />
      {renderHelperText()}
    </>
  );
}
