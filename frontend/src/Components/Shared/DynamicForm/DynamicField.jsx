import React from 'react';
import LookupField from './LookupField';
import SelectField from './SelectField';
import MultiSelectField from './MultiSelectField';
import FileField from './FileField';
import ImageField from './ImageField';

/**
 * DynamicField — Generic field renderer for DynamicForm.
 * Supports clean text display for "view" and "readonly" modes.
 */
export default function DynamicField({ field, value, onChange, readOnly, mode }) {
  const { key, label, type, placeholder, required, options, lookup, helperText } = field;
  const isViewMode = mode === 'view' || mode === 'readonly';

  const handleChange = (val) => onChange(key, val);

  // Helper to format values for display mode
  const getDisplayValue = () => {
    if (value === null || value === undefined || value === '') return '—';
    
    if (type === 'select' || type === 'radio') {
      const selectedOpt = options?.find(o => o === value || o.value === value);
      if (selectedOpt) {
        return typeof selectedOpt === 'object' ? selectedOpt.label : selectedOpt;
      }
    }
    
    if (type === 'multiselect') {
      if (Array.isArray(value)) {
        return value.join(', ');
      }
      return String(value);
    }
    
    if (type === 'checkbox' || type === 'switch') {
      return value ? 'Yes' : 'No';
    }
    
    if (type === 'date' && value) {
      try {
        return new Date(value).toLocaleDateString();
      } catch (e) {
        return String(value);
      }
    }

    if (typeof value === 'object') {
      return value.label || value.name || JSON.stringify(value);
    }

    return String(value);
  };

  const renderLabel = () => (
    <label className="df-label text-muted fw-bold small text-uppercase mb-2">
      {label} {required && !isViewMode && <span className="df-required text-danger ms-1">*</span>}
    </label>
  );

  const renderHelperText = () => {
    if (!helperText || isViewMode) return null;
    return <div className="form-text text-muted small mt-1" style={{ fontSize: '0.78rem' }}>{helperText}</div>;
  };

  // View / Read-only display wrapper (Clean label + plain value text)
  if (isViewMode) {
    if (type === 'image' && value) {
      return (
        <div className="df-view-field d-flex flex-column">
          {renderLabel()}
          <div className="df-image-preview mt-2">
            <img src={value} alt={label} className="img-thumbnail" style={{ maxWidth: '160px', height: 'auto' }} />
          </div>
        </div>
      );
    }

    if (type === 'file' && value) {
      return (
        <div className="df-view-field d-flex flex-column">
          {renderLabel()}
          <div className="mt-1">
            <a href={value} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary mt-1">
              <i className="fa-solid fa-download me-1"></i> Download File
            </a>
          </div>
        </div>
      );
    }

    return (
      <div className="df-view-field d-flex flex-column">
        {renderLabel()}
        <span className="df-view-value fw-semibold text-dark fs-6 mt-1">{getDisplayValue()}</span>
      </div>
    );
  }

  // ─── Editable Modes ──────────────────────────────────────────────────────────

  // Text inputs
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

  // Textarea
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

  // Select
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

  // Multi-select
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

  // Radio
  if (type === 'radio') {
    return (
      <>
        {renderLabel()}
        <div className="d-flex gap-3 pt-1">
          {options?.map(o => {
            const optVal = typeof o === 'object' ? o.value : o;
            const optLbl = typeof o === 'object' ? o.label : o;
            return (
              <div key={optVal} className="form-check">
                <input
                  type="radio"
                  name={key}
                  id={`${key}-${optVal}`}
                  className="form-check-input"
                  value={optVal}
                  checked={value === optVal}
                  onChange={e => handleChange(e.target.value)}
                  required={required}
                  disabled={readOnly}
                />
                <label htmlFor={`${key}-${optVal}`} className="form-check-label small">{optLbl}</label>
              </div>
            );
          })}
        </div>
        {renderHelperText()}
      </>
    );
  }

  // Checkbox
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

  // Switch
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

  // Lookup
  if (type === 'lookup') {
    return (
      <>
        {renderLabel()}
        <LookupField
          fieldKey={key}
          fieldLabel={label}
          lookup={lookup}
          value={value}
          onChange={handleChange}
          readOnly={readOnly}
        />
        {renderHelperText()}
      </>
    );
  }

  // File
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

  // Image
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

  // Fallback
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
