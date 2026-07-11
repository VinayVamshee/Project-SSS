import React, { useState, useCallback, useEffect, useRef } from 'react';
import DynamicField from './DynamicField';
import './DynamicForm.css';

/**
 * DynamicForm — Universal metadata-driven form engine.
 *
 * Supports modes:
 *   - "create":   Editable inputs, uses default values as initial state
 *   - "edit":     Editable inputs, pre-populated with active values
 *   - "view":     Display-only fields (clean text/labels, no active text boxes)
 *   - "readonly": Display-only fields (same clean presentation style)
 *   - "preview":  Editable inputs with layout metadata previews
 */
export default function DynamicForm({
  template,
  mode = 'create',
  values = {},
  initialValues = {},
  onSubmit,
  onChange,
  submitLabel,
  className = ''
}) {
  const isReadOnly = mode === 'readonly' || mode === 'view';
  const templateRef = useRef(null);
  const valuesRef = useRef(JSON.stringify(values));
  const initValuesRef = useRef(JSON.stringify(initialValues));

  // Compute merged initial form state
  const getInitialData = useCallback((tmpl, init, vals) => {
    const mergedValues = { ...init, ...vals };
    const defaults = {};

    if (tmpl?.sections) {
      tmpl.sections.forEach(sec => {
        (sec.fields || []).forEach(f => {
          if (f.defaultValue !== undefined && f.defaultValue !== null && f.defaultValue !== '') {
            defaults[f.key] = f.defaultValue;
          }
        });
      });
    } else if (tmpl?.fields) {
      // Legacy fallback
      tmpl.fields.forEach(f => {
        if (f.defaultValue !== undefined && f.defaultValue !== null && f.defaultValue !== '') {
          defaults[f.key] = f.defaultValue;
        }
      });
    }

    return { ...defaults, ...mergedValues };
  }, []);

  const [formData, setFormData] = useState(() => getInitialData(template, initialValues, values));

  // Sync form data only when template identity or values content actually changes.
  // Using refs + JSON comparison prevents infinite loops from unstable object references
  // (e.g. parent passing values={} inline creates a new reference every render).
  useEffect(() => {
    const stringifiedValues = JSON.stringify(values);
    const stringifiedInitValues = JSON.stringify(initialValues);
    const templateChanged = template !== templateRef.current;
    const valuesChanged = stringifiedValues !== valuesRef.current;
    const initValuesChanged = stringifiedInitValues !== initValuesRef.current;

    if (templateChanged || valuesChanged || initValuesChanged) {
      templateRef.current = template;
      valuesRef.current = stringifiedValues;
      initValuesRef.current = stringifiedInitValues;
      setFormData(getInitialData(template, initialValues, values));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, values, initialValues]);

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

  if (!template) {
    return null;
  }

  // Normalize structure: wrap fields in a single unnamed section if sections array is missing
  let sections = [];
  if (template.sections && template.sections.length > 0) {
    sections = template.sections;
  } else if (template.fields && template.fields.length > 0) {
    sections = [{
      label: '',
      description: '',
      icon: '',
      order: 1,
      fields: template.fields
    }];
  }

  if (sections.length === 0) {
    return null;
  }

  // Submit button label
  const btnLabel = submitLabel
    || (mode === 'preview' ? 'Test Submit Form'
      : mode === 'create' ? 'Create'
        : mode === 'edit' ? 'Save Changes'
          : 'Submit');

  return (
    <form
      className={`dynamic-form df-${mode} ${className}`}
      onSubmit={handleSubmit}
      noValidate
    >
      <div className="df-sections-container d-flex flex-column gap-4">
        {sections.map((section, sIdx) => {
          const visibleFields = (section.fields || []).filter(f => {
            // Show hidden fields only in preview mode
            return !f.hidden || mode === 'preview';
          });

          if (visibleFields.length === 0) return null;

          return (
            <div key={section._id || sIdx} className="df-section-card p-4 rounded border shadow-sm">
              {section.label && (
                <div className="df-section-header mb-4 pb-2 border-bottom d-flex align-items-center justify-content-between">
                  <div>
                    <h5 className="df-section-title fw-bold mb-1 d-flex align-items-center gap-2">
                      {section.icon && <i className={`fas ${section.icon} text-primary`}></i>}
                      {section.label}
                    </h5>
                    {section.description && (
                      <p className="df-section-description text-muted small mb-0">{section.description}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="row g-4">
                {visibleFields.map(field => (
                  <div
                    key={field.fieldId || field.key}
                    className={`col-${field.width || 12} dynamic-form__field-wrapper`}
                    style={field.hidden ? { display: 'none' } : undefined}
                  >
                    <DynamicField
                      field={field}
                      value={formData[field.key]}
                      onChange={handleFieldChange}
                      readOnly={isReadOnly || field.readOnly}
                      mode={mode}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action buttons (hidden in read-only / view modes) */}
      {!isReadOnly && (
        <div className="col-12 pt-4 text-end">
          <button type="submit" className="df-submit-btn px-4 py-2 fw-bold text-white border-0 rounded">
            {btnLabel}
          </button>
        </div>
      )}
    </form>
  );
}
