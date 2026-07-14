import React, { useState, useEffect } from 'react';
import api, { getClasses, addClass, deleteClass, getClassSubjects } from '../../API';

export default function ClassesManager() {
  const [classesList, setClassesList] = useState([]);
  const [classLinks, setClassLinks] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  
  const [newClassName, setNewClassName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  const loadData = async () => {
    try {
      setLoading(true);
      const [clsRes, linksRes, stdRes] = await Promise.all([
        getClasses(),
        getClassSubjects(),
        api.get('/getStudent')
      ]);
      setClassesList(clsRes.data.classes || []);
      setClassLinks(linksRes.data.data || []);
      setAllStudents(stdRes.data.students || []);
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', text: 'Failed to retrieve classes catalog.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddClass = async (e) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    try {
      setSaving(true);
      await addClass({ className: newClassName.trim() });
      setFeedback({ type: 'success', text: 'Class created successfully!' });
      setNewClassName('');
      loadData();
    } catch (err) {
      setFeedback({ type: 'danger', text: err.response?.data?.message || 'Failed to register class.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClass = async (id) => {
    if (!window.confirm('Are you sure you want to delete this class? All linked configuration maps will be cleared.')) return;
    try {
      setLoading(true);
      await deleteClass(id);
      setFeedback({ type: 'success', text: 'Class deleted successfully!' });
      loadData();
    } catch (err) {
      setFeedback({ type: 'danger', text: err.response?.data?.message || 'Failed to remove class.' });
    } finally {
      setLoading(false);
    }
  };

  // Helper metrics
  const getSubjectCount = (classId) => {
    const link = classLinks.find(l => (l.classId?._id || l.classId || '').toString() === classId.toString());
    return link ? link.subjectIds?.length || 0 : 0;
  };

  const getStudentCount = (classId) => {
    return allStudents.filter(s => {
      const topLevelMatch = (s.enrollmentClass?._id || s.enrollmentClass) === classId;
      const enrollmentMatch = s.enrollments?.some(e => (e.classId?._id || e.classId || e.class) === classId);
      return topLevelMatch || enrollmentMatch;
    }).length;
  };

  const filteredClasses = classesList.filter(c => 
    c.class?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="erp-module-card">
      <div className="erp-card-header d-flex justify-content-between align-items-center mb-4">
        <div>
          <h5 className="fw-bold m-0"><i className="fa-solid fa-school me-2 text-primary"></i>Classes Registry Catalog</h5>
          <p className="small text-muted m-0">Create class levels, manage sections limits, and view mapped student enrollments.</p>
        </div>
      </div>

      {feedback.text && (
        <div className={`erp-notification erp-notification-${feedback.type}`}>
          <span>{feedback.text}</span>
          <button type="button" className="btn-close border-0 bg-transparent" onClick={() => setFeedback({ type: '', text: '' })}>&times;</button>
        </div>
      )}

      {/* Row Split: Add Class Panel + Classes List */}
      <div className="row g-4">
        
        {/* Left Side: Register Class */}
        <div className="col-lg-4">
          <div className="erp-form-container">
            <h6 className="fw-bold mb-3"><i className="fa-solid fa-folder-plus text-primary me-2"></i>Register New Class</h6>
            <form onSubmit={handleAddClass}>
              <div className="mb-3">
                <label className="small text-muted fw-bold mb-2">Class Name / Level</label>
                <input 
                  type="text" 
                  className="form-control premium-input" 
                  placeholder="e.g. Class 10 / Grade A" 
                  value={newClassName}
                  onChange={e => setNewClassName(e.target.value)}
                  disabled={saving}
                />
              </div>
              <button 
                type="submit" 
                className="btn w-100 text-white fw-semibold" 
                style={{ backgroundColor: 'var(--button-color)' }}
                disabled={saving || !newClassName.trim()}
              >
                {saving ? 'Registering Class...' : '+ Add Class Level'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Ledger Data Table */}
        <div className="col-lg-8">
          <div className="erp-table-container">
            <div className="d-flex align-items-center gap-2 mb-3">
              <i className="fa-solid fa-magnifying-glass text-muted"></i>
              <input 
                type="text" 
                className="form-control form-control-sm border-0 bg-light" 
                placeholder="Search class level..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {loading ? (
              <div className="text-center p-4">
                <div className="spinner-border text-primary spinner-border-sm" role="status"></div>
                <p className="text-muted small mt-2 m-0">Retrieving registries...</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="erp-data-table">
                  <thead>
                    <tr>
                      <th className="text-start">Class Level</th>
                      <th>Linked Subjects</th>
                      <th>Active Students</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClasses.map(c => (
                      <tr key={c._id}>
                        <td className="text-start fw-bold">{c.class}</td>
                        <td><span className="badge bg-light text-dark border">{getSubjectCount(c._id)} Mapped</span></td>
                        <td><span className="badge bg-light text-dark border">{getStudentCount(c._id)} Enrolled</span></td>
                        <td><span className="badge bg-success-transparent text-success border border-success">Active</span></td>
                        <td>
                          <button className="btn btn-sm btn-outline-danger border-0" onClick={() => handleDeleteClass(c._id)}>
                            <i className="fa-regular fa-trash-can"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredClasses.length === 0 && (
                      <tr>
                        <td colSpan="5" className="text-center text-muted small py-4">No class levels found. Register one on the left panel!</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
