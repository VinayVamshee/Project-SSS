import React, { useState, useEffect } from 'react';
import { getSubjects, addSubject, deleteSubject, updateSubject } from '../../API';

export default function SubjectsManager() {
  const [subjectsList, setSubjectsList] = useState([]);
  
  const [name, setName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Editing state
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  const loadSubjects = async () => {
    try {
      setLoading(true);
      const res = await getSubjects();
      setSubjectsList(res.data.subjects || []);
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', text: 'Failed to retrieve subjects catalog.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setSaving(true);
      await addSubject({ subjectName: name.trim() });
      setFeedback({ type: 'success', text: 'Subject added successfully to master!' });
      setName('');
      loadSubjects();
    } catch (err) {
      setFeedback({ type: 'danger', text: err.response?.data?.message || 'Failed to register subject.' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSubject = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;
    try {
      setSaving(true);
      await updateSubject(editId, { name: editName.trim() });
      setFeedback({ type: 'success', text: 'Subject details updated successfully!' });
      setEditId(null);
      loadSubjects();
    } catch (err) {
      setFeedback({ type: 'danger', text: err.response?.data?.message || 'Failed to update subject.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSubject = async (id) => {
    if (!window.confirm('Are you sure you want to delete this subject? All linked configurations will be unlinked.')) return;
    try {
      setLoading(true);
      await deleteSubject(id);
      setFeedback({ type: 'success', text: 'Subject deleted from master.' });
      loadSubjects();
    } catch (err) {
      setFeedback({ type: 'danger', text: err.response?.data?.message || 'Failed to remove subject.' });
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (sub) => {
    setEditId(sub._id);
    setEditName(sub.name);
  };

  const filteredSubjects = subjectsList.filter(s => 
    s.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="erp-module-card">
      <div className="erp-card-header mb-4">
        <h5 className="fw-bold m-0"><i className="fa-solid fa-book-open me-2 text-primary"></i>Subjects Master Catalog</h5>
        <p className="small text-muted m-0">Maintain global subjects catalog database for the academic session.</p>
      </div>

      {feedback.text && (
        <div className={`erp-notification erp-notification-${feedback.type}`}>
          <span>{feedback.text}</span>
          <button type="button" className="btn-close border-0 bg-transparent" onClick={() => setFeedback({ type: '', text: '' })}>&times;</button>
        </div>
      )}

      <div className="row g-4">
        
        {/* Left Form: Add/Edit Panel */}
        <div className="col-lg-4">
          <div className="erp-form-container">
            {editId ? (
              <form onSubmit={handleUpdateSubject}>
                <h6 className="fw-bold mb-3 text-warning"><i className="fa-solid fa-pen-to-square me-2"></i>Modify Subject</h6>
                <div className="mb-3">
                  <label className="small text-muted fw-bold mb-2">Subject Name</label>
                  <input type="text" className="form-control premium-input" value={editName} onChange={e => setEditName(e.target.value)} required />
                </div>
                <div className="d-flex gap-2">
                  <button type="submit" className="btn btn-warning text-dark fw-bold w-100" disabled={saving}>Save Changes</button>
                  <button type="button" className="btn btn-outline-secondary w-100" onClick={() => setEditId(null)}>Cancel</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAddSubject}>
                <h6 className="fw-bold mb-3"><i className="fa-solid fa-folder-plus text-primary me-2"></i>Register New Subject</h6>
                <div className="mb-3">
                  <label className="small text-muted fw-bold mb-2">Subject Name</label>
                  <input type="text" className="form-control premium-input" placeholder="e.g. Mathematics" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <button type="submit" className="btn w-100 text-white fw-bold" style={{ backgroundColor: 'var(--button-color)' }} disabled={saving}>
                  + Add Subject to Master
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right Table Panel */}
        <div className="col-lg-8">
          <div className="erp-table-container">
            <div className="d-flex align-items-center gap-2 mb-3">
              <i className="fa-solid fa-magnifying-glass text-muted"></i>
              <input 
                type="text" 
                className="form-control form-control-sm border-0 bg-light" 
                placeholder="Search subject by name..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {loading ? (
              <div className="text-center p-4">
                <div className="spinner-border text-primary spinner-border-sm" role="status"></div>
                <p className="text-muted small mt-2 m-0">Retrieving master lists...</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="erp-data-table">
                  <thead>
                    <tr>
                      <th className="text-start">Subject Name</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubjects.map(sub => (
                      <tr key={sub._id}>
                        <td className="text-start fw-bold">{sub.name}</td>
                        <td>
                          <button className="btn btn-sm btn-outline-warning border-0 me-2" onClick={() => startEdit(sub)}>
                            <i className="fa-solid fa-pen-to-square"></i>
                          </button>
                          <button className="btn btn-sm btn-outline-danger border-0" onClick={() => handleDeleteSubject(sub._id)}>
                            <i className="fa-regular fa-trash-can"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredSubjects.length === 0 && (
                      <tr>
                        <td colSpan="2" className="text-center text-muted small py-4">No subjects found. Add a subject using the left panel!</td>
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
