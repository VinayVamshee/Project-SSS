import React, { useEffect, useState } from "react";
import boy from "../Images/bussiness-man.png";
import { useNavigate } from "react-router-dom";
import api from "../../API";
import './Results.css';

export default function Results() {
    const navigate = useNavigate();
    
    // Auth Check
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
        }
    }, [navigate]);

    // Core State Variables
    const [academicYears, setAcademicYears] = useState([]);
    const [classes, setClasses] = useState([]);
    const [selectedYear, setSelectedYear] = useState("");
    const [selectedClass, setSelectedClass] = useState("");
    
    // Loaded Assessments / Configurations
    const [assessments, setAssessments] = useState([]);
    const [selectedAssessmentId, setSelectedAssessmentId] = useState("");
    
    // Selected Assessment Mapped Subjects
    const [subjects, setSubjects] = useState([]);
    const [selectedSubjectId, setSelectedSubjectId] = useState("");
    
    // Marks Entry Table Data
    const [students, setStudents] = useState([]);
    const [marksData, setMarksData] = useState({}); // { [studentId]: { obtainedMarks: Number, attendanceStatus: 'present'/'absent', remarks: '' } }
    const [searchStudent, setSearchStudent] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [configLoading, setConfigLoading] = useState(false);
    const [configError, setConfigError] = useState("");

    // Active Subject Metrics
    const [subjectMetrics, setSubjectMetrics] = useState({ maxMarks: 100, passingMarks: 35, chapters: [] });

    // Dynamic Template Fields
    const [templateFields, setTemplateFields] = useState([]);

    // 1. Initial Fetch of Academic Sessions, Classes & Marks Template
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const yearResponse = await api.get("/GetAcademicYear");
                const sortedYears = (yearResponse.data.data || []).sort((a, b) =>
                    parseInt(b.year?.split("-")[0] || b.name?.split("-")[0]) - 
                    parseInt(a.year?.split("-")[0] || a.name?.split("-")[0])
                );
                setAcademicYears(sortedYears);
                if (sortedYears.length > 0) {
                    setSelectedYear(sortedYears[0]._id || sortedYears[0].name);
                }

                const classResponse = await api.get("/getClasses");
                const sortedClasses = (classResponse.data.classes || []).sort((a, b) => Number(a.class) - Number(b.class));
                setClasses(sortedClasses);

                // Fetch student marks template
                const templateRes = await api.get('/api/metadata/templates/student_marks_entry_template/form');
                if (templateRes.data.success && templateRes.data.data) {
                    setTemplateFields(templateRes.data.data.sections?.[0]?.fields || []);
                }
            } catch (err) {
                console.error("Error loading settings metadata:", err);
            }
        };
        fetchInitialData();
    }, []);

    // 2. Load Assessment Configurations when Class or Year changes
    useEffect(() => {
        if (!selectedYear || !selectedClass) return;

        const loadConfigs = async () => {
            try {
                setConfigLoading(true);
                setConfigError("");
                
                const res = await api.get('/api/assessments/config', {
                    params: { academicYearId: selectedYear, classId: selectedClass }
                });
                
                const list = res.data.data || [];
                setAssessments(list);
                setSubjects([]);
                setSelectedAssessmentId("");
                setSelectedSubjectId("");
                
                if (list.length === 0) {
                    setConfigError("no_exams");
                } else {
                    setSelectedAssessmentId(list[0]._id);
                }
            } catch (err) {
                console.error(err);
                setConfigError("fetch_failed");
            } finally {
                setConfigLoading(false);
            }
        };
        loadConfigs();
    }, [selectedYear, selectedClass]);

    // 3. Resolve Subjects linked on selected Assessment Config
    useEffect(() => {
        if (!selectedAssessmentId) return;
        const currentAss = assessments.find(a => a._id === selectedAssessmentId);
        if (currentAss && Array.isArray(currentAss.subjects)) {
            const mappedSubs = currentAss.subjects.map(s => ({
                _id: s.subjectId?._id || s.subjectId,
                name: s.subjectId?.name || 'Subject name unknown',
                maximumMarks: s.maximumMarks,
                passingMarks: s.passingMarks,
                chapters: s.chapters || []
            }));
            setSubjects(mappedSubs);
            if (mappedSubs.length > 0) {
                setSelectedSubjectId(mappedSubs[0]._id);
            } else {
                setSelectedSubjectId("");
                setStudents([]);
            }
        }
    }, [selectedAssessmentId, assessments]);

    // 4. Load Students and Marks Registry when Subject changes
    useEffect(() => {
        if (!selectedAssessmentId || !selectedSubjectId || !selectedClass) return;

        const subObj = subjects.find(s => s._id === selectedSubjectId);
        if (subObj) {
            setSubjectMetrics({
                maxMarks: subObj.maximumMarks || 100,
                passingMarks: subObj.passingMarks || 35,
                chapters: subObj.chapters || []
            });
        }

        const fetchStudentsAndMarks = async () => {
            try {
                // Fetch Students registered
                const studentsRes = await api.get("/getStudent");
                const allStudents = studentsRes.data.students || [];
                
                const filteredStudents = allStudents.filter(s => {
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
                setStudents(filteredStudents);

                // Fetch existing marks register
                const marksRes = await api.get('/api/assessments/marks/register', {
                    params: { assessmentConfigurationId: selectedAssessmentId, subjectId: selectedSubjectId }
                });

                const savedList = marksRes.data.data?.savedMarks || [];
                const registryMap = {};

                filteredStudents.forEach(st => {
                    const savedRecord = savedList.find(m => m.studentId === st._id);
                    registryMap[st._id] = {
                        obtainedMarks: savedRecord ? savedRecord.obtainedMarks : "",
                        attendanceStatus: savedRecord ? savedRecord.attendanceStatus || "present" : "present",
                        remarks: savedRecord ? savedRecord.remarks || "" : ""
                    };
                });

                setMarksData(registryMap);
            } catch (err) {
                console.error(err);
            }
        };

        fetchStudentsAndMarks();
    }, [selectedAssessmentId, selectedSubjectId, selectedClass, selectedYear, subjects, academicYears]);

    const handleInputChange = (studentId, field, value) => {
        setMarksData(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [field]: value
            }
        }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            setIsSaving(true);
            const marksList = filteredStudents.map(st => {
                const row = marksData[st._id] || { obtainedMarks: 0, attendanceStatus: 'present', remarks: '' };
                return {
                    studentId: st._id,
                    obtainedMarks: row.attendanceStatus === 'absent' ? 0 : Number(row.obtainedMarks || 0),
                    attendanceStatus: row.attendanceStatus,
                    remarks: row.remarks
                };
            });

            await api.post('/api/assessments/marks/bulk-save', {
                assessmentConfigurationId: selectedAssessmentId,
                subjectId: selectedSubjectId,
                marks: marksList
            });

            alert("✅ Marks saved successfully!");
        } catch (err) {
            alert("❌ Failed to save marks: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const filteredStudents = students.filter(st =>
        searchStudent === "" || st.name.toLowerCase().includes(searchStudent.toLowerCase())
    );

    return (
        <div className="ResultsPage p-4" style={{ backgroundColor: 'var(--background-color)', color: 'var(--text-color)', minHeight: '100vh' }}>
            
            {/* Guided Selection Panel */}
            <div className="card p-3 mb-4" style={{ backgroundColor: 'var(--card-bg-color)', borderColor: 'var(--border-color)' }}>
                <h5 className="fw-bold mb-3" style={{ color: 'var(--button-color)' }}>Guided Assessment Results Entry</h5>
                
                <div className="row g-3">
                    <div className="col-md-3">
                        <label className="text-muted small fw-bold">Academic Session</label>
                        <select className="form-select bg-transparent text-white border-secondary" style={{ color: 'var(--text-color)', borderColor: 'var(--border-color)' }} value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                            <option value="" style={{color: '#000'}}>-- Select Session --</option>
                            {academicYears.map((yr, idx) => (
                                <option key={idx} value={yr._id} style={{color: '#000'}}>{yr.name || yr.year}</option>
                            ))}
                        </select>
                    </div>

                    <div className="col-md-3">
                        <label className="text-muted small fw-bold">Class / Grade</label>
                        <select className="form-select bg-transparent text-white border-secondary" style={{ color: 'var(--text-color)', borderColor: 'var(--border-color)' }} value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                            <option value="" style={{color: '#000'}}>-- Select Class --</option>
                            {classes.map(cls => (
                                <option key={cls._id} value={cls._id} style={{color: '#000'}}>{cls.class}</option>
                            ))}
                        </select>
                    </div>

                    <div className="col-md-3">
                        <label className="text-muted small fw-bold">Active Assessment</label>
                        <select className="form-select bg-transparent text-white border-secondary" style={{ color: 'var(--text-color)', borderColor: 'var(--border-color)' }} value={selectedAssessmentId} onChange={(e) => setSelectedAssessmentId(e.target.value)}>
                            <option value="" style={{color: '#000'}}>-- Select Assessment --</option>
                            {assessments.map(ass => (
                                <option key={ass._id} value={ass._id} style={{color: '#000'}}>{ass.assessmentName}</option>
                            ))}
                        </select>
                    </div>

                    <div className="col-md-3">
                        <label className="text-muted small fw-bold">Subject Selection</label>
                        <select className="form-select bg-transparent text-white border-secondary" style={{ color: 'var(--text-color)', borderColor: 'var(--border-color)' }} value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)}>
                            <option value="" style={{color: '#000'}}>-- Select Subject --</option>
                            {subjects.map(sub => (
                                <option key={sub._id} value={sub._id} style={{color: '#000'}}>{sub.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Error / Validation Warnings */}
            {configError === "no_exams" && (
                <div className="alert alert-warning">
                    No assessments configured for this class. <br />
                    Please configure assessments in <strong>Settings → Academics Setup → Assessment Configuration</strong>.
                </div>
            )}

            {/* Guided Content Layout */}
            {!configError && selectedYear && selectedClass && selectedAssessmentId && selectedSubjectId && !configLoading && (
                <div className="card p-4" style={{ backgroundColor: 'var(--card-bg-color)', borderColor: 'var(--border-color)' }}>
                    
                    {/* Subject Metadata Card */}
                    <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 p-3 border rounded" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--background-color)' }}>
                        <div>
                            <h6 className="fw-bold m-0" style={{ color: 'var(--button-color)' }}>Syllabus Coverage Chapters</h6>
                            <p className="text-muted small m-0 mt-1">
                                {subjectMetrics.chapters.length > 0 ? subjectMetrics.chapters.join(', ') : 'No chapters configured'}
                            </p>
                        </div>
                        <div className="d-flex gap-3">
                            <span className="badge bg-secondary p-2">Max Marks: {subjectMetrics.maxMarks}</span>
                            <span className="badge bg-primary p-2">Passing Marks: {subjectMetrics.passingMarks}</span>
                        </div>
                    </div>

                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="fw-bold m-0" style={{ color: 'var(--button-color)' }}>Student Assessment Marks Grid</h5>
                        <input 
                            type="text" 
                            className="form-control w-25 bg-transparent border-secondary" 
                            style={{ color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                            placeholder="Search Student..." 
                            value={searchStudent} 
                            onChange={(e) => setSearchStudent(e.target.value)} 
                        />
                    </div>

                    {/* Interactive Marks Table */}
                    <form onSubmit={handleSave}>
                        <div className="table-responsive">
                          <table className="table table-bordered table-striped text-center align-middle" style={{ color: 'var(--text-color)', borderColor: 'var(--border-color)' }}>
                            <thead style={{ backgroundColor: 'var(--table-header-bg)' }}>
                              <tr>
                                <th>Student Details</th>
                                {templateFields.length > 0 ? (
                                  templateFields.map(f => (
                                    <th key={f.fieldId?._id || f.key || f.fieldId}>
                                      {f.label || f.fieldId?.label} {f.key === 'obtained_marks' || f.fieldId?.key === 'obtained_marks' ? `(Out of ${subjectMetrics.maxMarks})` : ''}
                                    </th>
                                  ))
                                ) : (
                                  <>
                                    <th>Obtained Score (Out of {subjectMetrics.maxMarks})</th>
                                    <th>Attendance Status</th>
                                    <th>Remarks</th>
                                  </>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {filteredStudents.map(st => {
                                const row = marksData[st._id] || { obtainedMarks: "", attendanceStatus: "present", remarks: "" };
                                return (
                                  <tr key={st._id}>
                                    <td className="text-start">
                                      <div className="d-flex align-items-center gap-2">
                                        <img src={st.image || boy} alt="avatar" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                                        <div>
                                          <div className="fw-bold">{st.name}</div>
                                          <small className="text-muted">Roll: {st.studentCode || st.AdmissionNo || 'N/A'}</small>
                                        </div>
                                      </div>
                                    </td>
                                    
                                    {templateFields.length > 0 ? (
                                      templateFields.map(f => {
                                        const key = f.key || f.fieldId?.key;
                                        const options = f.options || f.fieldId?.options || [];

                                        if (key === 'obtained_marks') {
                                          return (
                                            <td key={f.fieldId?._id || key || f.fieldId}>
                                              <input 
                                                type="number"
                                                className="form-control form-control-sm text-center mx-auto"
                                                style={{ width: '120px', backgroundColor: 'var(--background-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                                                value={row.obtainedMarks}
                                                disabled={row.attendanceStatus === 'absent'}
                                                max={subjectMetrics.maxMarks}
                                                placeholder={`Max ${subjectMetrics.maxMarks}`}
                                                onChange={(e) => handleInputChange(st._id, 'obtainedMarks', e.target.value)}
                                                required={row.attendanceStatus !== 'absent'}
                                              />
                                            </td>
                                          );
                                        }
                                        if (key === 'attendance_status') {
                                          return (
                                            <td key={f.fieldId?._id || key || f.fieldId}>
                                              <select 
                                                className="form-select form-select-sm mx-auto" 
                                                style={{ width: '120px', backgroundColor: 'var(--background-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                                                value={row.attendanceStatus} 
                                                onChange={(e) => handleInputChange(st._id, 'attendanceStatus', e.target.value)}
                                              >
                                                {options.map(opt => (
                                                  <option key={opt.value} value={opt.value} style={{color: '#000'}}>{opt.label}</option>
                                                ))}
                                              </select>
                                            </td>
                                          );
                                        }
                                        if (key === 'remarks') {
                                          return (
                                            <td key={f.fieldId?._id || key || f.fieldId}>
                                              <input 
                                                type="text" 
                                                className="form-control form-control-sm" 
                                                style={{ backgroundColor: 'var(--background-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                                                value={row.remarks} 
                                                placeholder="e.g. Good progress"
                                                onChange={(e) => handleInputChange(st._id, 'remarks', e.target.value)}
                                              />
                                            </td>
                                          );
                                        }
                                        return null;
                                      })
                                    ) : (
                                      <>
                                        <td>
                                          <input 
                                            type="number"
                                            className="form-control form-control-sm text-center mx-auto"
                                            style={{ width: '100px', backgroundColor: 'var(--background-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                                            value={row.obtainedMarks}
                                            disabled={row.attendanceStatus === 'absent'}
                                            max={subjectMetrics.maxMarks}
                                            placeholder={`Max ${subjectMetrics.maxMarks}`}
                                            onChange={(e) => handleInputChange(st._id, 'obtainedMarks', e.target.value)}
                                            required={row.attendanceStatus !== 'absent'}
                                          />
                                        </td>

                                        <td>
                                            <select 
                                                className="form-select form-select-sm mx-auto" 
                                                style={{ width: '120px', backgroundColor: 'var(--background-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                                                value={row.attendanceStatus} 
                                                onChange={(e) => handleInputChange(st._id, 'attendanceStatus', e.target.value)}
                                            >
                                                <option value="present" style={{color: '#000'}}>Present</option>
                                                <option value="absent" style={{color: '#000'}}>Absent</option>
                                            </select>
                                        </td>

                                        <td>
                                            <input 
                                                type="text" 
                                                className="form-control form-control-sm" 
                                                style={{ backgroundColor: 'var(--background-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                                                value={row.remarks} 
                                                placeholder="e.g. Good progress"
                                                onChange={(e) => handleInputChange(st._id, 'remarks', e.target.value)}
                                            />
                                        </td>
                                      </>
                                    )}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        
                        <div className="d-flex justify-content-end mt-3">
                            <button type="submit" className="btn fw-bold px-4" style={{ backgroundColor: 'var(--button-color)', color: '#fff' }} disabled={isSaving}>
                                {isSaving ? "Saving Results..." : "Save All Results"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
