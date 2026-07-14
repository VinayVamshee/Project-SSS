/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { 
  getAssessmentTemplates, createAssessmentTemplate, deleteAssessmentTemplate,
  getAssessmentPlans, createAssessmentPlan, copyPreviousYearPlan,
  getAssessments, generateAssessments, updateAssessment,
  getAssessmentSubjects, saveAssessmentSubject,
  getMarksRegister, bulkSaveMarks,
  getAcademicYears, getClasses, getSubjects, getAllChapters
} from '../../API';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

export default function AssessmentDashboard() {
  const [activeTab, setActiveTab] = useState('templates');

  // Core Master Data
  const [years, setYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  
  // Selection States
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedAssessment, setSelectedAssessment] = useState('');

  // 1. Templates Tab State
  const [templates, setTemplates] = useState([]);
  const [newTemplate, setNewTemplate] = useState({ name: '', code: '', assessmentType: 'Weekly', defaultWeightage: 100 });

  // 2. Plans Tab State
  const [plans, setPlans] = useState([]);
  const [newPlan, setNewPlan] = useState({ templateId: '', assessmentName: '', displayOrder: 1 });
  const [cloneSourceYear, setCloneSourceYear] = useState('');

  // 3. Assessments Tab State
  const [assessments, setAssessments] = useState([]);
  
  // 4. Subjects Tab State
  const [assSubjects, setAssSubjects] = useState([]);
  const [newAssSub, setNewAssSub] = useState({ maximumMarks: 100, passingMarks: 35, duration: 180, selectedChapterIds: [] });

  // 5. Marks Tab State
  const [students, setStudents] = useState([]);
  const [marks, setMarks] = useState({});
  const [autosaveTimer, setAutosaveTimer] = useState(null);
  const [saveStatus, setSaveStatus] = useState('');

  // 6. Analytics Tab State
  const [analyticsData, setAnalyticsData] = useState(null);

  // Initialize Data
  useEffect(() => {
    async function init() {
      try {
        const [yrsRes, clsRes, subRes, chapRes] = await Promise.all([
          getAcademicYears(), getClasses(), getSubjects(), getAllChapters()
        ]);
        setYears(yrsRes.data.data || []);
        setClasses(clsRes.data.classes || []);
        setSubjects(subRes.data.subjects || []);
        setChapters(chapRes.data.data || []);

        if (yrsRes.data.data?.length > 0) setSelectedYear(yrsRes.data.data[0]._id || yrsRes.data.data[0].year);
      } catch (err) {
        console.error("Initialization error:", err);
      }
    }
    init();
  }, []);

  // Fetch Templates
  const fetchTemplates = async () => {
    try {
      const res = await getAssessmentTemplates();
      setTemplates(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'templates') fetchTemplates();
  }, [activeTab]);

  // Fetch Plans & Assessments
  useEffect(() => {
    if (!selectedYear) return;
    async function fetchPlansAndAssessments() {
      try {
        const [plansRes, assRes] = await Promise.all([
          getAssessmentPlans(selectedYear),
          getAssessments(selectedYear)
        ]);
        setPlans(plansRes.data.data || []);
        setAssessments(assRes.data.data || []);
      } catch (err) {
        console.error(err);
      }
    }
    fetchPlansAndAssessments();
  }, [selectedYear]);

  // Fetch Assessment Subjects
  useEffect(() => {
    if (!selectedAssessment || !selectedClass) return;
    async function fetchAssSubjects() {
      try {
        const res = await getAssessmentSubjects(selectedAssessment, selectedClass);
        setAssSubjects(res.data.data || []);
      } catch (err) {
        console.error(err);
      }
    }
    fetchAssSubjects();
  }, [selectedAssessment, selectedClass]);

  // Fetch Student Marks Grid
  const loadMarksRegister = async (assSubId) => {
    try {
      setLoading(true);
      const res = await getMarksRegister(assSubId);
      const { students: stList, savedMarks } = res.data.data || { students: [], savedMarks: [] };
      setStudents(stList);

      const mapped = {};
      stList.forEach(s => {
        const saved = savedMarks.find(m => m.studentId === s._id);
        mapped[s._id] = {
          obtainedMarks: saved ? saved.obtainedMarks : 0,
          attendanceStatus: saved ? saved.attendanceStatus : 'present',
          remarks: saved ? saved.remarks : ''
        };
      });
      setMarks(mapped);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Autosave Marks triggers
  const handleMarkChange = (studentId, field, value) => {
    setMarks(prev => {
      const updated = {
        ...prev,
        [studentId]: {
          ...prev[studentId],
          [field]: value
        }
      };

      // Trigger Autosave
      if (autosaveTimer) clearTimeout(autosaveTimer);
      setSaveStatus('Saving changes...');
      const timer = setTimeout(async () => {
        try {
          const payload = {
            assessmentSubjectId: selectedSubject,
            marks: Object.entries(updated).map(([sId, record]) => ({
              studentId: sId,
              obtainedMarks: Number(record.obtainedMarks) || 0,
              attendanceStatus: record.attendanceStatus,
              remarks: record.remarks
            }))
          };
          await bulkSaveMarks(payload);
          setSaveStatus('Saved.');
        } catch (err) {
          setSaveStatus('Error saving.');
        }
      }, 1500);
      setAutosaveTimer(timer);

      return updated;
    });
  };

  // Setup Wizard: Clone Academic Year
  const handleCloneYear = async () => {
    try {
      setLoading(true);
      await copyPreviousYearPlan({ fromYearId: cloneSourceYear, toYearId: selectedYear });
      alert('Assessment structures cloned successfully!');
      const res = await getAssessmentPlans(selectedYear);
      setPlans(res.data.data || []);
    } catch (err) {
      alert('Error cloning config: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Analytics
  const loadAnalytics = async () => {
    if (!selectedAssessment || !selectedClass || !selectedSubject) return;
    try {
      const res = await getSubjectAnalyticsReport({
        assessmentId: selectedAssessment,
        classId: selectedClass,
        subjectId: selectedSubject
      });
      setAnalyticsData(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Common UI Styles mapped to global SSS variables
  const containerStyle = {
    backgroundColor: 'var(--background-color)',
    color: 'var(--text-color)',
    minHeight: '100vh',
    padding: '24px'
  };

  const headerCardStyle = {
    backgroundColor: 'var(--card-bg-color)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-color)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px'
  };

  const mainPanelStyle = {
    backgroundColor: 'var(--card-bg-color)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-color)',
    borderRadius: '12px',
    padding: '24px'
  };

  const inputStyle = {
    backgroundColor: 'var(--card-bg-color)',
    color: 'var(--text-color)',
    border: '1px solid var(--border-color)'
  };

  return (
    <div style={containerStyle}>
      
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center" style={headerCardStyle}>
        <div>
          <h2 className="fw-bold mb-1" style={{ color: 'var(--button-color)' }}>Configurable Academic Assessment Engine</h2>
          <p className="text-muted mb-0">EAV-backed Multi-tenant Enterprise Evaluation Platform</p>
        </div>
        
        {/* Global Year Filter */}
        <div className="d-flex align-items-center gap-2">
          <label className="fw-bold text-muted text-nowrap">Academic Year:</label>
          <select className="form-select" style={{ ...inputStyle, width: '200px' }} value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
            {years.map(yr => (
              <option key={yr._id} value={yr._id}>{yr.name || yr.year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Navigation Tabs */}
      <ul className="nav nav-tabs border-secondary mb-4 gap-2">
        {['templates', 'plans', 'subjects', 'marks', 'analytics'].map(tab => (
          <li className="nav-item" key={tab}>
            <button 
              className="nav-link text-capitalize fw-bold px-4 py-2 border-0 rounded-top"
              style={{
                backgroundColor: activeTab === tab ? 'var(--button-color)' : 'transparent',
                color: activeTab === tab ? '#ffffff' : 'var(--text-color)',
                opacity: activeTab === tab ? 1 : 0.6
              }}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'plans' ? 'Academic Plans' : tab}
            </button>
          </li>
        ))}
      </ul>

      {/* Tab Panels */}
      <div style={mainPanelStyle}>
        
        {/* 1. Templates Tab */}
        {activeTab === 'templates' && (
          <div>
            <div className="row g-4">
              <div className="col-md-4">
                <h5 className="fw-bold mb-3" style={{ color: 'var(--button-color)' }}>Create Blueprint Template</h5>
                <div className="card p-3" style={{ backgroundColor: 'var(--background-color)', borderColor: 'var(--border-color)', color: 'var(--text-color)' }}>
                  <div className="mb-3">
                    <label className="form-label text-muted">Template Name</label>
                    <input type="text" className="form-control" style={inputStyle} placeholder="e.g. Weekly Quiz" value={newTemplate.name} onChange={e => setNewTemplate({...newTemplate, name: e.target.value})} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-muted">Unique Code</label>
                    <input type="text" className="form-control" style={inputStyle} placeholder="e.g. W_QUIZ" value={newTemplate.code} onChange={e => setNewTemplate({...newTemplate, code: e.target.value})} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-muted">Assessment Type</label>
                    <select className="form-select" style={inputStyle} value={newTemplate.assessmentType} onChange={e => setNewTemplate({...newTemplate, assessmentType: e.target.value})}>
                      {['Weekly', 'Monthly', 'Unit', 'Quarterly', 'HalfYearly', 'Annual', 'Custom'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <button className="btn w-100" style={{ backgroundColor: 'var(--button-color)', color: '#fff' }} onClick={async () => {
                    await createAssessmentTemplate(newTemplate);
                    fetchTemplates();
                    setNewTemplate({ name: '', code: '', assessmentType: 'Weekly', defaultWeightage: 100 });
                  }}>Create Template</button>
                </div>
              </div>

              <div className="col-md-8">
                <h5 className="fw-bold mb-3" style={{ color: 'var(--button-color)' }}>Configured Templates</h5>
                <div className="table-responsive">
                  <table className="table table-bordered table-striped" style={{ color: 'var(--text-color)', borderColor: 'var(--border-color)' }}>
                    <thead style={{ backgroundColor: 'var(--table-header-bg)' }}>
                      <tr>
                        <th>Name</th>
                        <th>Code</th>
                        <th>Type</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {templates.map(t => (
                        <tr key={t._id}>
                          <td>{t.name}</td>
                          <td><code>{t.code}</code></td>
                          <td>{t.assessmentType}</td>
                          <td>
                            <button className="btn btn-sm btn-danger" onClick={async () => {
                              await deleteAssessmentTemplate(t._id);
                              fetchTemplates();
                            }}>Remove</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Plans Tab */}
        {activeTab === 'plans' && (
          <div>
            <div className="row g-4 mb-4">
              <div className="col-md-6">
                <div className="card p-3" style={{ backgroundColor: 'var(--background-color)', borderColor: 'var(--border-color)' }}>
                  <h6 className="fw-bold text-warning mb-3">Copy Previous Year configuration</h6>
                  <div className="d-flex gap-2">
                    <select className="form-select" style={inputStyle} value={cloneSourceYear} onChange={e => setCloneSourceYear(e.target.value)}>
                      <option value="">Select Source Year</option>
                      {years.map(yr => (
                        <option key={yr._id} value={yr._id}>{yr.name || yr.year}</option>
                      ))}
                    </select>
                    <button className="btn btn-warning text-nowrap" onClick={handleCloneYear}>Clone Structure</button>
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="card p-3" style={{ backgroundColor: 'var(--background-color)', borderColor: 'var(--border-color)' }}>
                  <h6 className="fw-bold mb-3" style={{ color: 'var(--button-color)' }}>New Plan Item</h6>
                  <div className="d-flex gap-2">
                    <select className="form-select" style={inputStyle} value={newPlan.templateId} onChange={e => setNewPlan({...newPlan, templateId: e.target.value})}>
                      <option value="">Select Template</option>
                      {templates.map(t => (
                        <option key={t._id} value={t._id}>{t.name}</option>
                      ))}
                    </select>
                    <input type="text" className="form-control" style={inputStyle} placeholder="Plan Label" value={newPlan.assessmentName} onChange={e => setNewPlan({...newPlan, assessmentName: e.target.value})} />
                    <button className="btn" style={{ backgroundColor: 'var(--button-color)', color: '#fff' }} onClick={async () => {
                      await createAssessmentPlan({ ...newPlan, academicYearId: selectedYear });
                      const plansRes = await getAssessmentPlans(selectedYear);
                      setPlans(plansRes.data.data || []);
                    }}>Add to Year</button>
                  </div>
                </div>
              </div>
            </div>

            <h5 className="fw-bold mb-3" style={{ color: 'var(--button-color)' }}>Generated Assessments</h5>
            <button className="btn btn-success mb-3" onClick={async () => {
              for (const p of plans) {
                await generateAssessments({
                  planId: p._id,
                  academicYearId: selectedYear,
                  assessmentName: p.assessmentName
                });
              }
              const assRes = await getAssessments(selectedYear);
              setAssessments(assRes.data.data || []);
            }}>Generate Scheduled Assessments</button>

            <div className="table-responsive">
              <table className="table table-bordered table-striped" style={{ color: 'var(--text-color)', borderColor: 'var(--border-color)' }}>
                <thead style={{ backgroundColor: 'var(--table-header-bg)' }}>
                  <tr>
                    <th>Assessment Name</th>
                    <th>Status</th>
                    <th>Lock State</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assessments.map(ass => (
                    <tr key={ass._id}>
                      <td>{ass.assessmentName}</td>
                      <td><span className="badge bg-info">{ass.status}</span></td>
                      <td>
                        <span className={`badge ${ass.isLocked ? 'bg-danger' : 'bg-success'}`}>
                          {ass.isLocked ? 'Locked' : 'Unlocked'}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-sm btn-outline-warning me-2" onClick={async () => {
                          await updateAssessment(ass._id, { isLocked: !ass.isLocked });
                          const assRes = await getAssessments(selectedYear);
                          setAssessments(assRes.data.data || []);
                        }}>{ass.isLocked ? 'Unlock (Admin)' : 'Lock'}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. Subjects Setup Tab */}
        {activeTab === 'subjects' && (
          <div>
            <div className="row g-3 mb-4">
              <div className="col-md-3">
                <label className="text-muted">Assessment</label>
                <select className="form-select" style={inputStyle} value={selectedAssessment} onChange={e => setSelectedAssessment(e.target.value)}>
                  <option value="">Select Assessment</option>
                  {assessments.map(ass => (
                    <option key={ass._id} value={ass._id}>{ass.assessmentName}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <label className="text-muted">Class</label>
                <select className="form-select" style={inputStyle} value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                  <option value="">Select Class</option>
                  {classes.map(c => (
                    <option key={c._id} value={c._id}>Class {c.class}</option>
                  ))}
                </select>
              </div>
            </div>

            {selectedAssessment && selectedClass && (
              <div className="row g-4">
                <div className="col-md-4">
                  <h6 className="fw-bold mb-3" style={{ color: 'var(--button-color)' }}>Map Subject Configurations</h6>
                  <div className="card p-3" style={{ backgroundColor: 'var(--background-color)', borderColor: 'var(--border-color)' }}>
                    <div className="mb-3">
                      <label className="form-label">Subject</label>
                      <select className="form-select" style={inputStyle} value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
                        <option value="">Select Subject</option>
                        {subjects.map(sub => (
                          <option key={sub._id} value={sub._id}>{sub.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="row g-2 mb-3">
                      <div className="col">
                        <label className="form-label">Max Marks</label>
                        <input type="number" className="form-control" style={inputStyle} value={newAssSub.maximumMarks} onChange={e => setNewAssSub({...newAssSub, maximumMarks: Number(e.target.value)})} />
                      </div>
                      <div className="col">
                        <label className="form-label">Min Pass Marks</label>
                        <input type="number" className="form-control" style={inputStyle} value={newAssSub.passingMarks} onChange={e => setNewAssSub({...newAssSub, passingMarks: Number(e.target.value)})} />
                      </div>
                    </div>
                    <button className="btn w-100" style={{ backgroundColor: 'var(--button-color)', color: '#fff' }} onClick={async () => {
                      await saveAssessmentSubject({
                        assessmentId: selectedAssessment,
                        classId: selectedClass,
                        subjectId: selectedSubject,
                        maximumMarks: newAssSub.maximumMarks,
                        passingMarks: newAssSub.passingMarks,
                        selectedChapterIds: newAssSub.selectedChapterIds
                      });
                      const res = await getAssessmentSubjects(selectedAssessment, selectedClass);
                      setAssSubjects(res.data.data || []);
                    }}>Save Config</button>
                  </div>
                </div>

                <div className="col-md-8">
                  <h6 className="fw-bold mb-3" style={{ color: 'var(--button-color)' }}>Subject syllabus details</h6>
                  <div className="table-responsive">
                    <table className="table table-bordered table-striped" style={{ color: 'var(--text-color)', borderColor: 'var(--border-color)' }}>
                      <thead style={{ backgroundColor: 'var(--table-header-bg)' }}>
                        <tr>
                          <th>Subject</th>
                          <th>Max Marks</th>
                          <th>Passing Marks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assSubjects.map(sub => (
                          <tr key={sub._id}>
                            <td>{sub.subjectId?.name}</td>
                            <td>{sub.maximumMarks}</td>
                            <td>{sub.passingMarks}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. Marks Tab */}
        {activeTab === 'marks' && (
          <div>
            <div className="row g-3 mb-4">
              <div className="col-md-4">
                <label className="text-muted">Assessment</label>
                <select className="form-select" style={inputStyle} value={selectedAssessment} onChange={e => setSelectedAssessment(e.target.value)}>
                  <option value="">Select Assessment</option>
                  {assessments.map(ass => (
                    <option key={ass._id} value={ass._id}>{ass.assessmentName}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <label className="text-muted">Class</label>
                <select className="form-select" style={inputStyle} value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                  <option value="">Select Class</option>
                  {classes.map(c => (
                    <option key={c._id} value={c._id}>Class {c.class}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <label className="text-muted">Subject Config</label>
                <select className="form-select" style={inputStyle} value={selectedSubject} onChange={e => {
                  setSelectedSubject(e.target.value);
                  loadMarksRegister(e.target.value);
                }}>
                  <option value="">Select Subject Link</option>
                  {assSubjects.map(sub => (
                    <option key={sub._id} value={sub._id}>{sub.subjectId?.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {selectedSubject && (
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="fw-bold m-0" style={{ color: 'var(--button-color)' }}>Student Marks Register</h6>
                  <span className="text-warning fw-bold">{saveStatus}</span>
                </div>
                
                <div className="table-responsive">
                  <table className="table table-bordered table-striped text-center" style={{ color: 'var(--text-color)', borderColor: 'var(--border-color)' }}>
                    <thead style={{ backgroundColor: 'var(--table-header-bg)' }}>
                      <tr>
                        <th>Student Name</th>
                        <th>Roll Code</th>
                        <th>Status</th>
                        <th>Obtained Marks</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map(s => {
                        const record = marks[s._id] || { obtainedMarks: 0, attendanceStatus: 'present', remarks: '' };
                        return (
                          <tr key={s._id}>
                            <td>{s.name}</td>
                            <td><code>{s.studentCode}</code></td>
                            <td>
                              <select className="form-select form-select-sm bg-dark text-white border-secondary w-auto mx-auto" style={inputStyle} value={record.attendanceStatus} onChange={e => handleMarkChange(s._id, 'attendanceStatus', e.target.value)}>
                                <option value="present">Present</option>
                                <option value="absent">Absent</option>
                              </select>
                            </td>
                            <td>
                              <input 
                                type="number" 
                                className="form-control form-control-sm bg-transparent text-white border-secondary w-50 mx-auto text-center" 
                                style={inputStyle}
                                disabled={record.attendanceStatus === 'absent'}
                                value={record.obtainedMarks} 
                                onChange={e => handleMarkChange(s._id, 'obtainedMarks', e.target.value)} 
                              />
                            </td>
                            <td>
                              <input type="text" className="form-control form-control-sm bg-transparent text-white border-secondary mx-auto" style={inputStyle} placeholder="Remarks" value={record.remarks} onChange={e => handleMarkChange(s._id, 'remarks', e.target.value)} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5. Analytics Tab */}
        {activeTab === 'analytics' && (
          <div>
            <div className="row g-3 mb-4">
              <div className="col-md-3">
                <label className="text-muted">Assessment</label>
                <select className="form-select" style={inputStyle} value={selectedAssessment} onChange={e => setSelectedAssessment(e.target.value)}>
                  <option value="">Select Assessment</option>
                  {assessments.map(ass => (
                    <option key={ass._id} value={ass._id}>{ass.assessmentName}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <label className="text-muted">Class</label>
                <select className="form-select" style={inputStyle} value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                  <option value="">Select Class</option>
                  {classes.map(c => (
                    <option key={c._id} value={c._id}>Class {c.class}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <label className="text-muted">Subject Link</label>
                <select className="form-select" style={inputStyle} value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
                  <option value="">Select Subject</option>
                  {assSubjects.map(sub => (
                    <option key={sub._id} value={sub.subjectId?._id}>{sub.subjectId?.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-3 d-flex align-items-end">
                <button className="btn w-100" style={{ backgroundColor: 'var(--button-color)', color: '#fff' }} onClick={loadAnalytics}>Load Analytics</button>
              </div>
            </div>

            {analyticsData && (
              <div>
                <div className="row g-4 mb-4">
                  {[
                    { title: 'Average Score', value: analyticsData.average, color: 'var(--button-color)' },
                    { title: 'Highest Marks', value: analyticsData.highest, color: 'var(--success-button-color)' },
                    { title: 'Lowest Marks', value: analyticsData.lowest, color: 'var(--delete-button-color)' },
                    { title: 'Pass Percentage', value: `${analyticsData.passPercentage}%`, color: 'var(--edit-button-color)' }
                  ].map((stat, i) => (
                    <div className="col-md-3" key={i}>
                      <div className="card p-3 text-white border-0 shadow-sm" style={{ backgroundColor: 'var(--background-color)', borderLeft: `5px solid ${stat.color}` }}>
                        <span className="text-muted text-uppercase small">{stat.title}</span>
                        <h3 className="fw-bold mt-2 mb-0" style={{ color: stat.color }}>{stat.value}</h3>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="row g-4">
                  <div className="col-md-6">
                    <h6 className="fw-bold text-muted mb-3">Pass vs Fail Ratio</h6>
                    <div style={{ height: '300px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                          { name: 'Pass %', percentage: analyticsData.passPercentage, fill: 'var(--success-button-color)' },
                          { name: 'Fail %', percentage: analyticsData.failPercentage, fill: 'var(--delete-button-color)' }
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                          <XAxis dataKey="name" stroke="var(--text-color)" />
                          <YAxis stroke="var(--text-color)" />
                          <Tooltip contentStyle={{ backgroundColor: 'var(--card-bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-color)' }} />
                          <Bar dataKey="percentage" fill="var(--button-color)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <h6 className="fw-bold text-muted mb-3">Overall performance distribution</h6>
                    <div style={{ height: '300px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                          { subject: 'Average', value: analyticsData.average },
                          { subject: 'Median', value: analyticsData.median },
                          { subject: 'Highest', value: analyticsData.highest },
                          { subject: 'StdDev', value: analyticsData.stdDev }
                        ]}>
                          <PolarGrid stroke="var(--border-color)" />
                          <PolarAngleAxis dataKey="subject" stroke="var(--text-color)" />
                          <PolarRadiusAxis stroke="var(--text-color)" />
                          <Radar name="Performance metrics" dataKey="value" stroke="var(--button-color)" fill="var(--button-color)" fillOpacity={0.6} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
