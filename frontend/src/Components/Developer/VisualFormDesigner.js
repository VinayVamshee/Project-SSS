import React, { useState, useMemo } from 'react';
import './VisualFormDesigner.css';

export default function VisualFormDesigner({
  newTemplate,
  setNewTemplate,
  fields: masterFields,
  entities,
  onSave,
  onPublish,
  editingTemplateId,
  setEditingTemplateId
}) {
  // Navigation / Viewport Modes
  const [viewportMode, setViewportMode] = useState('desktop'); // desktop, tablet, mobile
  const [isPreview, setIsPreview] = useState(false);

  // Undo / Redo History Stacks
  const [history, setHistory] = useState([]);
  const [redoHistory, setRedoHistory] = useState([]);

  // Search filter for fields library
  const [librarySearch, setLibrarySearch] = useState('');

  // Selected item tracking for Right Sidebar Inspector
  // type: 'section' | 'field' | null
  const [inspectorSelection, setInspectorSelection] = useState(null);

  // HTML5 Drag States
  const [draggedItem, setDraggedItem] = useState(null); // { type: 'library-field' | 'canvas-field' | 'section', payload: ... }
  const [dragOverSectionIndex, setDragOverSectionIndex] = useState(null);
  const [dragOverFieldIndex, setDragOverFieldIndex] = useState(null); // Index within section fields

  // Helper to deep copy template
  const cloneTemplate = (tpl) => JSON.parse(JSON.stringify(tpl));

  // Commit a change to state with history snapshot
  const commitChange = (updatedTemplate) => {
    setHistory((prev) => [...prev, cloneTemplate(newTemplate)]);
    setRedoHistory([]);
    setNewTemplate(updatedTemplate);
  };

  // Undo Action
  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setRedoHistory((prev) => [...prev, cloneTemplate(newTemplate)]);
    setNewTemplate(previous);
  };

  // Redo Action
  const handleRedo = () => {
    if (redoHistory.length === 0) return;
    const next = redoHistory[redoHistory.length - 1];
    setRedoHistory((prev) => prev.slice(0, -1));
    setHistory((prev) => [...prev, cloneTemplate(newTemplate)]);
    setNewTemplate(next);
  };

  // --- Left Sidebar Section Handlers ---
  const handleAddSection = () => {
    const tpl = cloneTemplate(newTemplate);
    const order = (tpl.sections || []).length + 1;
    const newSec = {
      label: `Section ${order}`,
      description: '',
      icon: 'fa-folder',
      order,
      collapsible: false,
      collapsedByDefault: false,
      fields: []
    };
    tpl.sections = [...(tpl.sections || []), newSec];
    commitChange(tpl);
    setInspectorSelection({ type: 'section', sectionIndex: tpl.sections.length - 1 });
  };

  const handleDeleteSection = (index, e) => {
    e.stopPropagation();
    const tpl = cloneTemplate(newTemplate);
    tpl.sections = tpl.sections.filter((_, idx) => idx !== index);
    // Reorder indices
    tpl.sections.forEach((sec, idx) => {
      sec.order = idx + 1;
    });
    tpl.fields = tpl.sections.flatMap((s) => s.fields || []);
    commitChange(tpl);
    setInspectorSelection(null);
  };

  const handleDeleteField = (sIdx, fIdx) => {
    const tpl = cloneTemplate(newTemplate);
    tpl.sections[sIdx].fields.splice(fIdx, 1);
    // Reorder indices
    tpl.sections[sIdx].fields.forEach((f, idx) => {
      f.order = idx + 1;
    });
    tpl.fields = tpl.sections.flatMap((s) => s.fields || []);
    commitChange(tpl);
    setInspectorSelection(null);
  };

  // --- Field Drag & Drop Handlers ---
  const handleDragStart = (e, type, payload) => {
    setDraggedItem({ type, payload });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverSectionIndex(null);
    setDragOverFieldIndex(null);
  };

  const handleDragOverSection = (e, sIdx) => {
    e.preventDefault();
    if (draggedItem?.type === 'section') return;
    if (dragOverSectionIndex !== sIdx) {
      setDragOverSectionIndex(sIdx);
    }
  };

  const handleDragOverField = (e, sIdx, fIdx) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedItem?.type === 'section') return;
    if (dragOverSectionIndex !== sIdx || dragOverFieldIndex !== fIdx) {
      setDragOverSectionIndex(sIdx);
      setDragOverFieldIndex(fIdx);
    }
  };

  const handleDropOnSection = (e, sIdx) => {
    e.preventDefault();
    if (!draggedItem) return;

    const tpl = cloneTemplate(newTemplate);
    const targetSection = tpl.sections[sIdx];
    if (!targetSection) return;

    if (draggedItem.type === 'library-field') {
      const fieldId = draggedItem.payload._id;
      // Prevent duplicates in template
      const alreadyExists = tpl.sections.some((s) =>
        (s.fields || []).some((f) => f.fieldId === fieldId)
      );
      if (alreadyExists) return;

      const newField = {
        fieldId,
        order: (targetSection.fields || []).length + 1,
        required: false,
        unique: false,
        readOnly: false,
        hidden: false,
        width: 12,
        placeholder: '',
        helperText: '',
        defaultValue: '',
        validation: {
          min: undefined,
          max: undefined,
          minLength: undefined,
          maxLength: undefined,
          pattern: '',
          message: ''
        }
      };

      if (dragOverFieldIndex !== null) {
        targetSection.fields.splice(dragOverFieldIndex, 0, newField);
      } else {
        targetSection.fields = [...(targetSection.fields || []), newField];
      }

      // Recalculate orders
      targetSection.fields.forEach((f, idx) => {
        f.order = idx + 1;
      });
      tpl.fields = tpl.sections.flatMap((s) => s.fields || []);
      commitChange(tpl);
      setInspectorSelection({ type: 'field', sectionIndex: sIdx, fieldIndex: dragOverFieldIndex !== null ? dragOverFieldIndex : targetSection.fields.length - 1 });

    } else if (draggedItem.type === 'canvas-field') {
      const { sourceSectionIndex, sourceFieldIndex } = draggedItem.payload;
      const sourceSection = tpl.sections[sourceSectionIndex];
      const [movedField] = sourceSection.fields.splice(sourceFieldIndex, 1);

      if (sourceSectionIndex === sIdx) {
        // Same section reorder
        let insertAt = dragOverFieldIndex !== null ? dragOverFieldIndex : targetSection.fields.length;
        targetSection.fields.splice(insertAt, 0, movedField);
      } else {
        // Different section move
        let insertAt = dragOverFieldIndex !== null ? dragOverFieldIndex : targetSection.fields.length;
        targetSection.fields.splice(insertAt, 0, movedField);
      }

      // Re-order index mappings
      sourceSection.fields.forEach((f, idx) => { f.order = idx + 1; });
      targetSection.fields.forEach((f, idx) => { f.order = idx + 1; });
      tpl.fields = tpl.sections.flatMap((s) => s.fields || []);

      commitChange(tpl);
      setInspectorSelection({ type: 'field', sectionIndex: sIdx, fieldIndex: targetSection.fields.findIndex(f => f.fieldId === movedField.fieldId) });
    }

    handleDragEnd();
  };

  // --- Drag reordering for Sections ---
  const handleSectionDrop = (e, targetIdx) => {
    e.preventDefault();
    if (draggedItem?.type !== 'section') return;

    const sourceIdx = draggedItem.payload;
    if (sourceIdx === targetIdx) return;

    const tpl = cloneTemplate(newTemplate);
    const [movedSection] = tpl.sections.splice(sourceIdx, 1);
    tpl.sections.splice(targetIdx, 0, movedSection);

    // Reassign order properties
    tpl.sections.forEach((sec, idx) => {
      sec.order = idx + 1;
    });
    tpl.fields = tpl.sections.flatMap((s) => s.fields || []);

    commitChange(tpl);
    setInspectorSelection({ type: 'section', sectionIndex: targetIdx });
    handleDragEnd();
  };

  // --- Inspector Live Change Handlers ---
  const handleSectionPropertyChange = (property, value) => {
    if (inspectorSelection?.type !== 'section') return;
    const { sectionIndex } = inspectorSelection;

    const tpl = cloneTemplate(newTemplate);
    tpl.sections[sectionIndex][property] = value;
    commitChange(tpl);
  };

  const handleFieldPropertyChange = (property, value, isValidation = false) => {
    if (inspectorSelection?.type !== 'field') return;
    const { sectionIndex, fieldIndex } = inspectorSelection;

    const tpl = cloneTemplate(newTemplate);
    if (isValidation) {
      if (!tpl.sections[sectionIndex].fields[fieldIndex].validation) {
        tpl.sections[sectionIndex].fields[fieldIndex].validation = {};
      }
      tpl.sections[sectionIndex].fields[fieldIndex].validation[property] = value;
    } else {
      tpl.sections[sectionIndex].fields[fieldIndex][property] = value;
    }
    tpl.fields = tpl.sections.flatMap((s) => s.fields || []);
    commitChange(tpl);
  };

  // Memoized maps and filtered library
  const libraryFieldsMap = useMemo(() => {
    const map = {};
    (masterFields || []).forEach((f) => { map[f._id] = f; });
    return map;
  }, [masterFields]);

  const filteredLibraryFields = useMemo(() => {
    const usedFieldIds = new Set(
      (newTemplate.sections || []).flatMap((s) => (s.fields || []).map((f) => f.fieldId))
    );
    return (masterFields || [])
      .filter((f) => !usedFieldIds.has(f._id))
      .filter((f) =>
        f.label.toLowerCase().includes(librarySearch.toLowerCase()) ||
        f.key.toLowerCase().includes(librarySearch.toLowerCase())
      );
  }, [masterFields, newTemplate.sections, librarySearch]);

  const selectedInspectorElement = useMemo(() => {
    if (!inspectorSelection) return null;
    if (inspectorSelection.type === 'section') {
      return newTemplate.sections[inspectorSelection.sectionIndex] || null;
    }
    if (inspectorSelection.type === 'field') {
      const sec = newTemplate.sections[inspectorSelection.sectionIndex];
      return sec?.fields[inspectorSelection.fieldIndex] || null;
    }
    return null;
  }, [inspectorSelection, newTemplate.sections]);

  // Width Presets Mapper
  const widthPresets = [
    { label: 'Full Width', columns: 12, visual: '████████████' },
    { label: 'Two Thirds', columns: 8, visual: '████████░░░░' },
    { label: 'Half Width', columns: 6, visual: '██████░░░░░░' },
    { label: 'One Third', columns: 4, visual: '████░░░░░░░░' },
    { label: 'Quarter Width', columns: 3, visual: '███░░░░░░░░░' }
  ];

  return (
    <div className="vfd-workspace">
      {/* 1. Header Toolbar */}
      <div className="vfd-toolbar">
        <div className="vfd-toolbar-left">
          <span className="vfd-toolbar-title">
            <i className="fa-solid fa-pen-nib text-primary me-2"></i>
            Form Layout Canvas
          </span>
        </div>

        <div className="vfd-toolbar-center">
          <button
            type="button"
            className={`vfd-viewport-btn ${viewportMode === 'desktop' ? 'active' : ''}`}
            onClick={() => setViewportMode('desktop')}
          >
            <i className="fa-solid fa-desktop"></i> Desktop
          </button>
          <button
            type="button"
            className={`vfd-viewport-btn ${viewportMode === 'tablet' ? 'active' : ''}`}
            onClick={() => setViewportMode('tablet')}
          >
            <i className="fa-solid fa-tablet-screen-button"></i> Tablet
          </button>
          <button
            type="button"
            className={`vfd-viewport-btn ${viewportMode === 'mobile' ? 'active' : ''}`}
            onClick={() => setViewportMode('mobile')}
          >
            <i className="fa-solid fa-mobile-button"></i> Mobile
          </button>
        </div>

        <div className="vfd-toolbar-right">
          <button
            type="button"
            className="btn btn-sm btn-light border py-1"
            disabled={history.length === 0}
            onClick={handleUndo}
            title="Undo"
          >
            <i className="fa-solid fa-arrow-rotate-left"></i>
          </button>
          <button
            type="button"
            className="btn btn-sm btn-light border py-1"
            disabled={redoHistory.length === 0}
            onClick={handleRedo}
            title="Redo"
          >
            <i className="fa-solid fa-arrow-rotate-right"></i>
          </button>
          <button
            type="button"
            className={`btn btn-sm py-1 ${isPreview ? 'btn-info' : 'btn-outline-info'}`}
            onClick={() => setIsPreview(!isPreview)}
          >
            <i className="fa-solid fa-eye me-1"></i> {isPreview ? 'Design View' : 'Live Preview'}
          </button>
          {editingTemplateId && (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary py-1"
              onClick={() => {
                setEditingTemplateId(null);
                setNewTemplate({
                  key: '',
                  label: '',
                  description: '',
                  entity: '',
                  purpose: '',
                  scope: 'global',
                  schools: [],
                  fields: [],
                  sections: []
                });
              }}
            >
              Cancel
            </button>
          )}
          <button type="button" className="btn btn-sm btn-save py-1 ms-2" onClick={onSave}>
            Save Draft
          </button>
          {onPublish && (
            <button type="button" className="btn btn-sm btn-success py-1" onClick={onPublish}>
              Publish
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Workspace Layout panels */}
      <div className="vfd-panels">
        {/* Left Sidebar */}
        {!isPreview && (
          <div className="vfd-left-sidebar">
          {/* Section Manager */}
          <div className="vfd-sidebar-section">
            <div className="vfd-sidebar-header">
              <span>Sections</span>
              <button
                type="button"
                className="btn btn-xs btn-primary fw-bold py-0 px-2"
                onClick={handleAddSection}
              >
                + Add
              </button>
            </div>
            <div className="vfd-sidebar-scroll">
              {(newTemplate.sections || []).length === 0 ? (
                <div className="text-center text-muted small py-4">No sections. Add one.</div>
              ) : (
                (newTemplate.sections || []).map((sec, idx) => (
                  <div
                    key={idx}
                    draggable
                    onDragStart={(e) => handleDragStart(e, 'section', idx)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleSectionDrop(e, idx)}
                    className={`vfd-section-item ${
                      inspectorSelection?.type === 'section' &&
                      inspectorSelection.sectionIndex === idx
                        ? 'active'
                        : ''
                    }`}
                    onClick={() => setInspectorSelection({ type: 'section', sectionIndex: idx })}
                  >
                    <span>
                      <i className={`fas ${sec.icon || 'fa-folder'} text-muted me-2`}></i>
                      {sec.label || `Section ${idx + 1}`}
                    </span>
                    <button
                      type="button"
                      className="btn btn-link text-danger p-0 border-0"
                      onClick={(e) => handleDeleteSection(idx, e)}
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Reusable Fields Catalog Library */}
          <div className="vfd-sidebar-section">
            <div className="vfd-sidebar-header">
              <span>Field Library</span>
            </div>
            <div className="p-2 border-bottom">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Search catalog..."
                value={librarySearch}
                onChange={(e) => setLibrarySearch(e.target.value)}
              />
            </div>
            <div className="vfd-sidebar-scroll">
              {filteredLibraryFields.length === 0 ? (
                <div className="text-center text-muted small py-4">No fields available.</div>
              ) : (
                filteredLibraryFields.map((f) => (
                  <div
                    key={f._id}
                    className="vfd-field-card"
                    draggable
                    onDragStart={(e) => handleDragStart(e, 'library-field', f)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="vfd-field-card-header">
                      <i className="fa-solid fa-grip-vertical text-muted"></i>
                      <span>{f.label}</span>
                    </div>
                    <span className="vfd-field-card-type">{f.type}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        )}

        {/* Center Panel (Visual Canvas) */}
        <div className={`vfd-canvas-container ${viewportMode}`}>
          <div className="vfd-canvas">
            <div className="vfd-canvas-title">{newTemplate.label || 'Untitled Form Template'}</div>

            {(newTemplate.sections || []).length === 0 ? (
              <div className="vfd-empty-state">
                <i className="fa-solid fa-pen-ruler vfd-empty-icon"></i>
                <h5>No Sections Yet</h5>
                <p className="small mb-3">Create your first layout section to start building.</p>
                <button type="button" className="btn btn-sm btn-primary" onClick={handleAddSection}>
                  Add Section
                </button>
              </div>
            ) : (
              (newTemplate.sections || []).map((sec, sIdx) => {
                const isActiveSection =
                  inspectorSelection?.type === 'section' &&
                  inspectorSelection.sectionIndex === sIdx;
                const isDragOverSec = dragOverSectionIndex === sIdx && dragOverFieldIndex === null;

                return (
                  <div
                    key={sIdx}
                    onDragOver={(e) => handleDragOverSection(e, sIdx)}
                    onDrop={(e) => handleDropOnSection(e, sIdx)}
                    className={`vfd-canvas-section ${isActiveSection ? 'active' : ''} ${
                      isDragOverSec ? 'vfd-section-drag-over' : ''
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setInspectorSelection({ type: 'section', sectionIndex: sIdx });
                    }}
                  >
                    <div className="vfd-canvas-section-header">
                      <i className={`fas ${sec.icon || 'fa-folder'} text-primary`}></i>
                      <span>{sec.label || `Section ${sIdx + 1}`}</span>
                    </div>

                    <div className="vfd-canvas-section-grid">
                      {!(sec.fields && sec.fields.length > 0) ? (
                        <div className="w-100 text-center py-4 text-muted small border border-dashed rounded bg-light">
                          Drag and drop fields from the Library here.
                        </div>
                      ) : (
                        sec.fields.map((field, fIdx) => {
                          const masterF = libraryFieldsMap[field.fieldId];
                          if (!masterF) return null;

                          const isActiveField =
                            inspectorSelection?.type === 'field' &&
                            inspectorSelection.sectionIndex === sIdx &&
                            inspectorSelection.fieldIndex === fIdx;

                          // Map field widths
                          const widthCol = field.width || 12;

                          return (
                            <React.Fragment key={fIdx}>
                              {/* Horizontal Insertion Bar Indicator */}
                              {dragOverSectionIndex === sIdx && dragOverFieldIndex === fIdx && (
                                <div className="w-100">
                                  <div className="vfd-drop-indicator"></div>
                                </div>
                              )}

                              <div
                                className="vfd-canvas-field-wrapper"
                                style={{ width: `${(widthCol / 12) * 100}%` }}
                                draggable
                                onDragStart={(e) =>
                                  handleDragStart(e, 'canvas-field', {
                                    sourceSectionIndex: sIdx,
                                    sourceFieldIndex: fIdx
                                  })
                                }
                                onDragEnd={handleDragEnd}
                                onDragOver={(e) => handleDragOverField(e, sIdx, fIdx)}
                              >
                                <div
                                  className={`vfd-canvas-field-card ${
                                    isActiveField ? 'active' : ''
                                  } ${field.hidden ? 'hidden-field' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setInspectorSelection({
                                      type: 'field',
                                      sectionIndex: sIdx,
                                      fieldIndex: fIdx
                                    });
                                  }}
                                >
                                  <div className="vfd-canvas-field-label">
                                    <span>
                                      {field.label || masterF.label}
                                      {field.required && <span className="text-danger ms-1">*</span>}
                                    </span>
                                    <div className="vfd-badge-row align-items-center">
                                      {field.required && (
                                        <span className="vfd-badge vfd-badge-req">Req</span>
                                      )}
                                      {field.hidden && (
                                        <span className="vfd-badge vfd-badge-hid">Hidden</span>
                                      )}
                                      {!isPreview && (
                                        <button
                                          type="button"
                                          className="btn btn-link text-danger p-0 border-0 ms-2"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteField(sIdx, fIdx);
                                          }}
                                          title="Remove Field"
                                          style={{ fontSize: '0.75rem', lineHeight: 1 }}
                                        >
                                          <i className="fa-solid fa-trash-can"></i>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  {isPreview ? (
                                    <div className="vfd-preview-input-container">
                                      {masterF.type === 'select' || masterF.type === 'lookup' ? (
                                        <select className="form-select form-select-sm" disabled style={{ backgroundColor: 'var(--card-bg-color)', color: 'var(--text-color)' }}>
                                          <option>{field.placeholder || `Select ${field.label || masterF.label}...`}</option>
                                        </select>
                                      ) : masterF.type === 'date' ? (
                                        <input type="date" className="form-control form-control-sm" disabled style={{ backgroundColor: 'var(--card-bg-color)', color: 'var(--text-color)' }} />
                                      ) : masterF.type === 'number' ? (
                                        <input type="number" className="form-control form-control-sm" placeholder={field.placeholder || ''} disabled style={{ backgroundColor: 'var(--card-bg-color)', color: 'var(--text-color)' }} />
                                      ) : (
                                        <input type="text" className="form-control form-control-sm" placeholder={field.placeholder || ''} disabled style={{ backgroundColor: 'var(--card-bg-color)', color: 'var(--text-color)' }} />
                                      )}
                                    </div>
                                  ) : (
                                    <div className="vfd-canvas-field-placeholder">
                                      {field.placeholder || masterF.label}
                                    </div>
                                  )}
                                  {field.helperText && (
                                    <div className="text-muted small mt-1" style={{ fontSize: '0.7rem' }}>
                                      {field.helperText}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </React.Fragment>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Sidebar (Properties Inspector Panel) */}
        {!isPreview && (
          <div className="vfd-right-sidebar">
          <div className="vfd-inspector-title">
            <i className="fa-solid fa-sliders text-muted me-2"></i>
            Properties Inspector
          </div>
          <div className="vfd-inspector-scroll">
            {!selectedInspectorElement ? (
              <div className="text-center text-muted small py-5">
                Select a section or field on the canvas to configure properties.
              </div>
            ) : inspectorSelection.type === 'section' ? (
              <>
                <div className="vfd-inspector-group">
                  <span className="vfd-inspector-group-title">Section Settings</span>
                  <div className="vfd-inspector-control">
                    <label className="vfd-inspector-label">Section Name</label>
                    <input
                      type="text"
                      className="vfd-inspector-input"
                      value={selectedInspectorElement.label || ''}
                      onChange={(e) => handleSectionPropertyChange('label', e.target.value)}
                    />
                  </div>
                  <div className="vfd-inspector-control">
                    <label className="vfd-inspector-label">Description</label>
                    <textarea
                      className="vfd-inspector-input"
                      rows={3}
                      value={selectedInspectorElement.description || ''}
                      onChange={(e) => handleSectionPropertyChange('description', e.target.value)}
                    />
                  </div>
                  <div className="vfd-inspector-control">
                    <label className="vfd-inspector-label">Section Icon (FontAwesome)</label>
                    <input
                      type="text"
                      className="vfd-inspector-input"
                      value={selectedInspectorElement.icon || ''}
                      placeholder="fa-user"
                      onChange={(e) => handleSectionPropertyChange('icon', e.target.value)}
                    />
                  </div>
                  <div className="vfd-toggle-row">
                    <span className="vfd-inspector-label">Collapsible</span>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={!!selectedInspectorElement.collapsible}
                      onChange={(e) => handleSectionPropertyChange('collapsible', e.target.checked)}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="vfd-inspector-group">
                  <span className="vfd-inspector-group-title">General settings</span>
                  <div className="vfd-inspector-control">
                    <label className="vfd-inspector-label">Label Override</label>
                    <input
                      type="text"
                      className="vfd-inspector-input"
                      value={selectedInspectorElement.label || ''}
                      onChange={(e) => handleFieldPropertyChange('label', e.target.value)}
                    />
                  </div>
                </div>

                <div className="vfd-inspector-group">
                  <span className="vfd-inspector-group-title">Layout Width</span>
                  <div className="vfd-width-presets">
                    {widthPresets.map((preset) => (
                      <div
                        key={preset.columns}
                        className={`vfd-width-preset-btn ${
                          selectedInspectorElement.width === preset.columns ? 'active' : ''
                        }`}
                        onClick={() => handleFieldPropertyChange('width', preset.columns)}
                      >
                        <span className="small">{preset.label}</span>
                        <span className="vfd-width-preset-blocks">{preset.visual}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="vfd-inspector-group">
                  <span className="vfd-inspector-group-title">Appearance</span>
                  <div className="vfd-inspector-control">
                    <label className="vfd-inspector-label">Placeholder</label>
                    <input
                      type="text"
                      className="vfd-inspector-input"
                      value={selectedInspectorElement.placeholder || ''}
                      onChange={(e) => handleFieldPropertyChange('placeholder', e.target.value)}
                    />
                  </div>
                  <div className="vfd-inspector-control">
                    <label className="vfd-inspector-label">Helper Text</label>
                    <input
                      type="text"
                      className="vfd-inspector-input"
                      value={selectedInspectorElement.helperText || ''}
                      onChange={(e) => handleFieldPropertyChange('helperText', e.target.value)}
                    />
                  </div>
                  <div className="vfd-inspector-control">
                    <label className="vfd-inspector-label">Default Value</label>
                    <input
                      type="text"
                      className="vfd-inspector-input"
                      value={selectedInspectorElement.defaultValue || ''}
                      onChange={(e) => handleFieldPropertyChange('defaultValue', e.target.value)}
                    />
                  </div>
                </div>

                <div className="vfd-inspector-group">
                  <span className="vfd-inspector-group-title">Behavior settings</span>
                  <div className="vfd-toggle-row">
                    <span className="vfd-inspector-label">Required field</span>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={!!selectedInspectorElement.required}
                      onChange={(e) => handleFieldPropertyChange('required', e.target.checked)}
                    />
                  </div>
                  <div className="vfd-toggle-row mt-2">
                    <span className="vfd-inspector-label">Hidden field</span>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={!!selectedInspectorElement.hidden}
                      onChange={(e) => handleFieldPropertyChange('hidden', e.target.checked)}
                    />
                  </div>
                  <div className="vfd-toggle-row mt-2">
                    <span className="vfd-inspector-label">Read Only</span>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={!!selectedInspectorElement.readOnly}
                      onChange={(e) => handleFieldPropertyChange('readOnly', e.target.checked)}
                    />
                  </div>
                  <div className="vfd-toggle-row mt-2">
                    <span className="vfd-inspector-label">Unique value</span>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={!!selectedInspectorElement.unique}
                      onChange={(e) => handleFieldPropertyChange('unique', e.target.checked)}
                    />
                  </div>
                </div>

                <div className="vfd-inspector-group">
                  <span className="vfd-inspector-group-title">Validation Overrides</span>
                  <div className="vfd-inspector-control">
                    <label className="vfd-inspector-label">Min Length</label>
                    <input
                      type="number"
                      className="vfd-inspector-input"
                      value={selectedInspectorElement.validation?.minLength || ''}
                      onChange={(e) =>
                        handleFieldPropertyChange(
                          'minLength',
                          e.target.value ? parseInt(e.target.value) : undefined,
                          true
                        )
                      }
                    />
                  </div>
                  <div className="vfd-inspector-control">
                    <label className="vfd-inspector-label">Max Length</label>
                    <input
                      type="number"
                      className="vfd-inspector-input"
                      value={selectedInspectorElement.validation?.maxLength || ''}
                      onChange={(e) =>
                        handleFieldPropertyChange(
                          'maxLength',
                          e.target.value ? parseInt(e.target.value) : undefined,
                          true
                        )
                      }
                    />
                  </div>
                  <div className="vfd-inspector-control">
                    <label className="vfd-inspector-label">Custom Regex Pattern</label>
                    <input
                      type="text"
                      className="vfd-inspector-input"
                      value={selectedInspectorElement.validation?.pattern || ''}
                      placeholder="^[A-Z0-9]+$"
                      onChange={(e) =>
                        handleFieldPropertyChange('pattern', e.target.value, true)
                      }
                    />
                  </div>
                  <div className="vfd-inspector-control">
                    <label className="vfd-inspector-label">Error Message</label>
                    <input
                      type="text"
                      className="vfd-inspector-input"
                      value={selectedInspectorElement.validation?.message || ''}
                      onChange={(e) =>
                        handleFieldPropertyChange('message', e.target.value, true)
                      }
                    />
                  </div>
                </div>

                <div className="vfd-inspector-group border-0 mt-3 pt-0">
                  <button
                    type="button"
                    className="btn btn-sm btn-danger w-100 py-2 fw-semibold text-white border-0"
                    style={{ backgroundColor: '#ef4444' }}
                    onClick={() => handleDeleteField(inspectorSelection.sectionIndex, inspectorSelection.fieldIndex)}
                  >
                    <i className="fa-solid fa-trash-can me-2"></i>Remove Field from Layout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
