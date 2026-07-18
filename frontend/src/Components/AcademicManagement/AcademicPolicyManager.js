import React, { useState, useEffect } from 'react';
import api, { getAcademicYears } from '../../API';
import './CSS/AcademicPolicyManager.css';

export default function AcademicPolicyManager({ back }) {
  const [policies, setPolicies] = useState([]);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');

  // Fallback default model state
  const getNewPolicyTemplate = (yearId) => ({
    name: 'New Academic Policy',
    description: '',
    academicYearId: yearId || '',
    status: 'draft',
    isDefault: false,
    effectiveFrom: new Date().toISOString().split('T')[0],
    effectiveUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    grading: {
      strategy: 'percentage',
      passPercentage: 33,
      gradeRanges: [
        { grade: 'A1', minScore: 91, maxScore: 100, gradePoint: 10, remarks: 'Outstanding', displayColor: '#10b981' },
        { grade: 'A2', minScore: 81, maxScore: 90, gradePoint: 9, remarks: 'Excellent', displayColor: '#3b82f6' },
        { grade: 'B1', minScore: 71, maxScore: 80, gradePoint: 8, remarks: 'Very Good', displayColor: '#60a5fa' },
        { grade: 'B2', minScore: 61, maxScore: 70, gradePoint: 7, remarks: 'Good', displayColor: '#34d399' },
        { grade: 'C1', minScore: 51, maxScore: 60, gradePoint: 6, remarks: 'Above Average', displayColor: '#fbbf24' },
        { grade: 'C2', minScore: 41, maxScore: 50, gradePoint: 5, remarks: 'Average', displayColor: '#f59e0b' },
        { grade: 'D', minScore: 33, maxScore: 40, gradePoint: 4, remarks: 'Fair Pass', displayColor: '#f97316' },
        { grade: 'E', minScore: 0, maxScore: 32, gradePoint: 0, remarks: 'Needs Improvement', displayColor: '#ef4444' }
      ]
    },
    ranking: {
      enabled: true,
      strategy: 'highest_average',
      tieBreaker: 'attendance',
      style: 'competition'
    },
    standing: [
      { standing: 'Excellent', minAverage: 75, maxAverage: 100, remarks: 'Outstanding Standing', displayColor: '#10b981', icon: 'fa-star' },
      { standing: 'Good', minAverage: 60, maxAverage: 74.9, remarks: 'Good Standing', displayColor: '#3b82f6', icon: 'fa-thumbs-up' },
      { standing: 'Average', minAverage: 45, maxAverage: 59.9, remarks: 'Average Standing', displayColor: '#fbbf24', icon: 'fa-circle' },
      { standing: 'Needs Improvement', minAverage: 0, maxAverage: 44.9, remarks: 'Assistance Needed', displayColor: '#ef4444', icon: 'fa-triangle-exclamation' }
    ],
    risk: {
      enabled: true,
      levels: [
        { level: 'High', minAttendance: 75, minAverage: 35, maxFailedSubjects: 2, maxConsecutiveAbsentDays: 5, feeDueThreshold: 0 },
        { level: 'Medium', minAttendance: 85, minAverage: 45, maxFailedSubjects: 1, maxConsecutiveAbsentDays: 3, feeDueThreshold: 0 }
      ]
    },
    promotion: {
      minAttendance: 75,
      minAverage: 35,
      mandatorySubjects: [],
      maxFailedSubjects: 1,
      graceMarksLimit: 5,
      condonationLimit: 5
    },
    gpa: {
      enabled: false,
      scale: 10,
      passingGradePoints: 4
    },
    awards: {
      mostImprovedMinDelta: 5,
      perfectAttendancePercent: 100
    },
    reportCard: {
      showRank: true,
      showGPA: false,
      showGrade: true,
      showRemarks: true,
      showGraphs: true
    },
    transcript: {
      showCredits: false,
      showCGPA: false,
      classificationSystem: 'GPA Scale'
    }
  });

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      fetchPolicies(selectedYear);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear]);

  const fetchAcademicYears = async () => {
    try {
      const res = await getAcademicYears();
      const years = res.data.data || res.data || [];
      setAcademicYears(years);
      if (years.length > 0) {
        // Fallback to active year or first year in list
        const active = years.find(y => y.status === 'active' || y.isActive);
        setSelectedYear(active?._id || years[0]._id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPolicies = async (yearId) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/metadata/academic-policies?academicYearId=${yearId}`);
      const data = res.data.data || res.data || [];
      setPolicies(data);
      if (data.length > 0) {
        setSelectedPolicy(JSON.parse(JSON.stringify(data[0])));
      } else {
        setSelectedPolicy(getNewPolicyTemplate(yearId));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedPolicy.name) return alert('Policy Name is required.');
    setSaving(true);
    try {
      if (selectedPolicy._id) {
        await api.put(`/api/metadata/academic-policies/${selectedPolicy._id}`, selectedPolicy);
      } else {
        const res = await api.post('/api/metadata/academic-policies', selectedPolicy);
        const saved = res.data.data || res.data;
        setSelectedPolicy(saved);
      }
      alert('Academic policy saved successfully!');
      fetchPolicies(selectedYear);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to save policy');
    } finally {
      setSaving(false);
    }
  };

  const handleNewPolicy = () => {
    setSelectedPolicy(getNewPolicyTemplate(selectedYear));
    setActiveTab('general');
  };

  const handleFieldChange = (section, field, val) => {
    setSelectedPolicy(prev => {
      const next = { ...prev };
      if (!field) {
        next[section] = val;
      } else {
        next[section] = {
          ...next[section],
          [field]: val
        };
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="policy-loading-container">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2 text-muted">Loading Academic Policy Workspace...</p>
      </div>
    );
  }

  return (
    <div className="policy-manager-layout">
      {/* Top action bar */}
      <div className="policy-header-bar d-flex justify-content-between align-items-center mb-4 p-3 bg-white border rounded shadow-sm">
        <div className="d-flex align-items-center gap-3">
          <select 
            className="form-select w-auto fw-semibold"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            {academicYears.map(y => (
              <option key={y._id} value={y._id}>{y.name || y.title}</option>
            ))}
          </select>
          <select
            className="form-select w-auto fw-semibold"
            value={selectedPolicy?._id || ''}
            onChange={(e) => {
              const matched = policies.find(p => p._id === e.target.value);
              if (matched) {
                setSelectedPolicy(JSON.parse(JSON.stringify(matched)));
              }
            }}
          >
            <option value="">-- Working Draft --</option>
            {policies.map(p => (
              <option key={p._id} value={p._id}>{p.name} {p.isDefault ? '(Default)' : ''}</option>
            ))}
          </select>
          <button className="btn btn-sm btn-outline-primary" onClick={handleNewPolicy}>
            <i className="fa-solid fa-plus me-1"></i> New Policy
          </button>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-light" onClick={back}>Close</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Policy'}
          </button>
        </div>
      </div>

      {selectedPolicy && (
        <div className="policy-workspace-container d-flex gap-4">
          {/* Left Tabs panel */}
          <div className="policy-sidebar bg-white border rounded p-2">
            {[
              { id: 'general', label: 'General Info', icon: 'fa-info-circle' },
              { id: 'grading', label: 'Grading Scales', icon: 'fa-award' },
              { id: 'ranking', label: 'Rank Strategy', icon: 'fa-list-ol' },
              { id: 'standing', label: 'Student Standings', icon: 'fa-arrows-down-to-people' },
              { id: 'risk', label: 'At Risk Rules', icon: 'fa-triangle-exclamation' },
              { id: 'promotion', label: 'Promotion Matrix', icon: 'fa-graduation-cap' },
              { id: 'gpa', label: 'GPA Scales', icon: 'fa-percent' },
              { id: 'reportCard', label: 'Report Cards', icon: 'fa-file-invoice' }
            ].map(tab => (
              <button
                key={tab.id}
                className={`policy-sidebar-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <i className={`fa-solid ${tab.icon}`}></i>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Configuration Forms */}
          <div className="policy-content-panel flex-grow-1 bg-white border rounded p-4 shadow-sm">
            {activeTab === 'general' && (
              <div className="policy-section-form">
                <h5 className="fw-bold mb-4">General Configuration</h5>
                <div className="mb-3">
                  <label className="form-label text-muted small fw-bold text-uppercase">Policy Title</label>
                  <input
                    type="text"
                    className="form-control"
                    value={selectedPolicy.name || ''}
                    onChange={(e) => handleFieldChange('name', null, e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label text-muted small fw-bold text-uppercase">Description</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={selectedPolicy.description || ''}
                    onChange={(e) => handleFieldChange('description', null, e.target.value)}
                  />
                </div>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label text-muted small fw-bold text-uppercase">Effective From</label>
                    <input
                      type="date"
                      className="form-control"
                      value={selectedPolicy.effectiveFrom ? selectedPolicy.effectiveFrom.split('T')[0] : ''}
                      onChange={(e) => handleFieldChange('effectiveFrom', null, e.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label text-muted small fw-bold text-uppercase">Effective Until</label>
                    <input
                      type="date"
                      className="form-control"
                      value={selectedPolicy.effectiveUntil ? selectedPolicy.effectiveUntil.split('T')[0] : ''}
                      onChange={(e) => handleFieldChange('effectiveUntil', null, e.target.value)}
                    />
                  </div>
                </div>
                <div className="d-flex align-items-center gap-4 mt-4 pt-3 border-top">
                  <div className="form-check form-switch">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="policy-default"
                      checked={!!selectedPolicy.isDefault}
                      onChange={(e) => handleFieldChange('isDefault', null, e.target.checked)}
                    />
                    <label htmlFor="policy-default" className="form-check-label fw-semibold">Set as Active Default Policy</label>
                  </div>
                  <div className="form-check form-switch">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="policy-active"
                      checked={selectedPolicy.status === 'active'}
                      onChange={(e) => handleFieldChange('status', null, e.target.checked ? 'active' : 'draft')}
                    />
                    <label htmlFor="policy-active" className="form-check-label fw-semibold">Activate Policy Status</label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'grading' && (
              <div className="policy-section-form">
                <h5 className="fw-bold mb-4">Grading & Pass Rules</h5>
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label className="form-label text-muted small fw-bold text-uppercase">Grading Scheme Strategy</label>
                    <select
                      className="form-select"
                      value={selectedPolicy.grading?.strategy || 'percentage'}
                      onChange={(e) => handleFieldChange('grading', 'strategy', e.target.value)}
                    >
                      <option value="percentage">Percentage Based</option>
                      <option value="points">Points Based</option>
                      <option value="gpa">GPA Based</option>
                      <option value="hybrid">Hybrid Schema</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label text-muted small fw-bold text-uppercase">Global Minimum Pass Rate (%)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={selectedPolicy.grading?.passPercentage || 33}
                      onChange={(e) => handleFieldChange('grading', 'passPercentage', Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="fw-bold m-0 text-secondary">Grade Boundary Intervals</h6>
                  <button 
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => {
                      const ranges = [...(selectedPolicy.grading?.gradeRanges || [])];
                      ranges.push({ grade: 'New', minScore: 0, maxScore: 10, gradePoint: 0, remarks: '', displayColor: '#3b82f6' });
                      handleFieldChange('grading', 'gradeRanges', ranges);
                    }}
                  >
                    Add Grade Rule
                  </button>
                </div>

                <div className="table-responsive">
                  <table className="table table-bordered align-middle text-center small">
                    <thead className="table-light">
                      <tr>
                        <th>Grade</th>
                        <th>Min Marks (%)</th>
                        <th>Max Marks (%)</th>
                        <th>Grade Points</th>
                        <th>Remarks</th>
                        <th>Badge Color</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedPolicy.grading?.gradeRanges || []).map((range, idx) => (
                        <tr key={idx}>
                          <td>
                            <input 
                              type="text" 
                              className="form-control form-control-sm text-center fw-bold"
                              value={range.grade}
                              onChange={(e) => {
                                const ranges = [...selectedPolicy.grading.gradeRanges];
                                ranges[idx].grade = e.target.value;
                                handleFieldChange('grading', 'gradeRanges', ranges);
                              }}
                            />
                          </td>
                          <td>
                            <input 
                              type="number" 
                              className="form-control form-control-sm text-center"
                              value={range.minScore}
                              onChange={(e) => {
                                const ranges = [...selectedPolicy.grading.gradeRanges];
                                ranges[idx].minScore = Number(e.target.value);
                                handleFieldChange('grading', 'gradeRanges', ranges);
                              }}
                            />
                          </td>
                          <td>
                            <input 
                              type="number" 
                              className="form-control form-control-sm text-center"
                              value={range.maxScore}
                              onChange={(e) => {
                                const ranges = [...selectedPolicy.grading.gradeRanges];
                                ranges[idx].maxScore = Number(e.target.value);
                                handleFieldChange('grading', 'gradeRanges', ranges);
                              }}
                            />
                          </td>
                          <td>
                            <input 
                              type="number" 
                              className="form-control form-control-sm text-center"
                              value={range.gradePoint}
                              onChange={(e) => {
                                const ranges = [...selectedPolicy.grading.gradeRanges];
                                ranges[idx].gradePoint = Number(e.target.value);
                                handleFieldChange('grading', 'gradeRanges', ranges);
                              }}
                            />
                          </td>
                          <td>
                            <input 
                              type="text" 
                              className="form-control form-control-sm"
                              value={range.remarks || ''}
                              onChange={(e) => {
                                const ranges = [...selectedPolicy.grading.gradeRanges];
                                ranges[idx].remarks = e.target.value;
                                handleFieldChange('grading', 'gradeRanges', ranges);
                              }}
                            />
                          </td>
                          <td>
                            <input 
                              type="color" 
                              className="form-control form-control-color form-control-sm mx-auto"
                              value={range.displayColor || '#3b82f6'}
                              onChange={(e) => {
                                const ranges = [...selectedPolicy.grading.gradeRanges];
                                ranges[idx].displayColor = e.target.value;
                                handleFieldChange('grading', 'gradeRanges', ranges);
                              }}
                            />
                          </td>
                          <td>
                            <button 
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => {
                                const ranges = selectedPolicy.grading.gradeRanges.filter((_, rIdx) => rIdx !== idx);
                                handleFieldChange('grading', 'gradeRanges', ranges);
                              }}
                            >
                              <i className="fa-solid fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'ranking' && (
              <div className="policy-section-form">
                <h5 className="fw-bold mb-4">Class Rank Generation Rules</h5>
                <div className="form-check form-switch mb-4">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="ranking-enabled"
                    checked={!!selectedPolicy.ranking?.enabled}
                    onChange={(e) => handleFieldChange('ranking', 'enabled', e.target.checked)}
                  />
                  <label htmlFor="ranking-enabled" className="form-check-label fw-bold">Enable Ranking System</label>
                </div>

                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label text-muted small fw-bold text-uppercase">Sorting Metric</label>
                    <select
                      className="form-select"
                      value={selectedPolicy.ranking?.strategy || 'highest_average'}
                      onChange={(e) => handleFieldChange('ranking', 'strategy', e.target.value)}
                      disabled={!selectedPolicy.ranking?.enabled}
                    >
                      <option value="highest_average">Highest Average Marks</option>
                      <option value="highest_gpa">Highest Overall GPA</option>
                      <option value="weighted_average">Weighted Assessment Average</option>
                      <option value="best_of_five">Best Of 5 Subjects</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label text-muted small fw-bold text-uppercase">Primary Tie Breaker</label>
                    <select
                      className="form-select"
                      value={selectedPolicy.ranking?.tieBreaker || 'attendance'}
                      onChange={(e) => handleFieldChange('ranking', 'tieBreaker', e.target.value)}
                      disabled={!selectedPolicy.ranking?.enabled}
                    >
                      <option value="attendance">Class Attendance (%)</option>
                      <option value="age">Age (Youngest First)</option>
                      <option value="alphabetical">Name (Alphabetical)</option>
                      <option value="none">No Tie Breaker</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label text-muted small fw-bold text-uppercase">Ranking Layout Style</label>
                    <select
                      className="form-select"
                      value={selectedPolicy.ranking?.style || 'competition'}
                      onChange={(e) => handleFieldChange('ranking', 'style', e.target.value)}
                      disabled={!selectedPolicy.ranking?.enabled}
                    >
                      <option value="competition">Standard (1, 2, 2, 4)</option>
                      <option value="dense">Dense (1, 2, 2, 3)</option>
                      <option value="ordinal">Ordinal (1, 2, 3, 4)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'standing' && (
              <div className="policy-section-form">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h5 className="fw-bold m-0">Student Standing Categories</h5>
                  <button 
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => {
                      const items = [...(selectedPolicy.standing || [])];
                      items.push({ standing: 'New Standing', minAverage: 0, maxAverage: 10, remarks: '', displayColor: '#10b981', icon: 'fa-circle' });
                      handleFieldChange('standing', null, items);
                    }}
                  >
                    Add Standing Rule
                  </button>
                </div>

                <div className="table-responsive">
                  <table className="table table-bordered align-middle text-center small">
                    <thead className="table-light">
                      <tr>
                        <th>Standing Label</th>
                        <th>Min Average (%)</th>
                        <th>Max Average (%)</th>
                        <th>Icon class (FontAwesome)</th>
                        <th>Badge Color</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedPolicy.standing || []).map((item, idx) => (
                        <tr key={idx}>
                          <td>
                            <input 
                              type="text" 
                              className="form-control form-control-sm text-center fw-bold"
                              value={item.standing}
                              onChange={(e) => {
                                const list = [...selectedPolicy.standing];
                                list[idx].standing = e.target.value;
                                handleFieldChange('standing', null, list);
                              }}
                            />
                          </td>
                          <td>
                            <input 
                              type="number" 
                              className="form-control form-control-sm text-center"
                              value={item.minAverage}
                              onChange={(e) => {
                                const list = [...selectedPolicy.standing];
                                list[idx].minAverage = Number(e.target.value);
                                handleFieldChange('standing', null, list);
                              }}
                            />
                          </td>
                          <td>
                            <input 
                              type="number" 
                              className="form-control form-control-sm text-center"
                              value={item.maxAverage}
                              onChange={(e) => {
                                const list = [...selectedPolicy.standing];
                                list[idx].maxAverage = Number(e.target.value);
                                handleFieldChange('standing', null, list);
                              }}
                            />
                          </td>
                          <td>
                            <input 
                              type="text" 
                              className="form-control form-control-sm text-center"
                              value={item.icon || ''}
                              onChange={(e) => {
                                const list = [...selectedPolicy.standing];
                                list[idx].icon = e.target.value;
                                handleFieldChange('standing', null, list);
                              }}
                            />
                          </td>
                          <td>
                            <input 
                              type="color" 
                              className="form-control form-control-color form-control-sm mx-auto"
                              value={item.displayColor || '#10b981'}
                              onChange={(e) => {
                                const list = [...selectedPolicy.standing];
                                list[idx].displayColor = e.target.value;
                                handleFieldChange('standing', null, list);
                              }}
                            />
                          </td>
                          <td>
                            <button 
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => {
                                const list = selectedPolicy.standing.filter((_, sIdx) => sIdx !== idx);
                                handleFieldChange('standing', null, list);
                              }}
                            >
                              <i className="fa-solid fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'risk' && (
              <div className="policy-section-form">
                <h5 className="fw-bold mb-4">Academic At-Risk Classifications</h5>
                <div className="form-check form-switch mb-4">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="risk-enabled"
                    checked={!!selectedPolicy.risk?.enabled}
                    onChange={(e) => handleFieldChange('risk', 'enabled', e.target.checked)}
                  />
                  <label htmlFor="risk-enabled" className="form-check-label fw-bold">Enable At-Risk Flag Engine</label>
                </div>

                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="fw-bold m-0 text-secondary">Risk Level Criteria Settings</h6>
                  <button 
                    className="btn btn-sm btn-outline-primary"
                    disabled={!selectedPolicy.risk?.enabled}
                    onClick={() => {
                      const list = [...(selectedPolicy.risk?.levels || [])];
                      list.push({ level: 'High', minAttendance: 75, minAverage: 45, maxFailedSubjects: 1, maxConsecutiveAbsentDays: 3, feeDueThreshold: 0 });
                      handleFieldChange('risk', 'levels', list);
                    }}
                  >
                    Add Risk Level
                  </button>
                </div>

                <div className="table-responsive">
                  <table className="table table-bordered align-middle text-center small">
                    <thead className="table-light">
                      <tr>
                        <th>Risk Level</th>
                        <th>Min Attendance Required (%)</th>
                        <th>Min Exam Average Required (%)</th>
                        <th>Max Failed Subjects</th>
                        <th>Max Consecutive Absent Days</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedPolicy.risk?.levels || []).map((level, idx) => (
                        <tr key={idx}>
                          <td className="fw-bold text-danger">{level.level}</td>
                          <td>
                            <input 
                              type="number" 
                              className="form-control form-control-sm text-center"
                              value={level.minAttendance}
                              disabled={!selectedPolicy.risk?.enabled}
                              onChange={(e) => {
                                const list = [...selectedPolicy.risk.levels];
                                list[idx].minAttendance = Number(e.target.value);
                                handleFieldChange('risk', 'levels', list);
                              }}
                            />
                          </td>
                          <td>
                            <input 
                              type="number" 
                              className="form-control form-control-sm text-center"
                              value={level.minAverage}
                              disabled={!selectedPolicy.risk?.enabled}
                              onChange={(e) => {
                                const list = [...selectedPolicy.risk.levels];
                                list[idx].minAverage = Number(e.target.value);
                                handleFieldChange('risk', 'levels', list);
                              }}
                            />
                          </td>
                          <td>
                            <input 
                              type="number" 
                              className="form-control form-control-sm text-center"
                              value={level.maxFailedSubjects}
                              disabled={!selectedPolicy.risk?.enabled}
                              onChange={(e) => {
                                const list = [...selectedPolicy.risk.levels];
                                list[idx].maxFailedSubjects = Number(e.target.value);
                                handleFieldChange('risk', 'levels', list);
                              }}
                            />
                          </td>
                          <td>
                            <input 
                              type="number" 
                              className="form-control form-control-sm text-center"
                              value={level.maxConsecutiveAbsentDays}
                              disabled={!selectedPolicy.risk?.enabled}
                              onChange={(e) => {
                                const list = [...selectedPolicy.risk.levels];
                                list[idx].maxConsecutiveAbsentDays = Number(e.target.value);
                                handleFieldChange('risk', 'levels', list);
                              }}
                            />
                          </td>
                          <td>
                            <button 
                              className="btn btn-sm btn-outline-danger"
                              disabled={!selectedPolicy.risk?.enabled}
                              onClick={() => {
                                const list = selectedPolicy.risk.levels.filter((_, lIdx) => lIdx !== idx);
                                handleFieldChange('risk', 'levels', list);
                              }}
                            >
                              <i className="fa-solid fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'promotion' && (
              <div className="policy-section-form">
                <h5 className="fw-bold mb-4">Promotion Standards Config</h5>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label text-muted small fw-bold text-uppercase">Min Attendance for Promotion (%)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={selectedPolicy.promotion?.minAttendance || 75}
                      onChange={(e) => handleFieldChange('promotion', 'minAttendance', Number(e.target.value))}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label text-muted small fw-bold text-uppercase">Min Subject Average (%)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={selectedPolicy.promotion?.minAverage || 35}
                      onChange={(e) => handleFieldChange('promotion', 'minAverage', Number(e.target.value))}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label text-muted small fw-bold text-uppercase">Max Failed Subjects Allowed</label>
                    <input
                      type="number"
                      className="form-control"
                      value={selectedPolicy.promotion?.maxFailedSubjects || 1}
                      onChange={(e) => handleFieldChange('promotion', 'maxFailedSubjects', Number(e.target.value))}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label text-muted small fw-bold text-uppercase">Grace Marks Upper Limit</label>
                    <input
                      type="number"
                      className="form-control"
                      value={selectedPolicy.promotion?.graceMarksLimit || 5}
                      onChange={(e) => handleFieldChange('promotion', 'graceMarksLimit', Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'gpa' && (
              <div className="policy-section-form">
                <h5 className="fw-bold mb-4">GPA Evaluation settings</h5>
                <div className="form-check form-switch mb-4">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="gpa-enabled"
                    checked={!!selectedPolicy.gpa?.enabled}
                    onChange={(e) => handleFieldChange('gpa', 'enabled', e.target.checked)}
                  />
                  <label htmlFor="gpa-enabled" className="form-check-label fw-bold">Enable GPA Credit Scale system</label>
                </div>

                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label text-muted small fw-bold text-uppercase">GPA Scale system</label>
                    <select
                      className="form-select"
                      value={selectedPolicy.gpa?.scale || 10}
                      disabled={!selectedPolicy.gpa?.enabled}
                      onChange={(e) => handleFieldChange('gpa', 'scale', Number(e.target.value))}
                    >
                      <option value="4">4.0 Scale System</option>
                      <option value="5">5.0 Scale System</option>
                      <option value="10">10.0 Scale System</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label text-muted small fw-bold text-uppercase">Minimum Grade points for promotion</label>
                    <input
                      type="number"
                      className="form-control"
                      value={selectedPolicy.gpa?.passingGradePoints || 4}
                      disabled={!selectedPolicy.gpa?.enabled}
                      onChange={(e) => handleFieldChange('gpa', 'passingGradePoints', Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'reportCard' && (
              <div className="policy-section-form">
                <h5 className="fw-bold mb-4">Report Card Display Layout Settings</h5>
                <div className="row g-3">
                  {[
                    { id: 'showRank', label: 'Show Rank Position on Report Cards' },
                    { id: 'showGPA', label: 'Show GPA stats on Report Cards' },
                    { id: 'showGrade', label: 'Show Letter Grade column' },
                    { id: 'showRemarks', label: 'Show Teacher Remarks area' },
                    { id: 'showGraphs', label: 'Show Performance comparison charts' }
                  ].map(option => (
                    <div className="col-md-6" key={option.id}>
                      <div className="form-check form-switch p-3 border rounded">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id={`rc-${option.id}`}
                          checked={!!selectedPolicy.reportCard?.[option.id]}
                          onChange={(e) => handleFieldChange('reportCard', option.id, e.target.checked)}
                        />
                        <label htmlFor={`rc-${option.id}`} className="form-check-label fw-semibold">{option.label}</label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
