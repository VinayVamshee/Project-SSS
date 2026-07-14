import React, { useState, useEffect, useCallback } from 'react';
import api, { getAcademicYears, getClasses, getSubjects, getClassSubjects } from '../../API';

export default function AssessmentWizard() {
  const [years, setYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classLinks, setClassLinks] = useState([]);

  // Selection Dropdowns
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  
  // Assessments List for Class
  const [assessments, setAssessments] = useState([]);
  const [editingAssessment, setEditingAssessment] = useState(null);

  // Stepper State
  const [wizardStep, setWizardStep] = useState(1); // 1: General Info, 2: Subjects, 3: Configurations, 4: Summary

  // Form Fields
  const [assessmentName, setAssessmentName] = useState('');
  const [weightage, setWeightage] = useState(100);
  const [status, setStatus] = useState('Draft');
  
  // Subject Linkages in Wizard
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [subjectConfigs, setSubjectConfigs] = useState({}); // { [subjectId]: { maximumMarks, passingMarks, duration, examDate } }
  const [selectedChapters, setSelectedChapters] = useState({}); // { [subjectId]: [chapterId, ...] }
  
  // Dynamic chapter storage
  const [subjectChaptersData, setSubjectChaptersData] = useState({}); // { [subjectId]: [chapters] }
  const [activeConfigSubjectTab, setActiveConfigSubjectTab] = useState('');

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  useEffect(() => {
    async function fetchMasters() {
      try {
        const [yrsRes, clsRes, subRes, linksRes] = await Promise.all([
          getAcademicYears(),
          getClasses(),
          getSubjects(),
          getClassSubjects()
        ]);
        setYears(yrsRes.data.data || []);
        setClasses(clsRes.data.classes || []);
        setSubjects(subRes.data.subjects || []);
        setClassLinks(linksRes.data.data || []);

        if (yrsRes.data.data?.length > 0) setSelectedYear(yrsRes.data.data[0]._id);
        if (clsRes.data.classes?.length > 0) setSelectedClass(clsRes.data.classes[0]._id);
      } catch (err) {
        console.error(err);
      }
    }
    fetchMasters();
  }, []);

  const loadClassAssessments = useCallback(async () => {
    try {
      const res = await api.get('/api/assessments/config', {
        params: { academicYearId: selectedYear, classId: selectedClass }
      });
      setAssessments(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  }, [selectedYear, selectedClass]);

  useEffect(() => {
    if (selectedYear && selectedClass) {
      loadClassAssessments();
    }
  }, [selectedYear, selectedClass, loadClassAssessments]);

  const getAvailableSubjects = () => {
    if (!selectedClass) return [];
    const link = classLinks.find(l => (l.classId?._id || l.classId || '').toString() === selectedClass.toString());
    if (!link) return [];
    return subjects.filter(s => link.subjectIds?.some(id => (id?._id || id || '').toString() === s._id.toString()));
  };

  const fetchChaptersForSubject = async (subId) => {
    if (subjectChaptersData[subId]) return;
    try {
      const res = await api.get(`/chapters/${selectedClass}/${subId}`);
      setSubjectChaptersData(prev => ({
        ...prev,
        [subId]: res.data.chapters || []
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const startCreate = () => {
    setEditingAssessment(null);
    setAssessmentName('');
    setWeightage(100);
    setStatus('Draft');
    setSelectedSubjects([]);
    setSubjectConfigs({});
    setSelectedChapters({});
    setWizardStep(1);
    setFeedback({ type: '', text: '' });
  };

  const startEdit = (ass) => {
    setEditingAssessment(ass);
    setAssessmentName(ass.assessmentName);
    setWeightage(ass.weightage || 100);
    setStatus(ass.status || 'Draft');
    
    // Map subjects
    const subIds = ass.subjects?.map(s => s.subjectId?._id || s.subjectId) || [];
    setSelectedSubjects(subIds);

    const configs = {};
    const chaptersMap = {};

    ass.subjects?.forEach(s => {
      const sid = s.subjectId?._id || s.subjectId;
      configs[sid] = {
        maximumMarks: s.maximumMarks,
        passingMarks: s.passingMarks,
        duration: s.duration,
        examDate: s.examDate ? s.examDate.substring(0, 10) : ''
      };
      chaptersMap[sid] = s.selectedChapterIds || [];
      fetchChaptersForSubject(sid);
    });

    setSubjectConfigs(configs);
    setSelectedChapters(chaptersMap);
    if (subIds.length > 0) setActiveConfigSubjectTab(subIds[0]);

    setWizardStep(1);
    setFeedback({ type: '', text: '' });
  };

  const handleToggleSubject = (subId) => {
    if (selectedSubjects.includes(subId)) {
      setSelectedSubjects(selectedSubjects.filter(id => id !== subId));
    } else {
      setSelectedSubjects([...selectedSubjects, subId]);
      fetchChaptersForSubject(subId);
      if (!activeConfigSubjectTab) setActiveConfigSubjectTab(subId);
      if (!subjectConfigs[subId]) {
        setSubjectConfigs(prev => ({
          ...prev,
          [subId]: { maximumMarks: 100, passingMarks: 35, duration: 180, examDate: '' }
        }));
      }
    }
  };

  const updateSubjectConfigField = (subId, field, value) => {
    setSubjectConfigs(prev => ({
      ...prev,
      [subId]: {
        ...prev[subId],
        [field]: value
      }
    }));
  };

  const handleToggleChapter = (subId, chapId) => {
    const list = selectedChapters[subId] || [];
    if (list.includes(chapId)) {
      setSelectedChapters(prev => ({ ...prev, [subId]: list.filter(id => id !== chapId) }));
    } else {
      setSelectedChapters(prev => ({ ...prev, [subId]: [...list, chapId] }));
    }
  };

  const handleDeleteAssessment = async (id) => {
    if (!window.confirm('Delete this assessment configuration? This cannot be undone.')) return;
    try {
      await api.delete(`/api/assessments/config/${id}`);
      setFeedback({ type: 'success', text: 'Assessment configuration deleted.' });
      loadClassAssessments();
    } catch (err) {
      setFeedback({ type: 'danger', text: err.response?.data?.message || 'Failed to delete configuration.' });
    }
  };

  const handleSaveConfig = async () => {
    try {
      // Validate
      if (!assessmentName.trim()) throw new Error('Assessment Name is required.');
      if (selectedSubjects.length === 0) throw new Error('At least one linked subject is required.');

      for (const subId of selectedSubjects) {
        const sub = getAvailableSubjects().find(s => s._id === subId);
        const conf = subjectConfigs[subId] || {};
        if (conf.maximumMarks === undefined || conf.maximumMarks === null || conf.maximumMarks === "") {
          throw new Error(`Maximum Marks is required for subject: ${sub?.name || 'Subject'}`);
        }
        if (conf.passingMarks === undefined || conf.passingMarks === null || conf.passingMarks === "") {
          throw new Error(`Passing Marks is required for subject: ${sub?.name || 'Subject'}`);
        }
        if (Number(conf.passingMarks) > Number(conf.maximumMarks)) {
          throw new Error(`Passing Marks cannot exceed Maximum Marks for subject: ${sub?.name || 'Subject'}`);
        }
        if (!conf.duration) {
          throw new Error(`Exam Duration is required for subject: ${sub?.name || 'Subject'}`);
        }
      }

      setSaving(true);
      const payloadSubjects = selectedSubjects.map(subId => {
        const conf = subjectConfigs[subId];
        return {
          subjectId: subId,
          selectedChapterIds: selectedChapters[subId] || [],
          maximumMarks: conf.maximumMarks,
          passingMarks: conf.passingMarks,
          duration: conf.duration,
          examDate: conf.examDate || null
        };
      });

      await api.post('/api/assessments/config', {
        academicYearId: selectedYear,
        classId: selectedClass,
        assessmentName: assessmentName.trim(),
        weightage,
        status,
        subjects: payloadSubjects,
        assessmentConfigurationId: editingAssessment?._id
      });

      setFeedback({ type: 'success', text: 'Assessment configuration saved successfully!' });
      setEditingAssessment(null);
      loadClassAssessments();
    } catch (err) {
      setFeedback({ type: 'danger', text: err.message || 'Failed to save configuration.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="erp-module-card">
      <div className="erp-card-header mb-4">
        <h5 className="fw-bold m-0"><i className="fa-solid fa-file-invoice me-2 text-primary"></i>Assessment Configurations</h5>
        <p className="small text-muted m-0">Setup examination schemes, passing marks limits, duration weights, and map syllabus chapters cover limits.</p>
      </div>

      {feedback.text && (
        <div className={`erp-notification erp-notification-${feedback.type}`}>
          <span>{feedback.text}</span>
          <button type="button" className="btn-close border-0 bg-transparent" onClick={() => setFeedback({ type: '', text: '' })}>&times;</button>
        </div>
      )}

      {/* Selector Dropdowns */}
      {!editingAssessment && wizardStep === 1 && (
        <div className="border rounded p-3 bg-light d-flex align-items-center justify-content-between mb-4">
          <div className="d-flex align-items-center gap-3">
            <span className="small fw-bold text-muted"><i className="fa-solid fa-calendar-check me-1"></i>Year:</span>
            <select className="form-select form-select-sm premium-input" value={selectedYear} onChange={e => setSelectedYear(e.target.value)} style={{ width: '150px' }}>
              {years.map(y => <option key={y._id} value={y._id}>{y.name}</option>)}
            </select>

            <span className="small fw-bold text-muted"><i className="fa-solid fa-school me-1"></i>Class:</span>
            <select className="form-select form-select-sm premium-input" value={selectedClass} onChange={e => setSelectedClass(e.target.value)} style={{ width: '150px' }}>
              {classes.map(c => <option key={c._id} value={c._id}>Class {c.class}</option>)}
            </select>
          </div>

          <button className="btn btn-sm text-white fw-bold px-4" style={{ backgroundColor: 'var(--button-color)' }} onClick={startCreate}>
            + Configure Assessment
          </button>
        </div>
      )}

      {/* STEPPER WIZARD IF CREATING/EDITING */}
      {(editingAssessment || wizardStep > 1 || assessmentName !== '') ? (
        <div className="erp-table-container">
          
          {/* Stepper Wizard Indicator */}
          <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
            <div className="d-flex gap-3">
              <span className={`badge p-2 ${wizardStep === 1 ? 'bg-primary' : 'bg-light text-muted'}`}>1. General Information</span>
              <span className={`badge p-2 ${wizardStep === 2 ? 'bg-primary' : 'bg-light text-muted'}`}>2. Link Subjects</span>
              <span className={`badge p-2 ${wizardStep === 3 ? 'bg-primary' : 'bg-light text-muted'}`}>3. Parameter Configurations</span>
              <span className={`badge p-2 ${wizardStep === 4 ? 'bg-primary' : 'bg-light text-muted'}`}>4. Summary & Save</span>
            </div>
            <button className="btn btn-sm btn-outline-secondary" onClick={() => { setEditingAssessment(null); setAssessmentName(''); setWizardStep(1); }}>Cancel</button>
          </div>

          {/* STEP 1: GENERAL INFO */}
          {wizardStep === 1 && (
            <div className="row g-3">
              <div className="col-md-6">
                <label className="premium-label">Assessment Title Name</label>
                <input 
                  type="text" 
                  className="form-control premium-input" 
                  placeholder="e.g. Mid Term Exam / UT-I" 
                  value={assessmentName} 
                  onChange={e => setAssessmentName(e.target.value)} 
                />
              </div>
              <div className="col-md-3">
                <label className="premium-label">Weightage (%)</label>
                <input 
                  type="number" 
                  className="form-control premium-input" 
                  value={weightage} 
                  onChange={e => setWeightage(Number(e.target.value))} 
                />
              </div>
              <div className="col-md-3">
                <label className="premium-label">Status</label>
                <select className="form-select premium-input" value={status} onChange={e => setStatus(e.target.value)}>
                  <option value="Draft">Draft</option>
                  <option value="Published">Published</option>
                </select>
              </div>
              <div className="col-12 d-flex justify-content-end mt-4">
                <button className="btn btn-primary px-4" disabled={!assessmentName.trim()} onClick={() => setWizardStep(2)}>Next: Link Subjects &rarr;</button>
              </div>
            </div>
          )}

          {/* STEP 2: LINK SUBJECTS */}
          {wizardStep === 2 && (
            <div>
              <h6 className="fw-bold mb-3 text-muted">Select subjects participating in this assessment:</h6>
              <div className="row g-3 mb-4">
                {getAvailableSubjects().map(sub => {
                  const isChecked = selectedSubjects.includes(sub._id);
                  return (
                    <div className="col-md-4" key={sub._id}>
                      <div 
                        className={`p-3 rounded border cursor-pointer d-flex justify-content-between align-items-center ${
                          isChecked ? 'border-primary bg-light-transparent' : 'bg-white'
                        }`}
                        onClick={() => handleToggleSubject(sub._id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <span className="fw-bold small">{sub.name}</span>
                        <input type="checkbox" className="form-check-input" checked={isChecked} readOnly />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="d-flex justify-content-between mt-4">
                <button className="btn btn-outline-secondary px-4" onClick={() => setWizardStep(1)}>&larr; Back</button>
                <button className="btn btn-primary px-4" disabled={selectedSubjects.length === 0} onClick={() => setWizardStep(3)}>Next: Subject Settings &rarr;</button>
              </div>
            </div>
          )}

          {/* STEP 3: CONFIGURE ACCORDIONS */}
          {wizardStep === 3 && (
            <div className="row g-3">
              
              {/* Left Sub-tabs for configuration */}
              <div className="col-md-3 border-end">
                <label className="small text-muted fw-bold mb-2">Subject Node Select</label>
                <div className="d-flex flex-column gap-1">
                  {selectedSubjects.map(subId => {
                    const subName = getAvailableSubjects().find(s => s._id === subId)?.name || 'Subject';
                    const isActive = activeConfigSubjectTab === subId;
                    return (
                      <button 
                        key={subId} 
                        type="button" 
                        className={`btn btn-sm text-start p-2 fw-semibold rounded ${
                          isActive ? 'btn-primary text-white' : 'btn-outline-secondary'
                        }`}
                        onClick={() => setActiveConfigSubjectTab(subId)}
                      >
                        {subName}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Configuration panel */}
              <div className="col-md-9">
                {activeConfigSubjectTab && (
                  <div>
                    {(() => {
                      const sub = getAvailableSubjects().find(s => s._id === activeConfigSubjectTab);
                      const conf = subjectConfigs[activeConfigSubjectTab] || { maximumMarks: 100, passingMarks: 35, duration: 180, examDate: '' };
                      const chList = subjectChaptersData[activeConfigSubjectTab] || [];
                      const selectedChs = selectedChapters[activeConfigSubjectTab] || [];

                      return (
                        <div className="d-flex flex-column gap-3">
                          <h6 className="fw-bold m-0 text-primary">{sub?.name} Configurations</h6>
                          
                          <div className="row g-3">
                            <div className="col-md-3">
                              <label className="small text-muted fw-bold">Max Marks</label>
                              <input type="number" className="form-control form-control-sm premium-input" value={conf.maximumMarks} onChange={e => updateSubjectConfigField(activeConfigSubjectTab, 'maximumMarks', Number(e.target.value))} />
                            </div>
                            <div className="col-md-3">
                              <label className="small text-muted fw-bold">Passing Marks</label>
                              <input type="number" className="form-control form-control-sm premium-input" value={conf.passingMarks} onChange={e => updateSubjectConfigField(activeConfigSubjectTab, 'passingMarks', Number(e.target.value))} />
                            </div>
                            <div className="col-md-3">
                              <label className="small text-muted fw-bold">Exam Date</label>
                              <input type="date" className="form-control form-control-sm premium-input" value={conf.examDate} onChange={e => updateSubjectConfigField(activeConfigSubjectTab, 'examDate', e.target.value)} />
                            </div>
                            <div className="col-md-3">
                              <label className="small text-muted fw-bold">Duration (Min)</label>
                              <input type="number" className="form-control form-control-sm premium-input" value={conf.duration} onChange={e => updateSubjectConfigField(activeConfigSubjectTab, 'duration', Number(e.target.value))} />
                            </div>
                          </div>

                          <div className="mt-3">
                            <label className="small text-muted fw-bold mb-2">Chapters Cover List</label>
                            {chList.length > 0 ? (
                              <div className="d-flex flex-wrap gap-2 mt-1">
                                {chList.map(ch => {
                                  const isChecked = selectedChs.includes(ch._id);
                                  return (
                                    <button 
                                      key={ch._id} 
                                      type="button" 
                                      className={`btn btn-sm d-flex align-items-center gap-1 px-3 py-2 rounded-pill transition-all ${
                                        isChecked ? 'text-white border-0' : 'btn-outline-secondary'
                                      }`}
                                      style={isChecked ? { backgroundColor: 'var(--button-color, #FE4F2D)', transform: 'scale(1.03)' } : {}}
                                      onClick={() => handleToggleChapter(activeConfigSubjectTab, ch._id)}
                                    >
                                      {isChecked ? (
                                        <i className="fa-solid fa-circle-check me-1"></i>
                                      ) : (
                                        <i className="fa-regular fa-circle me-1"></i>
                                      )}
                                      {ch.name}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-muted small m-0">No chapters configured in syllabus database.</p>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div className="col-12 d-flex justify-content-between mt-4 pt-3 border-top">
                <button className="btn btn-outline-secondary px-4" onClick={() => setWizardStep(2)}>&larr; Back</button>
                <button className="btn btn-primary px-4" onClick={() => setWizardStep(4)}>Next: Summary Review &rarr;</button>
              </div>
            </div>
          )}

          {/* STEP 4: SUMMARY & SUBMIT */}
          {wizardStep === 4 && (
            <div>
              <h6 className="fw-bold mb-3 text-muted">Summary of Assessment Parameters:</h6>
              
              <div className="border rounded p-3 mb-4 bg-light">
                <div className="row g-3">
                  <div className="col-md-4">
                    <span className="small text-muted d-block">Assessment Title</span>
                    <strong className="fs-5">{assessmentName}</strong>
                  </div>
                  <div className="col-md-4">
                    <span className="small text-muted d-block">Weightage Ratio</span>
                    <strong className="fs-5">{weightage}%</strong>
                  </div>
                  <div className="col-md-4">
                    <span className="small text-muted d-block">Status</span>
                    <span className={`badge bg-${status === 'Published' ? 'success' : 'warning'} text-white`}>{status}</span>
                  </div>
                </div>
              </div>

              <h6 className="fw-bold mb-3 text-muted">Linked Subjects Breakdown:</h6>
              <div className="table-responsive">
                <table className="erp-data-table">
                  <thead>
                    <tr>
                      <th className="text-start">Subject</th>
                      <th>Max Marks</th>
                      <th>Passing Marks</th>
                      <th>Duration</th>
                      <th>Exam Date</th>
                      <th>Chapters Covered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSubjects.map(subId => {
                      const sub = getAvailableSubjects().find(s => s._id === subId);
                      const conf = subjectConfigs[subId] || {};
                      const chCount = selectedChapters[subId]?.length || 0;
                      return (
                        <tr key={subId}>
                          <td className="text-start fw-bold">{sub?.name}</td>
                          <td>{conf.maximumMarks}</td>
                          <td>{conf.passingMarks}</td>
                          <td>{conf.duration} Minutes</td>
                          <td>{conf.examDate || 'N/A'}</td>
                          <td><span className="badge bg-light text-dark border">{chCount} Chapters</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="d-flex justify-content-between mt-4 pt-3 border-top">
                <button className="btn btn-outline-secondary px-4" onClick={() => setWizardStep(3)}>&larr; Back</button>
                <button className="btn text-white fw-bold px-5" style={{ backgroundColor: 'var(--button-color)' }} onClick={handleSaveConfig} disabled={saving}>
                  {saving ? 'Saving configuration...' : 'Save Configuration'}
                </button>
              </div>
            </div>
          )}

        </div>
      ) : (
        /* Data grid of existing configs */
        <div className="erp-table-container">
          <div className="table-responsive">
            <table className="erp-data-table">
              <thead>
                <tr>
                  <th className="text-start">Assessment Name</th>
                  <th>Weightage</th>
                  <th>Status</th>
                  <th>Subjects</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map(ass => (
                  <tr key={ass._id}>
                    <td className="text-start fw-bold">{ass.assessmentName}</td>
                    <td>{ass.weightage}%</td>
                    <td>
                      <span className={`badge bg-${ass.status === 'Published' ? 'success' : 'warning'} text-white`}>
                        {ass.status}
                      </span>
                    </td>
                    <td><span className="badge bg-light text-dark border">{ass.subjects?.length || 0} Linked</span></td>
                    <td>
                      <button className="btn btn-sm btn-outline-warning border-0 me-2" onClick={() => startEdit(ass)}>
                        <i className="fa-solid fa-pen-to-square"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-danger border-0" onClick={() => handleDeleteAssessment(ass._id)}>
                        <i className="fa-regular fa-trash-can"></i>
                      </button>
                    </td>
                  </tr>
                ))}
                {assessments.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center text-muted small py-4">No assessments configured for this year/class level yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
