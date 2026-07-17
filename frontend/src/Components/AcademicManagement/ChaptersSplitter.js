import React, { useState, useEffect, useCallback } from 'react';
import api, { getClasses, getSubjects, getClassSubjects } from '../../API';
import Notification from '../Shared/Notification';

export default function ChaptersSplitter() {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classLinks, setClassLinks] = useState([]);
  
  // Navigation State
  const [activeClassNode, setActiveClassNode] = useState(null);
  const [activeSubjectNode, setActiveSubjectNode] = useState(null);
  
  // Editor State
  const [chapters, setChapters] = useState([]);
  const [newChapterName, setNewChapterName] = useState('');
  
  // Edit Dialog States
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');

  const [loading, setLoading] = useState(false);
  const [editorLoading, setEditorLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', text: '' });
  
  // Bottom Right Notifications
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState('success');

  const triggerNotification = (msg, type = 'success') => {
    setNotificationMessage(msg);
    setNotificationType(type);
    setTimeout(() => {
      setNotificationMessage('');
    }, 4000);
  };

  // Drag and Drop State and Handlers
  const [draggedIndex, setDraggedIndex] = useState(null);

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const reorderedChapters = [...chapters];
    const draggedItem = reorderedChapters[draggedIndex];
    reorderedChapters.splice(draggedIndex, 1);
    reorderedChapters.splice(index, 0, draggedItem);
    
    setDraggedIndex(index);
    setChapters(reorderedChapters);
  };

  const handleDragEnd = async () => {
    setDraggedIndex(null);
    if (!activeClassNode || !activeSubjectNode) return;
    try {
      setEditorLoading(true);
      await api.post('/chapters', {
        classId: activeClassNode,
        subjectId: activeSubjectNode,
        chapters: chapters.map(c => ({ _id: c._id, name: c.name }))
      });
      triggerNotification('Chapters reordered successfully!', 'success');
    } catch (err) {
      triggerNotification('Failed to save chapter sequence.', 'danger');
      loadChapters(activeClassNode, activeSubjectNode);
    } finally {
      setEditorLoading(false);
    }
  };

  const loadChapters = useCallback(async (classId, subjectId) => {
    try {
      setEditorLoading(true);
      const res = await api.get(`/chapters/${classId}/${subjectId}`);
      setChapters(res.data.chapters || []);
    } catch (err) {
      console.error(err);
      setChapters([]);
    } finally {
      setEditorLoading(false);
    }
  }, []);

  const loadInitialData = useCallback(async () => {
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
        const firstClass = clsRes.data.classes[0];
        setActiveClassNode(firstClass._id);
        
        // Find first linked subject
        const link = linksRes.data.data.find(l => (l.classId?._id || l.classId || '').toString() === firstClass._id.toString());
        if (link && link.subjectIds?.length > 0) {
          const firstSubId = link.subjectIds[0]._id || link.subjectIds[0];
          setActiveSubjectNode(firstSubId);
          loadChapters(firstClass._id, firstSubId);
        }
      }
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'danger', text: 'Failed to load tree navigation.' });
    } finally {
      setLoading(false);
    }
  }, [loadChapters]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleNodeSelect = (classId, subjectId) => {
    setActiveClassNode(classId);
    setActiveSubjectNode(subjectId);
    setEditId(null);
    setFeedback({ type: '', text: '' });
    loadChapters(classId, subjectId);
  };

  const handleClassChange = (classId) => {
    setActiveClassNode(classId);
    setEditId(null);
    setFeedback({ type: '', text: '' });
    
    const classSubs = getLinkedSubjectsForClass(classId);
    if (classSubs.length > 0) {
      const firstSubId = classSubs[0]._id;
      setActiveSubjectNode(firstSubId);
      loadChapters(classId, firstSubId);
    } else {
      setActiveSubjectNode(null);
      setChapters([]);
    }
  };

  const handleAddChapter = async (e) => {
    e.preventDefault();
    if (!newChapterName.trim() || !activeClassNode || !activeSubjectNode) return;
    try {
      setSaving(true);
      const payloadChapters = [
        ...chapters.map(c => ({ _id: c._id, name: c.name })),
        { name: newChapterName.trim() }
      ];
      await api.post('/chapters', {
        classId: activeClassNode,
        subjectId: activeSubjectNode,
        chapters: payloadChapters
      });
      setNewChapterName('');
      triggerNotification('Chapter added successfully!', 'success');
      loadChapters(activeClassNode, activeSubjectNode);
    } catch (err) {
      triggerNotification(err.response?.data?.message || 'Failed to register chapter.', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateChapter = async (e) => {
    e.preventDefault();
    if (!editName.trim() || !activeClassNode || !activeSubjectNode) return;
    try {
      setSaving(true);
      await api.put(`/chapters/${activeClassNode}/${activeSubjectNode}/${editId}`, { newName: editName.trim() });
      setEditId(null);
      triggerNotification('Chapter renamed successfully!', 'success');
      loadChapters(activeClassNode, activeSubjectNode);
    } catch (err) {
      triggerNotification(err.response?.data?.message || 'Failed to edit chapter.', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteChapter = async (id) => {
    if (!window.confirm('Delete this chapter?')) return;
    try {
      setEditorLoading(true);
      await api.delete(`/chapters/${activeClassNode}/${activeSubjectNode}/${id}`);
      triggerNotification('Chapter removed.', 'success');
      loadChapters(activeClassNode, activeSubjectNode);
    } catch (err) {
      triggerNotification(err.response?.data?.message || 'Failed to delete chapter.', 'danger');
    } finally {
      setEditorLoading(false);
    }
  };

  const getLinkedSubjectsForClass = (classId) => {
    const link = classLinks.find(l => (l.classId?._id || l.classId || '').toString() === classId.toString());
    if (!link) return [];
    return subjects.filter(s => link.subjectIds?.some(id => (id?._id || id || '').toString() === s._id.toString()));
  };

  return (
    <div className="erp-module-card">
      <div className="erp-card-header mb-4">
        <h5 className="fw-bold m-0"><i className="fa-solid fa-bookmark me-2 text-primary"></i>Syllabus & Chapters Split Matrix</h5>
        <p className="small text-muted m-0">Navigate subjects using the left class hierarchy tree, and maintain chapters in the right pane.</p>
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
          <p className="text-muted small mt-2">Loading navigation structures...</p>
        </div>
      ) : (
        <div className="row g-4">
          
          {/* Left Split-Pane: Class/Subject dropdown & list hierarchy */}
          <div className="col-md-4 border-end">
            <h6 className="fw-bold mb-3 text-muted small"><i className="fa-solid fa-folder me-2"></i>Class Curriculums</h6>
            
            {/* Class Dropdown Selector */}
            <div className="mb-3">
              <label className="form-label small fw-bold text-secondary">Select Class</label>
              <select 
                className="form-select form-select-sm" 
                value={activeClassNode || ''} 
                onChange={e => handleClassChange(e.target.value)}
              >
                <option value="" disabled>-- Select Class --</option>
                {classes.map(cls => (
                  <option key={cls._id} value={cls._id}>Class {cls.class}</option>
                ))}
              </select>
            </div>

            <h6 className="fw-bold mb-2 text-muted small"><i className="fa-solid fa-book me-2"></i>Linked Subjects</h6>
            <div className="d-flex flex-column gap-2" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {activeClassNode ? (
                (() => {
                  const classSubs = getLinkedSubjectsForClass(activeClassNode);
                  return (
                    <div className="d-flex flex-column gap-1">
                      {classSubs.map(sub => {
                        const isActive = activeSubjectNode === sub._id;
                        return (
                          <div 
                            key={sub._id} 
                            onClick={() => handleNodeSelect(activeClassNode, sub._id)}
                            className={`p-2 rounded cursor-pointer transition-all small fw-semibold d-flex justify-content-between align-items-center ${
                              isActive 
                                ? 'bg-primary text-white shadow-sm' 
                                : 'border border-light'
                            }`}
                            style={{ cursor: 'pointer', backgroundColor: isActive ? undefined : 'var(--card-bg-color)', color: isActive ? undefined : 'var(--text-color)' }}
                          >
                            <span>{sub.name}</span>
                            <i className="fa-solid fa-chevron-right" style={{ fontSize: '0.65rem', opacity: isActive ? 1 : 0.4 }}></i>
                          </div>
                        );
                      })}
                      {classSubs.length === 0 && (
                        <p className="text-muted small m-0 ps-2" style={{ fontSize: '0.75rem' }}>No subjects linked to this class yet.</p>
                      )}
                    </div>
                  );
                })()
              ) : (
                <p className="text-muted small m-0">Please select a class first.</p>
              )}
            </div>
          </div>

          {/* Right Split-Pane: Chapters editor */}
          <div className="col-md-8">
            {activeClassNode && activeSubjectNode ? (
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="fw-bold m-0 text-primary">
                    <i className="fa-solid fa-book-open me-2"></i>
                    Syllabus Chapters Editor
                  </h6>
                  <span className="badge bg-primary">
                    Class: {classes.find(c => c._id === activeClassNode)?.class} | 
                    Subject: {subjects.find(s => s._id === activeSubjectNode)?.name}
                  </span>
                </div>

                {/* Add Chapter Form */}
                <form onSubmit={handleAddChapter} className="row g-2 mb-4">
                  <div className="col-md-9">
                    <input 
                      type="text" 
                      className="form-control form-control-sm premium-input" 
                      placeholder="Enter new chapter name..." 
                      value={newChapterName} 
                      onChange={e => setNewChapterName(e.target.value)} 
                      disabled={saving || editorLoading}
                      required
                    />
                  </div>
                  <div className="col-md-3">
                    <button type="submit" className="btn btn-sm text-white fw-bold w-100 h-100" style={{ backgroundColor: 'var(--button-color)' }} disabled={saving || editorLoading}>
                      + Add Chapter
                    </button>
                  </div>
                </form>

                {/* Edit inline form */}
                {editId && (
                  <form onSubmit={handleUpdateChapter} className="border rounded p-3 mb-4" style={{ backgroundColor: 'rgba(254, 79, 45, 0.03)', borderColor: 'rgba(254, 79, 45, 0.2)' }}>
                    <h6 className="fw-bold mb-2 small text-warning">Rename Selected Chapter</h6>
                    <div className="row g-2">
                      <div className="col-md-8">
                        <input type="text" className="form-control form-control-sm premium-input" value={editName} onChange={e => setEditName(e.target.value)} required />
                      </div>
                      <div className="col-md-4 d-flex gap-2">
                        <button type="submit" className="btn btn-sm btn-warning text-dark fw-bold w-100" disabled={saving}>Save</button>
                        <button type="button" className="btn btn-sm btn-outline-secondary w-100" onClick={() => setEditId(null)}>Cancel</button>
                      </div>
                    </div>
                  </form>
                )}

                {/* Chapter list ledger */}
                {editorLoading ? (
                  <div className="text-center p-5">
                    <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                    <p className="text-muted small mt-2 m-0">Compiling syllabus chapters...</p>
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-2" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                    {chapters.map((ch, idx) => (
                      <div 
                        key={ch._id} 
                        className={`d-flex justify-content-between align-items-center p-3 border rounded shadow-sm transition-all ${
                          draggedIndex === idx ? 'opacity-50 border-primary border-dashed' : ''
                        }`} 
                        style={{ 
                          backgroundColor: 'var(--card-bg-color)', 
                          color: 'var(--text-color)',
                          cursor: 'grab'
                        }}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDragEnd={handleDragEnd}
                      >
                        <div className="d-flex align-items-center gap-2">
                          <i className="fa-solid fa-grip-vertical text-muted me-2" style={{ cursor: 'grab' }}></i>
                          <span className="badge bg-light text-muted border">{idx + 1}</span>
                          <span className="fw-bold small">{ch.name}</span>
                        </div>
                        <div>
                          <button className="btn btn-sm btn-outline-warning border-0 me-2" onClick={(e) => { e.stopPropagation(); setEditId(ch._id); setEditName(ch.name); }}>
                            <i className="fa-solid fa-pen-to-square"></i>
                          </button>
                          <button className="btn btn-sm btn-outline-danger border-0" onClick={(e) => { e.stopPropagation(); handleDeleteChapter(ch._id); }}>
                            <i className="fa-regular fa-trash-can"></i>
                          </button>
                        </div>
                      </div>
                    ))}
                    {chapters.length === 0 && (
                      <div className="text-center p-5 text-muted border rounded border-dashed" style={{ backgroundColor: 'var(--card-bg-color)', color: 'var(--text-color)' }}>
                        <i className="fa-solid fa-bookmark fa-2x mb-2 text-secondary"></i>
                        <p className="small m-0">No chapters are there for this subject!</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center p-5 text-muted h-100 d-flex flex-column justify-content-center align-items-center">
                <i className="fa-solid fa-network-wired fa-3x mb-3 text-secondary"></i>
                <h5>Select class subject node on the left panel tree to load and edit syllabus chapters.</h5>
              </div>
            )}
          </div>

        </div>
      )}
      <Notification message={notificationMessage} type={notificationType} />
    </div>
  );
}
