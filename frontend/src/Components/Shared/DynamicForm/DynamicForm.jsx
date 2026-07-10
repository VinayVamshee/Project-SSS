import React, { useState, useCallback, useEffect } from 'react';
import DynamicField from './DynamicField';
import './DynamicForm.css';

/**
 * DynamicForm — The single reusable form engine for the entire application.
 *
 * Props:
 *   template      – The template object from getTemplateForm API
 *                    { template: { key, label }, fields: [...] }
 *   mode          – "preview" | "create" | "edit" | "readonly"
 *   initialValues – Pre-populated field values (for edit mode)
 *   onSubmit      – Callback receiving the form payload on submit
 *   submitLabel   – Custom submit button text (optional)
 *   className     – Additional CSS class for the form wrapper (optional)
 */
export default function DynamicForm({
  template,
  mode = 'preview',
  initialValues = {},
  onSubmit,
  onChange,
  submitLabel,
  className = ''
}) {
  const [formData, setFormData] = useState(() => {
    // Merge initialValues with any defaultValue from field definitions
    const defaults = {};
    if (template?.fields) {
      template.fields.forEach(f => {
        if (f.defaultValue !== undefined && f.defaultValue !== '') {
          defaults[f.key] = f.defaultValue;
        }
      });
    }
    return { ...defaults, ...initialValues };
  });

  // Reset form when template changes
  useEffect(() => {
    const defaults = {};
    if (template?.fields) {
      template.fields.forEach(f => {
        if (f.defaultValue !== undefined && f.defaultValue !== '') {
          defaults[f.key] = f.defaultValue;
        }
      });
    }
    setFormData({ ...defaults, ...initialValues });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template]);

  const isReadOnly = mode === 'readonly';

  const handleFieldChange = useCallback((key, value) => {
    setFormData(prev => {
      const next = { ...prev, [key]: value };
      if (onChange) onChange(next);
      return next;
    });
  }, [onChange]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(formData);
    }
  };

  if (!template || !template.fields) {
    return null;
  }

  const fields = template.fields;

  // Derive submit button label
  const btnLabel = submitLabel
    || (mode === 'preview' ? 'Test Submit Form'
      : mode === 'create' ? 'Create'
        : mode === 'edit' ? 'Save Changes'
          : 'Submit');

  return (
    <form
      className={`dynamic-form ${className}`}
      onSubmit={handleSubmit}
      noValidate
    >
      <div className="row g-3">
        {fields.map(field => {
          // Skip hidden fields in readonly mode display
          if (field.hidden && mode !== 'preview') return null;

          return (
            <div
              key={field.fieldId || field.key}
              className={`col-${field.width || 12} dynamic-form__field-wrapper`}
              style={field.hidden ? { display: 'none' } : undefined}
            >
              <DynamicField
                field={field}
                value={formData[field.key]}
                onChange={handleFieldChange}
                readOnly={isReadOnly || field.readonly}
                mode={mode}
              />
            </div>
          );
        })}
      </div>

      {/* Submit button — hidden in readonly mode */}
      {!isReadOnly && (
        <div className="col-12 pt-3">
          <button type="submit" className="df-submit-btn">
            {btnLabel}
          </button>
        </div>
      )}
    </form>
  );
}
