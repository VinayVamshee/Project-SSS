import React, { useRef } from 'react';

/**
 * ImageField — Dedicated image upload component.
 *
 * Shows a preview thumbnail when an image is selected.
 *
 * Props:
 *   fieldKey – The field key
 *   value    – Current filename (string)
 *   onChange – Callback: (filename) => void
 *   required – Is this field required?
 *   readOnly – Is this field read-only?
 */
export default function ImageField({ fieldKey, value, onChange, required, readOnly }) {
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
        accept="image/*"
        id={`image-${fieldKey}`}
        style={{ display: 'none' }}
        required={required}
        disabled={readOnly}
        onChange={handleChange}
      />
      <label
        htmlFor={`image-${fieldKey}`}
        className="df-file-label"
        style={readOnly ? { opacity: 0.6, cursor: 'default' } : undefined}
      >
        <i className="fa-solid fa-image"></i>
        {value ? 'Change image...' : 'Choose image...'}
      </label>
      {value && (
        <div className="df-file-name">
          <i className="fa-solid fa-image" style={{ fontSize: '0.75rem' }}></i>
          {value}
        </div>
      )}
    </div>
  );
}
