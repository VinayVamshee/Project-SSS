import React, { useRef } from 'react';

/**
 * FileField — Dedicated file upload component.
 *
 * Props:
 *   fieldKey – The field key
 *   value    – Current filename (string)
 *   onChange – Callback: (filename) => void
 *   required – Is this field required?
 *   readOnly – Is this field read-only?
 */
export default function FileField({ fieldKey, value, onChange, required, readOnly }) {
  const inputRef = useRef(null);

  const handleChange = (e) => {
    const file = e.target.files[0];
    onChange(file?.name || '');
  };

  return (
    <div className="df-file-wrapper">
      <input
        ref={inputRef}
        type="file"
        id={`file-${fieldKey}`}
        style={{ display: 'none' }}
        required={required}
        disabled={readOnly}
        onChange={handleChange}
      />
      <label
        htmlFor={`file-${fieldKey}`}
        className="df-file-label"
        style={readOnly ? { opacity: 0.6, cursor: 'default' } : undefined}
      >
        <i className="fa-solid fa-paperclip"></i>
        {value ? 'Change file...' : 'Choose file...'}
      </label>
      {value && (
        <div className="df-file-name">
          <i className="fa-solid fa-file-lines" style={{ fontSize: '0.75rem' }}></i>
          {value}
        </div>
      )}
    </div>
  );
}
