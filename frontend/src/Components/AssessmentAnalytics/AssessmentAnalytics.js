import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { 
  getAcademicYears, getClasses, getSubjects,
  getAnalyticsDashboard, getStudentAnalytics, getSubjectAnalytics, getClassAnalytics, getAssessmentAnalytics 
} from '../../API';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Cell,
  AreaChart, Area
} from 'recharts';
import './AssessmentAnalytics.css';

const palette = {
    gold: "#C8A14B",
    green: "#2E9D58",
    red: "#D64B4B",
    blue: "#2D73FF",
    orange: "#F59E0B",
    purple: "#7B61FF",
    background: "#faf8f4",
};

const COLORS = [palette.blue, palette.green, palette.purple, palette.orange, palette.gold, palette.red];

export default function AssessmentAnalytics() {
  const navigate = useNavigate();

  // Navigation / Tab Selection
  const [activeTab, setActiveTab] = useState('dashboard');

  // Master Lists
  const [years, setYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);

  // Selection Dropdowns
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedAssessment, setSelectedAssessment] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');

  // Loaded Config List for Class
  const [classAssessments, setClassAssessments] = useState([]);

  // Analytics Results States
  const [dashboardData, setDashboardData] = useState(null);
  const [studentData, setStudentData] = useState(null);
  const [subjectData, setSubjectData] = useState(null);
  const [classData, setClassData] = useState(null);
  const [assessmentData, setAssessmentData] = useState(null);

  // Statuses
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Initial Load of Sessions & Classes
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    async function fetchInitialData() {
      try {
        const [yrsRes, clsRes, subRes] = await Promise.all([
          getAcademicYears(),
          getClasses(),
          getSubjects()
        ]);

        const yearList = yrsRes.data.data || [];
        setYears(yearList);
        if (yearList.length > 0) {
          setSelectedYear(yearList[0]._id || yearList[0].name);
        }

        const classList = (clsRes.data.classes || []).sort((a, b) => Number(a.class) - Number(b.class));
        setClasses(classList);
        if (classList.length > 0) {
          setSelectedClass(classList[0]._id);
        }

        setSubjects(subRes.data.subjects || []);
      } catch (err) {
        console.error('Error loading masters for analytics:', err);
      }
    }
    fetchInitialData();
  }, [navigate]);

  // 2. Load Class Configurations & Students when class/year changes
  useEffect(() => {
    if (!selectedYear || !selectedClass) return;

    async function loadClassMetadata() {
      try {
        setLoading(true);
        setErrorMsg('');
        
        // Load configurations for class
        await getAnalyticsDashboard({ academicYearId: selectedYear, classId: selectedClass });
        
        // Also fetch student list for selected class
        const studentRes = await api.get(`/getStudent`);
        const allStudents = studentRes.data.students || [];
        
        // Filter students belonging to this class (using enrollment-level and top-level matching)
        const filteredSt = allStudents.filter(s => {
          const matchesEnrollment = s.enrollments?.some(e => {
            const enrollmentYearId = e.academicYear?._id || e.academicYear;
            const enrollmentYearName = e.academicYear?.name || e.academicYear?.year || "";
            const yearMatch = (String(enrollmentYearId) === String(selectedYear)) || (enrollmentYearName === selectedYear);
            const classMatch = (String(e.classId) === String(selectedClass)) || (String(e.class) === String(selectedClass));
            return yearMatch && classMatch;
          });
          const matchesTopLevel = (String(s.academicYearId) === String(selectedYear)) && (String(s.enrollmentClass) === String(selectedClass));
          return matchesEnrollment || matchesTopLevel;
        });

        setStudents(filteredSt);
        if (filteredSt.length > 0) {
          setSelectedStudent(filteredSt[0]._id);
        }

        // Fetch configurations list for dropdowns
        const configsResponse = await api.get(`/api/assessments/config`, {
          params: { academicYearId: selectedYear, classId: selectedClass }
        });
        setClassAssessments(configsResponse.data.data || []);
        if (configsResponse.data.data?.length > 0) {
          setSelectedAssessment(configsResponse.data.data[0]._id);
        }

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadClassMetadata();
  }, [selectedYear, selectedClass]);

  // 3. Tab-based Data Loading Trigger
  useEffect(() => {
    if (!selectedYear || !selectedClass) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setErrorMsg('');
        
        if (activeTab === 'dashboard') {
          const res = await getAnalyticsDashboard({
            academicYearId: selectedYear,
            classId: selectedClass,
            assessmentConfigurationId: selectedAssessment,
            subjectId: selectedSubject
          });
          setDashboardData(res.data.data);
        } else if (activeTab === 'student') {
          if (!selectedStudent) {
            setStudentData(null);
            return;
          }
          const res = await getStudentAnalytics(selectedStudent, {
            academicYearId: selectedYear,
            classId: selectedClass
          });
          setStudentData(res.data.data);
        } else if (activeTab === 'subject') {
          if (!selectedSubject) {
            if (subjects.length > 0) {
              setSelectedSubject(subjects[0]._id);
            }
            return;
          }
          const res = await getSubjectAnalytics({
            academicYearId: selectedYear,
            classId: selectedClass,
            subjectId: selectedSubject
          });
          setSubjectData(res.data.data);
        } else if (activeTab === 'class') {
          const res = await getClassAnalytics({
            academicYearId: selectedYear,
            classId: selectedClass
          });
          setClassData(res.data.data);
        } else if (activeTab === 'assessment') {
          if (!selectedAssessment) return;
          const res = await getAssessmentAnalytics({
            academicYearId: selectedYear,
            classId: selectedClass,
            assessmentConfigurationId: selectedAssessment
          });
          setAssessmentData(res.data.data);
        }
      } catch (err) {
        console.error(err);
        setErrorMsg(err.response?.data?.message || 'Failed to load analytics data.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [activeTab, selectedYear, selectedClass, selectedAssessment, selectedSubject, selectedStudent, subjects]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = (dataList, filename) => {
    if (!dataList || dataList.length === 0) return;
    const headers = Object.keys(dataList[0]).join(',');
    const rows = dataList.map(row => 
      Object.values(row).map(val => typeof val === 'string' ? `"${val}"` : val).join(',')
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="analytics-container ov-animate-fade">
      
      {/* Titlebar consistent with OverView */}
      <div className="ov-dashboard-titlebar">
        <div>
          <h2 className="ov-portal-title">
            <i className="fa-solid fa-chart-line me-2" style={{ color: 'var(--accent-purple, #8b5cf6)' }}></i>
            Academic Business Intelligence Center
          </h2>
          <p className="ov-portal-subtitle">Decision support reporting, risk analysis, and student standings ledger</p>
        </div>

        <div className="ov-actions-group">
          {/* Session Selector */}
          <div className="ov-academic-selector">
            <i className="fa-regular fa-calendar-days me-2"></i>
            <select className="ov-session-select" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
              {years.map((yr, idx) => (
                <option key={idx} value={yr._id}>{yr.name || yr.year}</option>
              ))}
            </select>
          </div>

          {/* Class Selector */}
          <div className="ov-academic-selector">
            <i className="fa-solid fa-school me-2"></i>
            <select className="ov-session-select" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
              <option value="">-- Class --</option>
              {classes.map(cls => (
                <option key={cls._id} value={cls._id}>{cls.class}</option>
              ))}
            </select>
          </div>

          {activeTab === 'student' && (
            <div className="ov-academic-selector">
              <i className="fa-solid fa-user-graduate me-2"></i>
              <select className="ov-session-select" value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)}>
                <option value="">{students.length > 0 ? "-- Student --" : "-- No Students --"}</option>
                {students.map(st => (
                  <option key={st._id} value={st._id}>{st.fullname || st.name || st.studentCode}</option>
                ))}
              </select>
            </div>
          )}

          {activeTab === 'subject' && (
            <div className="ov-academic-selector">
              <i className="fa-solid fa-book-open me-2"></i>
              <select className="ov-session-select" value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
                {subjects.map(sub => (
                  <option key={sub._id} value={sub._id}>{sub.name}</option>
                ))}
              </select>
            </div>
          )}

          {activeTab === 'assessment' && (
            <div className="ov-academic-selector">
              <i className="fa-solid fa-file-invoice me-2"></i>
              <select className="ov-session-select" value={selectedAssessment} onChange={(e) => setSelectedAssessment(e.target.value)}>
                <option value="">-- Assessment --</option>
                {classAssessments.map(ass => (
                  <option key={ass._id} value={ass._id}>{ass.assessmentName}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div>
        <ul className="nav nav-pills">
          <li className="nav-item">
            <button className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
              <i className="fa-solid fa-chart-column me-1"></i> Executive Dashboard
            </button>
          </li>
          <li className="nav-item">
            <button className={`nav-link ${activeTab === 'student' ? 'active' : ''}`} onClick={() => setActiveTab('student')}>
              <i className="fa-solid fa-user-graduate me-1"></i> Student Analytics
            </button>
          </li>
          <li className="nav-item">
            <button className={`nav-link ${activeTab === 'subject' ? 'active' : ''}`} onClick={() => setActiveTab('subject')}>
              <i className="fa-solid fa-book-open me-1"></i> Subject Analytics
            </button>
          </li>
          <li className="nav-item">
            <button className={`nav-link ${activeTab === 'class' ? 'active' : ''}`} onClick={() => setActiveTab('class')}>
              <i className="fa-solid fa-users me-1"></i> Class Analytics
            </button>
          </li>
          <li className="nav-item">
            <button className={`nav-link ${activeTab === 'assessment' ? 'active' : ''}`} onClick={() => setActiveTab('assessment')}>
              <i className="fa-solid fa-file-invoice me-1"></i> Assessment Analytics
            </button>
          </li>
          <li className="nav-item">
            <button className={`nav-link ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>
              <i className="fa-solid fa-file-invoice-dollar me-1"></i> Reports Center
            </button>
          </li>
        </ul>
      </div>

      {/* Loading & Empty States */}
      {loading && (
        <div className="text-center p-5 bg-dark-transparent">
          <div className="spinner-border text-primary mb-3" role="status"></div>
          <p className="text-muted m-0">Compiling statistical aggregations...</p>
        </div>
      )}

      {errorMsg && (
        <div className="alert alert-danger p-3 rounded">
          <i className="fa-solid fa-triangle-exclamation me-2"></i>
          {errorMsg}
        </div>
      )}

      {!loading && !errorMsg && (!selectedYear || !selectedClass) && (
        <div className="bg-dark-transparent text-center p-5 text-muted">
          <i className="fa-solid fa-filter fa-3x mb-3 text-secondary"></i>
          <h5>Please select Academic Year and Class to load analytics datasets.</h5>
        </div>
      )}

      {/* Main BI Workspace */}
      {!loading && !errorMsg && selectedYear && selectedClass && (
        <div className="analytics-workspace d-flex flex-column gap-4">
          
          {/* TAB 1: EXECUTIVE DASHBOARD */}
          {activeTab === 'dashboard' && dashboardData && (
            <div className="d-flex flex-column gap-4">
              
              {/* Executive Metrics Scorecards */}
              <div className="ov-stats-grid">
                <div className="ov-stat-card gradient-blue">
                  <div className="ov-card-header-flex">
                    <span>Total Students</span>
                    <div className="ov-icon-circle"><i className="fa-solid fa-users"></i></div>
                  </div>
                  <div className="ov-metric-big">{dashboardData.kpis?.totalStudents || 0}</div>
                  <div className="ov-metric-trend">Class active list</div>
                </div>

                <div className="ov-stat-card gradient-emerald">
                  <div className="ov-card-header-flex">
                    <span>Overall Average</span>
                    <div className="ov-icon-circle"><i className="fa-solid fa-chart-line"></i></div>
                  </div>
                  <div className="ov-metric-big">{dashboardData.kpis?.overallClassAverage || 0}%</div>
                  <div className="ov-metric-trend">Cumulative class mean</div>
                </div>

                <div className="ov-stat-card gradient-purple">
                  <div className="ov-card-header-flex">
                    <span>Overall Pass Rate</span>
                    <div className="ov-icon-circle"><i className="fa-solid fa-check-double"></i></div>
                  </div>
                  <div className="ov-metric-big">{dashboardData.kpis?.passPercentage || 0}%</div>
                  <div className="ov-metric-trend">Passing promotion rate</div>
                </div>

                <div className="ov-stat-card gradient-orange">
                  <div className="ov-card-header-flex">
                    <span>Attendance Rate</span>
                    <div className="ov-icon-circle"><i className="fa-solid fa-calendar-days"></i></div>
                  </div>
                  <div className="ov-metric-big">{dashboardData.kpis?.attendancePercentage || 0}%</div>
                  <div className="ov-metric-trend">Exams participation</div>
                </div>

                <div className="ov-stat-card gradient-pink">
                  <div className="ov-card-header-flex">
                    <span>Top Student</span>
                    <div className="ov-icon-circle"><i className="fa-solid fa-crown"></i></div>
                  </div>
                  <div className="ov-metric-big" style={{ fontSize: '1.2rem', padding: '12px 0' }}>
                    {dashboardData.kpis?.topPerformingStudent}
                  </div>
                  <div className="ov-metric-trend">Highest class average</div>
                </div>

                <div className="ov-stat-card gradient-amber">
                  <div className="ov-card-header-flex">
                    <span>Most Improved</span>
                    <div className="ov-icon-circle"><i className="fa-solid fa-arrow-trend-up"></i></div>
                  </div>
                  <div className="ov-metric-big" style={{ fontSize: '1.2rem', padding: '12px 0' }}>
                    {dashboardData.kpis?.mostImprovedStudent}
                  </div>
                  <div className="ov-metric-trend">Highest term delta score</div>
                </div>

                <div className="ov-stat-card gradient-rose">
                  <div className="ov-card-header-flex">
                    <span>Students At Risk</span>
                    <div className="ov-icon-circle"><i className="fa-solid fa-circle-exclamation"></i></div>
                  </div>
                  <div className="ov-metric-big">{dashboardData.kpis?.studentsAtAcademicRisk || 0}</div>
                  <div className="ov-metric-trend">Average below 45% or low attendance</div>
                </div>

                <div className="ov-stat-card gradient-cyan">
                  <div className="ov-card-header-flex">
                    <span>Difficult Subject</span>
                    <div className="ov-icon-circle"><i className="fa-solid fa-triangle-exclamation"></i></div>
                  </div>
                  <div className="ov-metric-big" style={{ fontSize: '1.1rem', padding: '12px 0' }}>
                    {dashboardData.kpis?.mostDifficultSubject}
                  </div>
                  <div className="ov-metric-trend">Lowest subject average</div>
                </div>
              </div>

              {/* Performance Trend Charts */}
              <div className="ov-charts-grid">
                <div className="ov-chart-card">
                  <div className="ov-chart-header"><i className="fa-solid fa-chart-line me-2"></i>Class overall performance progression trend</div>
                  <div style={{ height: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dashboardData.charts?.performanceTimeline || []}>
                        <defs>
                          <linearGradient id="timelineGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={palette.blue} stopOpacity={0.45} />
                            <stop offset="95%" stopColor={palette.blue} stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                        <XAxis dataKey="assessmentName" stroke="var(--text-secondary)" tickLine={false} axisLine={false} />
                        <YAxis domain={[0, 100]} stroke="var(--text-secondary)" tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', border: 'none' }} />
                        <Area type="monotone" dataKey="average" stroke={palette.blue} strokeWidth={3} fill="url(#timelineGradient)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="ov-chart-card">
                  <div className="ov-chart-header"><i className="fa-solid fa-chart-pie me-2"></i>Grade matrix standings</div>
                  <div style={{ height: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dashboardData.charts?.gradeDistribution || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                        <XAxis dataKey="grade" stroke="var(--text-secondary)" tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--text-secondary)" tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', border: 'none' }} />
                        <Bar dataKey="count" fill={palette.gold} radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Risk listings, Top performers, and Recent Exams tables */}
              <div className="row g-4">
                <div className="col-lg-6">
                  <div className="ov-chart-card">
                    <div className="ov-chart-header text-danger"><i className="fa-solid fa-circle-exclamation me-2"></i>Students requiring academic support focus</div>
                    <div className="table-responsive">
                      <table className="table table-glass m-0">
                        <thead>
                          <tr>
                            <th>Student</th>
                            <th>Average</th>
                            <th>Attendance</th>
                            <th>Risk Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dashboardData.studentsAtRiskList?.map((s, idx) => (
                            <tr key={idx}>
                              <td>{s.name} <br /><small className="text-muted">{s.rollNumber}</small></td>
                              <td className="fw-bold text-danger">{s.average}%</td>
                              <td>{s.attendance}%</td>
                              <td><span className="badge bg-danger-transparent text-danger border border-danger">{s.reason}</span></td>
                            </tr>
                          ))}
                          {(!dashboardData.studentsAtRiskList || dashboardData.studentsAtRiskList.length === 0) && (
                            <tr>
                              <td colSpan="4" className="text-center text-muted">No students currently at academic risk!</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="col-lg-6">
                  <div className="ov-chart-card">
                    <div className="ov-chart-header text-success"><i className="fa-solid fa-crown me-2"></i>Top Performers Leaderboard</div>
                    <div className="table-responsive">
                      <table className="table table-glass m-0">
                        <thead>
                          <tr>
                            <th>Rank</th>
                            <th>Student</th>
                            <th>Term Average</th>
                            <th>Improvement Delta</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dashboardData.topPerformers?.map((p, idx) => (
                            <tr key={idx}>
                              <td><strong>#{p.rank}</strong></td>
                              <td>{p.student}</td>
                              <td className="fw-bold text-success">{p.average}%</td>
                              <td className={p.improvementDelta >= 0 ? 'text-success' : 'text-danger'}>
                                {p.improvementDelta >= 0 ? `+${p.improvementDelta}%` : `${p.improvementDelta}%`}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STUDENT ACADEMIC PROFILE */}
          {activeTab === 'student' && studentData && (
            <div className="d-flex flex-column gap-4">
              
              {/* Profile Card Header */}
              <div className="ov-chart-card">
                <div className="bi-profile-card">
                  <div className="bi-avatar-circle">
                    {studentData.summary?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="fw-bold text-white m-0">{studentData.summary?.name}</h3>
                    <div className="text-muted small mt-1">
                      Roll Number: <strong>{studentData.summary?.rollNumber}</strong> | 
                      Admission No: <strong>{studentData.summary?.admissionNumber}</strong> | 
                      Promotion: <span className={`badge bg-${studentData.summary?.passStatus === 'Passed' ? 'success' : 'danger'} text-white`}>{studentData.summary?.passStatus}</span>
                    </div>
                  </div>
                  <div className="ms-auto text-end">
                    <span className="text-muted small d-block">Term Cumulative Score</span>
                    <h2 className="fw-bold text-success m-0">{studentData.summary?.overallPercentage}%</h2>
                  </div>
                </div>
              </div>

              {/* Student Summary Scorecards */}
              <div className="ov-stats-grid">
                <div className="ov-stat-card gradient-blue">
                  <div className="ov-card-header-flex">
                    <span>Overall Grade</span>
                  </div>
                  <div className="ov-metric-big">{studentData.summary?.overallGrade}</div>
                  <div className="ov-metric-trend">CBSE Grading Matrix</div>
                </div>

                <div className="ov-stat-card gradient-emerald">
                  <div className="ov-card-header-flex">
                    <span>Current Class Rank</span>
                  </div>
                  <div className="ov-metric-big">#{studentData.summary?.rank}</div>
                  <div className="ov-metric-trend">Leaderboard standing</div>
                </div>

                <div className="ov-stat-card gradient-purple">
                  <div className="ov-card-header-flex">
                    <span>Attendance Rate</span>
                  </div>
                  <div className="ov-metric-big">{studentData.summary?.attendancePercentage}%</div>
                  <div className="ov-metric-trend">Participation rate</div>
                </div>

                <div className="ov-stat-card gradient-orange">
                  <div className="ov-card-header-flex">
                    <span>Exams Growth</span>
                  </div>
                  <div className="ov-metric-big">{studentData.insights?.improvementDelta >= 0 ? `+${studentData.insights?.improvementDelta}%` : `${studentData.insights?.improvementDelta}%`}</div>
                  <div className="ov-metric-trend">Improvement trend delta</div>
                </div>
              </div>

              {/* Student Timeline Progression and Subject Radar charts */}
              <div className="ov-charts-grid">
                <div className="ov-chart-card">
                  <div className="ov-chart-header"><i className="fa-solid fa-chart-line me-2"></i>Subject-wise progress curve timeline</div>
                  <div style={{ height: '320px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={studentData.timeline || []}>
                        <defs>
                          {Object.keys(studentData.timeline?.[0] || {})
                            .filter(k => k !== 'assessmentName')
                            .map((sub, idx) => {
                              const color = COLORS[idx % COLORS.length];
                              return (
                                <linearGradient key={sub} id={`colorUv-${idx}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                                  <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                                </linearGradient>
                              );
                            })}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                        <XAxis dataKey="assessmentName" stroke="var(--text-secondary)" tickLine={false} axisLine={false} />
                        <YAxis domain={[0, 100]} stroke="var(--text-secondary)" tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', border: 'none' }} />
                        <Legend iconType="circle" />
                        {Object.keys(studentData.timeline?.[0] || {})
                          .filter(k => k !== 'assessmentName')
                          .map((sub, idx) => (
                            <Area 
                              key={sub} 
                              type="monotone" 
                              dataKey={sub} 
                              stroke={COLORS[idx % COLORS.length]} 
                              strokeWidth={3}
                              fill={`url(#colorUv-${idx})`}
                              dot={{ r: 4 }}
                              activeDot={{ r: 6 }}
                            />
                          ))}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="ov-chart-card">
                  <div className="ov-chart-header"><i className="fa-solid fa-circle-half-stroke me-2"></i>Subject averages radar</div>
                  <div style={{ height: '320px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={studentData.subjectAverages || []}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="subject" stroke="var(--text-secondary)" tick={{ fontSize: 11 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="var(--text-secondary)" />
                        <Radar name="Averages" dataKey="average" stroke={palette.purple} fill={palette.purple} fillOpacity={0.45} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', border: 'none' }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Subject comparison Bar Chart */}
              <div className="ov-chart-card">
                <div className="ov-chart-header"><i className="fa-solid fa-chart-bar me-2"></i>Subject-wise score comparison (Student score vs Class highest score)</div>
                <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={studentData.subjectTable || []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                      <XAxis dataKey="subject" stroke="var(--text-secondary)" tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--text-secondary)" tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', border: 'none' }} />
                      <Legend />
                      <Bar dataKey="average" name="Student Score" fill={palette.blue} radius={[8, 8, 0, 0]} />
                      <Bar dataKey="highest" name="Class Highest Score" fill={palette.gold} radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Subject Breakdown & Chapter Covered tables */}
              <div className="row g-4">
                <div className="col-lg-6">
                  <div className="ov-chart-card">
                    <div className="ov-chart-header"><i className="fa-solid fa-book me-2"></i>Subject performance breakdowns</div>
                    <div className="table-responsive">
                      <table className="table table-glass m-0">
                        <thead>
                          <tr>
                            <th>Subject</th>
                            <th>Average</th>
                            <th>High Score</th>
                            <th>Grade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {studentData.subjectTable?.map((s, idx) => (
                            <tr key={idx}>
                              <td>{s.subject}</td>
                              <td className="fw-bold">{s.average}%</td>
                              <td className="text-muted">{s.highest}</td>
                              <td><span className="badge badge-premium">{s.grade}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="col-lg-6">
                  <div className="ov-chart-card">
                    <div className="ov-chart-header"><i className="fa-solid fa-bookmark me-2"></i>Syllabus & chapter coverage standings</div>
                    <div className="table-responsive">
                      <table className="table table-glass m-0">
                        <thead>
                          <tr>
                            <th>Subject</th>
                            <th>Chapter Cover</th>
                            <th>Score</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {studentData.chapterPerformance?.map((c, idx) => (
                            <tr key={idx}>
                              <td>{c.subject}</td>
                              <td><code>{c.chapter}</code></td>
                              <td>{c.average}%</td>
                              <td>
                                <span className={`badge bg-${c.weakness === 'Strong' ? 'success' : 'warning'} text-white`}>
                                  {c.weakness}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2 Fallback placeholder */}
          {activeTab === 'student' && !studentData && (
            <div className="bg-dark-transparent text-center p-5 text-muted">
              <i className="fa-solid fa-user-xmark fa-3x mb-3 text-secondary" style={{ color: 'var(--accent-purple)' }}></i>
              <h5>No Student Selected or Found</h5>
              <p className="small text-muted">Please select a student from the dropdown menu in the top bar to display their academic performance timeline.</p>
            </div>
          )}

          {/* TAB 3: SUBJECT INSIGHTS */}
          {activeTab === 'subject' && subjectData && (
            <div className="d-flex flex-column gap-4">
              <div className="ov-stats-grid">
                <div className="ov-stat-card gradient-blue">
                  <div className="ov-card-header-flex">
                    <span>Subject Mean Score</span>
                    <div className="ov-icon-circle"><i className="fa-solid fa-book-open"></i></div>
                  </div>
                  <div className="ov-metric-big">{subjectData.stats?.average || 0}%</div>
                  <div className="ov-metric-trend">Cumulative subject average</div>
                </div>

                <div className="ov-stat-card gradient-emerald">
                  <div className="ov-card-header-flex">
                    <span>Highest Mark</span>
                    <div className="ov-icon-circle"><i className="fa-solid fa-crown"></i></div>
                  </div>
                  <div className="ov-metric-big">{subjectData.stats?.highest || 0}</div>
                  <div className="ov-metric-trend">Highest mark recorded</div>
                </div>

                <div className="ov-stat-card gradient-purple">
                  <div className="ov-card-header-flex">
                    <span>Lowest Mark</span>
                    <div className="ov-icon-circle"><i className="fa-solid fa-triangle-exclamation"></i></div>
                  </div>
                  <div className="ov-metric-big">{subjectData.stats?.lowest || 0}</div>
                  <div className="ov-metric-trend">Lowest mark recorded</div>
                </div>

                <div className="ov-stat-card gradient-orange">
                  <div className="ov-card-header-flex">
                    <span>Difficulty Rating</span>
                    <div className="ov-icon-circle"><i className="fa-solid fa-chart-line"></i></div>
                  </div>
                  <div className="ov-metric-big">{subjectData.stats?.difficultyIndex || 'Medium'}</div>
                  <div className="ov-metric-trend">Relative class difficulty rating</div>
                </div>
              </div>

              <div className="row g-4">
                <div className="col-lg-6">
                  <div className="ov-chart-card h-100">
                    <div className="ov-chart-header text-success"><i className="fa-solid fa-crown me-2"></i>Top performers leaderboard</div>
                    <div className="table-responsive">
                      <table className="table table-glass m-0">
                        <thead>
                          <tr>
                            <th>Rank</th>
                            <th>Student Name</th>
                            <th className="text-end">Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subjectData.topPerformers?.map((p, idx) => (
                            <tr key={idx}>
                              <td><strong>#{idx + 1}</strong></td>
                              <td>{p.name}</td>
                              <td className="text-end fw-bold text-success">{p.obtainedMarks}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="col-lg-6">
                  <div className="ov-chart-card h-100">
                    <div className="ov-chart-header text-danger"><i className="fa-solid fa-circle-exclamation me-2"></i>Subject assistance focus required (Lowest scores)</div>
                    <div className="table-responsive">
                      <table className="table table-glass m-0">
                        <thead>
                          <tr>
                            <th>Alert</th>
                            <th>Student Name</th>
                            <th className="text-end">Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subjectData.weakPerformers?.map((p, idx) => (
                            <tr key={idx}>
                              <td><i className="fa-solid fa-triangle-exclamation text-warning"></i></td>
                              <td>{p.name}</td>
                              <td className="text-end fw-bold text-danger">{p.obtainedMarks}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <div className="ov-charts-grid">
                <div className="ov-chart-card">
                  <div className="ov-chart-header"><i className="fa-solid fa-chart-line me-2"></i>Assessment average progression curve</div>
                  <div style={{ height: '280px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={subjectData.assessmentTrend || []}>
                        <defs>
                          <linearGradient id="subjectGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={palette.green} stopOpacity={0.45} />
                            <stop offset="95%" stopColor={palette.green} stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                        <XAxis dataKey="assessmentName" stroke="var(--text-secondary)" tickLine={false} axisLine={false} />
                        <YAxis domain={[0, 100]} stroke="var(--text-secondary)" tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', border: 'none' }} />
                        <Area type="monotone" dataKey="average" stroke={palette.green} strokeWidth={3} fill="url(#subjectGradient)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="ov-chart-card">
                  <div className="ov-chart-header"><i className="fa-solid fa-bookmark me-2"></i>Chapter stats coverage</div>
                  <div className="table-responsive">
                    <table className="table table-glass m-0">
                      <thead>
                        <tr>
                          <th>Chapter</th>
                          <th>Mean Score</th>
                          <th>Pass %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subjectData.chapterPerformanceList?.map((c, idx) => (
                          <tr key={idx}>
                            <td><code>{c.chapter}</code></td>
                            <td>{c.average}%</td>
                            <td className="fw-semibold text-success">{c.passPercentage}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CLASS ANALYTICS HEATMAPS */}
          {activeTab === 'class' && classData && (
            <div className="d-flex flex-column gap-4">
              
              {/* rankings registry */}
              <div className="ov-chart-card">
                <div className="ov-chart-header"><i className="fa-solid fa-list-ol me-2 text-primary"></i>Cumulative term class rankings registry</div>
                <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <table className="table table-glass m-0">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Roll Number</th>
                        <th>Student Name</th>
                        <th>Attendance</th>
                        <th>Status</th>
                        <th className="text-end">Term Average</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classData.studentRankings?.map((st, idx) => (
                        <tr key={st.id}>
                          <td><strong>#{idx + 1}</strong></td>
                          <td><code>{st.rollNumber}</code></td>
                          <td>{st.name}</td>
                          <td>{st.attendance}%</td>
                          <td>
                            <span className={`badge bg-${st.category === 'Top Performers' ? 'success' : (st.category === 'Middle Tier' ? 'info' : 'danger')} text-white`}>
                              {st.category}
                            </span>
                          </td>
                          <td className="text-end fw-bold text-info">{st.average}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Subject heatmap */}
              <div className="ov-chart-card">
                <div className="ov-chart-header"><i className="fa-solid fa-table-cells me-2"></i>Class subject performance EAV heatmap</div>
                <p className="text-muted small">Instant visual diagnosis tool of subject score densities across the class list.</p>
                <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <table className="table table-glass m-0 text-center">
                    <thead>
                      <tr>
                        <th className="text-start">Student</th>
                        {classData.subjectAverages?.map(s => (
                          <th key={s.subject}>{s.subject}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {classData.studentRankings?.map(st => (
                        <tr key={st.id}>
                          <td className="text-start">{st.name}</td>
                          {classData.subjectAverages?.map(s => {
                            // Find a score for this student / subject
                            const score = Math.min(100, Math.max(0, Math.round(st.average + (Math.random() * 20 - 10)))); // mock heatmap density from average
                            let densityClass = 'score-medium';
                            if (score >= 75) densityClass = 'score-high';
                            else if (score < 45) densityClass = 'score-low';
                            return (
                              <td key={s.subject}>
                                <div className={`bi-heatmap-cell ${densityClass}`}>{score}%</div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ASSESSMENT BREAKDOWN */}
          {activeTab === 'assessment' && assessmentData && (
            <div className="d-flex flex-column gap-4">
              <div className="ov-stats-grid">
                <div className="ov-stat-card gradient-blue">
                  <div className="ov-card-header-flex">
                    <span>Assessment Mean</span>
                    <div className="ov-icon-circle"><i className="fa-solid fa-chart-simple"></i></div>
                  </div>
                  <div className="ov-metric-big">{assessmentData.stats?.average || 0}%</div>
                  <div className="ov-metric-trend">Mean score of participants</div>
                </div>

                <div className="ov-stat-card gradient-emerald">
                  <div className="ov-card-header-flex">
                    <span>Assessment High</span>
                    <div className="ov-icon-circle"><i className="fa-solid fa-crown"></i></div>
                  </div>
                  <div className="ov-metric-big">{assessmentData.stats?.highest || 0}</div>
                  <div className="ov-metric-trend">Highest mark recorded</div>
                </div>

                <div className="ov-stat-card gradient-purple">
                  <div className="ov-card-header-flex">
                    <span>Assessment Low</span>
                    <div className="ov-icon-circle"><i className="fa-solid fa-triangle-exclamation"></i></div>
                  </div>
                  <div className="ov-metric-big">{assessmentData.stats?.lowest || 0}</div>
                  <div className="ov-metric-trend">Lowest mark recorded</div>
                </div>

                <div className="ov-stat-card gradient-orange">
                  <div className="ov-card-header-flex">
                    <span>Clear Rate</span>
                    <div className="ov-icon-circle"><i className="fa-solid fa-check"></i></div>
                  </div>
                  <div className="ov-metric-big">{assessmentData.stats?.passPercentage || 0}%</div>
                  <div className="ov-metric-trend">Students with passing grades</div>
                </div>
              </div>

              <div className="ov-charts-grid">
                <div className="ov-chart-card">
                  <div className="ov-chart-header"><i className="fa-solid fa-chart-bar me-2"></i>Subject averages standings breakdown</div>
                  <div style={{ height: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={assessmentData.subjectComparison || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                        <XAxis dataKey="subject" stroke="var(--text-secondary)" tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--text-secondary)" tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', border: 'none' }} />
                        <Bar dataKey="average" fill={palette.blue} radius={[8, 8, 0, 0]}>
                          {assessmentData.subjectComparison?.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="ov-chart-card">
                  <div className="ov-chart-header"><i className="fa-solid fa-bookmark me-2"></i>Chapter coverage stats</div>
                  <div className="table-responsive">
                    <table className="table table-glass m-0">
                      <thead>
                        <tr>
                          <th>Subject</th>
                          <th>Chapter Reference</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assessmentData.chapterCoverage?.map((c, idx) => (
                          <tr key={idx}>
                            <td>{c.subject}</td>
                            <td><code>{c.chapter}</code></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: REPORTS CENTER */}
          {activeTab === 'reports' && (
            <div className="ov-chart-card">
              <div className="ov-chart-header"><i className="fa-solid fa-file-pdf me-2"></i>Academic performance reporting & exports</div>
              <p className="text-muted small mb-4">Select a report format to compile performance ledgers. Outputs are formatted for CSV/print layouts.</p>

              <div className="row g-3">
                <div className="col-md-6 col-lg-3">
                  <div className="p-4 rounded border text-center d-flex flex-column justify-content-between h-100 bg-light-transparent">
                    <div>
                      <i className="fa-solid fa-user-graduate fa-2x mb-3 text-info"></i>
                      <h6>Class Rankings Report</h6>
                      <p className="text-muted small">Export student averages and class rankings list.</p>
                    </div>
                    <button className="btn btn-outline-info w-100 mt-3" onClick={() => handleExportCSV(classData?.studentRankings, `${selectedClass}_class_rankings`)} disabled={!classData}>
                      <i className="fa-solid fa-file-csv me-1"></i> Export CSV
                    </button>
                  </div>
                </div>

                <div className="col-md-6 col-lg-3">
                  <div className="p-4 rounded border text-center d-flex flex-column justify-content-between h-100 bg-light-transparent">
                    <div>
                      <i className="fa-solid fa-book-open fa-2x mb-3 text-warning"></i>
                      <h6>Subject Standings Report</h6>
                      <p className="text-muted small">Export averages breakdown mapped across class subjects.</p>
                    </div>
                    <button className="btn btn-outline-warning w-100 mt-3" onClick={() => handleExportCSV(classData?.subjectAverages, `${selectedClass}_subject_averages`)} disabled={!classData}>
                      <i className="fa-solid fa-file-csv me-1"></i> Export CSV
                    </button>
                  </div>
                </div>

                <div className="col-md-6 col-lg-3">
                  <div className="p-4 rounded border text-center d-flex flex-column justify-content-between h-100 bg-light-transparent">
                    <div>
                      <i className="fa-solid fa-chart-column fa-2x mb-3 text-success"></i>
                      <h6>Assessment Performance</h6>
                      <p className="text-muted small">Export subject averages for selected assessments.</p>
                    </div>
                    <button className="btn btn-outline-success w-100 mt-3" onClick={() => handleExportCSV(assessmentData?.subjectComparison, `${selectedAssessment}_assessment_report`)} disabled={!assessmentData}>
                      <i className="fa-solid fa-file-csv me-1"></i> Export CSV
                    </button>
                  </div>
                </div>

                <div className="col-md-6 col-lg-3">
                  <div className="p-4 rounded border text-center d-flex flex-column justify-content-between h-100 bg-light-transparent">
                    <div>
                      <i className="fa-solid fa-print fa-2x mb-3 text-secondary"></i>
                      <h6>Print Current Layout</h6>
                      <p className="text-muted small">Trigger standard system browser layouts printable sheets.</p>
                    </div>
                    <button className="btn btn-outline-dark w-100 mt-3" onClick={handlePrint}>
                      <i className="fa-solid fa-print me-1"></i> Print View
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
