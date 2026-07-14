import React, { useState, useEffect, useCallback } from 'react';
import { getClasses, getSubjects, getClassSubjects, linkClassSubject } from '../../API';

export default function SubjectLinker() {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classLinks, setClassLinks] = useState([]);
  
  const [selectedClass, setSelectedClass] = useState('');
  const [assignedSubjectIds, setAssignedSubjectIds] = useState([]);
  
  // Search query inputs
  const [searchAvailable, setSearchAvailable] = useState('');
  const [searchAssigned, setSearchAssigned] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  const resolveAssignedSubjects = useCallback((classId, linksList) => {
    const link = linksList.find(l => (l.classId?._id || l.classId || '').toString() === classId.toString());
    if (link) {
      const ids = link.subjectIds?.map(s => s._id || s) || [];
      setAssignedSubjectIds(ids);
    } else {
      setAssignedSubjectIds([]);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [clsRes, subRes, linksRes] = await Promise.all([
        getClasses(),
        getSubjects(),
        getClassSubjects()
      ]);
      setClasses(clsRes.data.classes || []);
      setSubjects(subRes.data.subjects || []);
      setClassLinks(linksRes.data.data || []);
      
      if (clsRes.data.classes?.length > 0) {
        const firstClassId = clsRes.data.classes[0]._id;
        setSelectedClass(firstClassId);
        resolveAssignedSubjects(firstClassId, linksRes.data.data || []);
      }
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', text: 'Failed to retrieve linkage mapping lists.' });
    } finally {
      setLoading(false);
    }
  }, [resolveAssignedSubjects]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleClassChange = (classId) => {
    setSelectedClass(classId);
    setFeedback({ type: '', text: '' });
    resolveAssignedSubjects(classId, classLinks);
  };

  const handleLinkSelected = async () => {
    if (!selectedClass) return;
    try {
      setSaving(true);
      await linkClassSubject(selectedClass, assignedSubjectIds);
      setFeedback({ type: 'success', text: 'Subject linkage mapping saved successfully!' });
      // Reload mappings
      const linksRes = await getClassSubjects();
      setClassLinks(linksRes.data.data || []);
    } catch (err) {
      setFeedback({ type: 'danger', text: err.response?.data?.message || 'Failed to link subjects.' });
    } finally {
      setSaving(false);
    }
  };

  // Add a subject to the assigned list
  const addSubjectId = (id) => {
    if (!assignedSubjectIds.includes(id)) {
      setAssignedSubjectIds([...assignedSubjectIds, id]);
    }
  };

  // Remove a subject from the assigned list
  const removeSubjectId = (id) => {
    setAssignedSubjectIds(assignedSubjectIds.filter(item => item !== id));
  };

  // Filter lists
  const availableSubjects = subjects.filter(s => 
    !assignedSubjectIds.includes(s._id) &&
    s.name?.toLowerCase().includes(searchAvailable.toLowerCase())
  );

  const assignedSubjectsList = subjects.filter(s => 
    assignedSubjectIds.includes(s._id) &&
    s.name?.toLowerCase().includes(searchAssigned.toLowerCase())
  );

  return (
    <div className="erp-module-card">
      <div className="erp-card-header d-flex justify-content-between align-items-center mb-4">
        <div>
          <h5 className="fw-bold m-0"><i className="fa-solid fa-link me-2 text-primary"></i>Class-Subject Linkage Portal</h5>
          <p className="small text-muted m-0">Associate curriculum subjects to specific classes using the dual-panel mapping interface.</p>
        </div>
      </div>

      {feedback.text && (
        <div className={`erp-notification erp-notification-${feedback.type}`}>
          <span>{feedback.text}</span>
          <button type="button" className="btn-close border-0 bg-transparent" onClick={() => setFeedback({ type: '', text: '' })}>&times;</button>
        </div>
      )}

      {loading ? (
        <div className="text-center p-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="text-muted small mt-2 m-0">Compiling class schemas...</p>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          
          {/* Top Class Dropdown Bar */}
          <div className="border rounded p-3 bg-light d-flex align-items-center gap-3">
            <span className="fw-bold text-muted small"><i className="fa-solid fa-school me-1"></i>Select Target Class:</span>
            <select 
              className="form-select premium-input w-25" 
              value={selectedClass} 
              onChange={e => handleClassChange(e.target.value)}
            >
              {classes.map(c => (
                <option key={c._id} value={c._id}>Class {c.class}</option>
              ))}
            </select>
          </div>

          {/* Dual Panel Mapping Split Screen */}
          <div className="row g-4 mt-1">
            
            {/* Left Panel: Available catalog */}
            <div className="col-md-6">
              <div className="erp-table-container h-100">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="fw-bold m-0 text-muted"><i className="fa-solid fa-book-open me-2 text-secondary"></i>Available Subject Catalog</h6>
                  <span className="badge bg-secondary">{availableSubjects.length} Available</span>
                </div>
                
                <div className="d-flex align-items-center gap-2 mb-3">
                  <i className="fa-solid fa-magnifying-glass text-muted small"></i>
                  <input 
                    type="text" 
                    className="form-control form-control-sm border-0 bg-light" 
                    placeholder="Search available subjects..." 
                    value={searchAvailable}
                    onChange={e => setSearchAvailable(e.target.value)}
                  />
                </div>

                <div className="border rounded p-2 d-flex flex-column gap-2" style={{ minHeight: '300px', maxHeight: '400px', overflowY: 'auto', backgroundColor: '#f8fafc' }}>
                  {availableSubjects.map(sub => (
                    <div key={sub._id} className="d-flex justify-content-between align-items-center p-2 rounded border bg-white shadow-sm">
                      <div>
                        <span className="fw-bold d-block small">{sub.name}</span>
                        <code className="text-muted" style={{ fontSize: '0.75rem' }}>{sub.code || 'No Code'}</code>
                      </div>
                      <button type="button" className="btn btn-sm btn-outline-primary px-3 py-1 rounded-pill" onClick={() => addSubjectId(sub._id)}>
                        Link +
                      </button>
                    </div>
                  ))}
                  {availableSubjects.length === 0 && (
                    <p className="text-muted small text-center my-5">No available subjects found matching filter.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Panel: Assigned catalog */}
            <div className="col-md-6">
              <div className="erp-table-container h-100">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="fw-bold m-0 text-success"><i className="fa-solid fa-circle-check me-2"></i>Mapped Class Subjects</h6>
                  <span className="badge bg-success">{assignedSubjectsList.length} Linked</span>
                </div>

                <div className="d-flex align-items-center gap-2 mb-3">
                  <i className="fa-solid fa-magnifying-glass text-muted small"></i>
                  <input 
                    type="text" 
                    className="form-control form-control-sm border-0 bg-light" 
                    placeholder="Search mapped subjects..." 
                    value={searchAssigned}
                    onChange={e => setSearchAssigned(e.target.value)}
                  />
                </div>

                <div className="border rounded p-2 d-flex flex-column gap-2" style={{ minHeight: '300px', maxHeight: '400px', overflowY: 'auto', backgroundColor: '#f8fafc' }}>
                  {assignedSubjectsList.map(sub => (
                    <div key={sub._id} className="d-flex justify-content-between align-items-center p-2 rounded border bg-white shadow-sm" style={{ borderLeft: '4px solid var(--button-color)' }}>
                      <div>
                        <span className="fw-bold d-block small">{sub.name}</span>
                        <code className="text-muted" style={{ fontSize: '0.75rem' }}>{sub.code || 'No Code'}</code>
                      </div>
                      <button type="button" className="btn btn-sm btn-outline-danger px-3 py-1 rounded-pill" onClick={() => removeSubjectId(sub._id)}>
                        Unlink ×
                      </button>
                    </div>
                  ))}
                  {assignedSubjectsList.length === 0 && (
                    <p className="text-muted small text-center my-5">No subjects linked to this class yet. Select subjects from the left panel!</p>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Footer Save Button */}
          <div className="d-flex justify-content-end mt-4 border-top pt-3">
            <button 
              type="button" 
              className="btn btn-lg text-white fw-bold px-5" 
              style={{ backgroundColor: 'var(--button-color)' }}
              disabled={saving || !selectedClass}
              onClick={handleLinkSelected}
            >
              {saving ? 'Saving Mappings...' : 'Save Mapping Linkage'}
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
