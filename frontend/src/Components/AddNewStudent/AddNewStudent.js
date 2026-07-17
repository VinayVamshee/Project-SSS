import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTemplates, getTemplateForm, submitTemplateForm, getClasses, getAcademicYears } from '../../API';
import DynamicForm from '../Shared/DynamicForm';
import LoadingIndicator from '../Shared/LoadingIndicator';
import './AddNewStudent.css';

export default function AddNewStudent() {
    const navigate = useNavigate();
    const [templateForm, setTemplateForm] = useState(null);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    
    // Track values in real-time for print preview
    const [liveValues, setLiveValues] = useState({});
    const [classes, setClasses] = useState([]);
    const [academicYears, setAcademicYears] = useState([]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userType = localStorage.getItem('userType');
        const isDev = localStorage.getItem('isDev') === 'true';
        if (!token || (userType !== 'student-enrollment' && userType !== 'admin' && !isDev)) {
            navigate('/');
        }
    }, [navigate]);

    // Load template, classes, and academic years
    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            setLoadingMessage('Loading registration form...');
            try {
                const [templatesRes, classesRes, yearsRes] = await Promise.all([
                    getTemplates(),
                    getClasses(),
                    getAcademicYears()
                ]);

                setClasses(classesRes.data?.classes || classesRes.data?.data || classesRes.data || []);
                setAcademicYears(yearsRes.data?.data || []);

                const allTemplates = templatesRes.data?.data || [];
                const studentTemplate = allTemplates.find(t => 
                    t.status === 'active' && 
                    t.purpose === 'student_registration'
                );

                if (studentTemplate) {
                    const formRes = await getTemplateForm(studentTemplate._id);
                    setTemplateForm(formRes.data.data);
                } else {
                    setMessage('⚠️ No active student registration template found in metadata.');
                }
            } catch (err) {
                console.error('Failed to load initial data:', err);
                setMessage('❌ Failed to load form configuration.');
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, []);

    const handleRegisterStudent = async (formData) => {
        if (!templateForm) return;
        setLoading(true);
        setLoadingMessage('Registering student...');
        try {
            await submitTemplateForm(templateForm.template.id || templateForm.template._id, formData);
            setMessage('✅ Student registered successfully!');
            setLiveValues({});
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            setMessage('❌ Error: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    // Helper functions to resolve display names for class and academic year in the print preview
    const getClassName = (id) => {
        if (!id) return '---';
        const match = classes.find(c => c._id === id || c.class === id || c.name === id);
        return match ? (match.class || match.name) : id;
    };

    const getAcademicYearName = (id) => {
        if (!id) return '---';
        const match = academicYears.find(ay => ay._id === id);
        return match ? (match.name || match.year) : id;
    };

    return (
        <div className="AddNewStudent container-fluid py-4 px-lg-5">
            <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3">
                <h3 className="fw-bold text-dark mb-0">
                    <i className="fa-solid fa-address-book me-2" style={{ color: 'var(--button-color)' }}></i>
                    {templateForm?.template?.label || 'Student Registration'}
                </h3>
            </div>

            {message && (
                <div className={`alert ${message.startsWith('✅') ? 'alert-success' : 'alert-danger'} mb-4 shadow-sm d-flex align-items-center`} role="alert">
                    <div className="flex-grow-1">{message}</div>
                    <button className="btn-close ms-2" onClick={() => setMessage('')} style={{ border: 'none', background: 'transparent' }}>&times;</button>
                </div>
            )}

            <div className="row g-4">
                {/* Left Column: The Dynamic Form */}
                <div className="col-lg-6">
                    {templateForm && (
                        <div className="premium-card bg-white p-4 shadow-sm rounded border">
                            <h5 className="fw-bold mb-3 text-secondary">
                                <i className="fa-solid fa-pen-to-square me-2"></i>Registration Form Details
                            </h5>
                            <p className="text-muted small mb-4">{templateForm.template.description}</p>
                            <DynamicForm
                                template={templateForm}
                                mode="create"
                                onSubmit={handleRegisterStudent}
                                onChange={setLiveValues}
                                submitLabel="Register Student"
                                loading={loading}
                            />
                        </div>
                    )}
                </div>

                {/* Right Column: Live print preview matching template style */}
                <div className="col-lg-6">
                    <div className="premium-card bg-white p-4 shadow-sm rounded border sticky-top" style={{ top: '24px', zIndex: 1 }}>
                        <h5 className="fw-bold mb-3 text-secondary border-bottom pb-2">
                            <i className="fa-solid fa-print me-2"></i>Live Document Print Preview (A4 Form)
                        </h5>
                        
                        <div className="a4-sheet p-5 border shadow-sm mx-auto bg-white text-dark position-relative" style={{ maxWidth: '100%', minHeight: '850px', fontSize: '11px', border: '1px solid #ddd' }}>
                            
                            {/* School Header */}
                            <div className="text-center border-bottom pb-2 mb-3">
                                <h4 className="fw-bold mb-1 text-uppercase text-primary" style={{ letterSpacing: '1px', fontSize: '18px' }}>Vamshee Techno School</h4>
                                <p className="text-muted mb-0 small" style={{ fontSize: '10px' }}>Affiliated to CBSE, Academic Session {getAcademicYearName(liveValues.academicyear)}</p>
                                <h6 className="fw-bold text-secondary mt-1 mb-0" style={{ letterSpacing: '0.5px' }}>OFFICIAL ADMISSION RECORD</h6>
                            </div>

                            {/* Main Body */}
                            <div className="row g-2">
                                {/* Photo Box & Student Name Row */}
                                <div className="col-8">
                                    <div className="mb-2">
                                        <strong className="text-muted d-block" style={{ fontSize: '9px' }}>STUDENT FULL NAME</strong>
                                        <span className="fw-bold text-uppercase" style={{ fontSize: '13px' }}>
                                            {liveValues.fullname || '---'}
                                        </span>
                                    </div>
                                    <div className="row g-2">
                                        <div className="col-8">
                                            <strong className="text-muted d-block" style={{ fontSize: '9px' }}>STUDENT NAME (HINDI)</strong>
                                            <span className="fw-semibold">{liveValues.studentnamehindi || '---'}</span>
                                        </div>
                                        <div className="col-4">
                                            <strong className="text-muted d-block" style={{ fontSize: '9px' }}>SCHOOL TYPE</strong>
                                            <span className="fw-semibold">{liveValues.schooltype || '---'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-4 text-end">
                                    <div className="d-inline-block border bg-light text-center rounded" style={{ width: '90px', height: '100px', overflow: 'hidden' }}>
                                        {liveValues.profilephoto ? (
                                            <img src={liveValues.profilephoto} alt="Student" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <div className="d-flex flex-column align-items-center justify-content-center h-100 text-muted">
                                                <i className="fa-solid fa-user fa-2x mb-1"></i>
                                                <span style={{ fontSize: '8px' }}>PASSPORT PHOTO</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Section 1: Academic Information */}
                                <div className="col-12 mt-2">
                                    <div className="section-title fw-bold text-secondary border-bottom pb-1 mb-2" style={{ letterSpacing: '0.5px', fontSize: '10px' }}>
                                        I. ACADEMIC & ENROLLMENT DETAILS
                                    </div>
                                    <div className="row g-2">
                                        <div className="col-4">
                                            <strong className="text-muted d-block" style={{ fontSize: '8px' }}>ADMISSION NUMBER</strong>
                                            <span className="font-monospace fw-semibold">{liveValues.admissionnumber || '---'}</span>
                                        </div>
                                        <div className="col-4">
                                            <strong className="text-muted d-block" style={{ fontSize: '8px' }}>ROLL NUMBER</strong>
                                            <span className="font-monospace fw-semibold">{liveValues.rollnumber || '---'}</span>
                                        </div>
                                        <div className="col-4">
                                            <strong className="text-muted d-block" style={{ fontSize: '8px' }}>ADMISSION DATE</strong>
                                            <span className="fw-semibold">{liveValues.admissiondate || '---'}</span>
                                        </div>
                                        <div className="col-4">
                                            <strong className="text-muted d-block" style={{ fontSize: '8px' }}>CLASS</strong>
                                            <span className="fw-semibold">{getClassName(liveValues.class)}</span>
                                        </div>
                                        <div className="col-4">
                                            <strong className="text-muted d-block" style={{ fontSize: '8px' }}>SECTION</strong>
                                            <span className="fw-semibold">{liveValues.section || '---'}</span>
                                        </div>
                                        <div className="col-4">
                                            <strong className="text-muted d-block" style={{ fontSize: '8px' }}>ACADEMIC YEAR</strong>
                                            <span className="fw-semibold">{getAcademicYearName(liveValues.academicyear)}</span>
                                        </div>
                                        <div className="col-4">
                                            <strong className="text-muted d-block" style={{ fontSize: '8px' }}>STUDENT STATUS</strong>
                                            <span className="fw-semibold">{liveValues.studentstatus || '---'}</span>
                                        </div>
                                        <div className="col-4">
                                            <strong className="text-muted d-block" style={{ fontSize: '8px' }}>ACADEMIC STATUS</strong>
                                            <span className="fw-semibold">{liveValues.academic_status || '---'}</span>
                                        </div>
                                        <div className="col-4">
                                            <strong className="text-muted d-block" style={{ fontSize: '8px' }}>JOINING DATE</strong>
                                            <span className="fw-semibold">{liveValues.joiningdate || '---'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Personal Profile */}
                                <div className="col-12 mt-2">
                                    <div className="section-title fw-bold text-secondary border-bottom pb-1 mb-2" style={{ letterSpacing: '0.5px', fontSize: '10px' }}>
                                        II. STUDENT PERSONAL PROFILE
                                    </div>
                                    <div className="row g-2">
                                        <div className="col-4">
                                            <strong className="text-muted d-block" style={{ fontSize: '8px' }}>GENDER</strong>
                                            <span className="fw-semibold">{liveValues.gender || '---'}</span>
                                        </div>
                                        <div className="col-4">
                                            <strong className="text-muted d-block" style={{ fontSize: '8px' }}>DATE OF BIRTH</strong>
                                            <span className="fw-semibold">{liveValues.dateofbirth || '---'}</span>
                                        </div>
                                        <div className="col-4">
                                            <strong className="text-muted d-block" style={{ fontSize: '8px' }}>BLOOD GROUP</strong>
                                            <span className="fw-semibold">{liveValues.bloodgroup || '---'}</span>
                                        </div>
                                        <div className="col-4">
                                            <strong className="text-muted d-block" style={{ fontSize: '8px' }}>CASTE</strong>
                                            <span className="fw-semibold">{liveValues.caste || '---'}</span>
                                        </div>
                                        <div className="col-4">
                                            <strong className="text-muted d-block" style={{ fontSize: '8px' }}>CASTE (HINDI)</strong>
                                            <span className="fw-semibold">{liveValues.castenamehindi || '---'}</span>
                                        </div>
                                        <div className="col-4">
                                            <strong className="text-muted d-block" style={{ fontSize: '8px' }}>CASTE CERTIFICATE NO.</strong>
                                            <span className="fw-semibold">{liveValues.castecertificatenumber || '---'}</span>
                                        </div>
                                        <div className="col-4">
                                            <strong className="text-muted d-block" style={{ fontSize: '8px' }}>CATEGORY</strong>
                                            <span className="fw-semibold">{liveValues.category || '---'}</span>
                                        </div>
                                        <div className="col-4">
                                            <strong className="text-muted d-block" style={{ fontSize: '8px' }}>RELIGION</strong>
                                            <span className="fw-semibold">{liveValues.religion || '---'}</span>
                                        </div>
                                        <div className="col-4">
                                            <strong className="text-muted d-block" style={{ fontSize: '8px' }}>MOTHER TONGUE</strong>
                                            <span className="fw-semibold">{liveValues.mothertongue || '---'}</span>
                                        </div>
                                        <div className="col-6">
                                            <strong className="text-muted d-block" style={{ fontSize: '8px' }}>AADHAAR NUMBER</strong>
                                            <span className="font-monospace fw-semibold">{liveValues.aadhaarnumber || '---'}</span>
                                        </div>
                                        <div className="col-6">
                                            <strong className="text-muted d-block" style={{ fontSize: '8px' }}>BIRTH CERTIFICATE NO.</strong>
                                            <span className="font-monospace fw-semibold">{liveValues.birthcertificatenumber || '---'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 3: Parent & Family Details */}
                                <div className="col-12 mt-2">
                                    <div className="section-title fw-bold text-secondary border-bottom pb-1 mb-2" style={{ letterSpacing: '0.5px', fontSize: '10px' }}>
                                        III. FAMILY & GUARDIAN INFORMATION
                                    </div>
                                    <div className="row g-2">
                                        <div className="col-4">
                                            <strong className="text-muted d-block" style={{ fontSize: '8px' }}>FATHER'S NAME</strong>
                                            <span className="fw-semibold">{liveValues.fathername || '---'}</span>
                                        </div>
                                        <div className="col-4">
                                            <strong className="text-muted d-block" style={{ fontSize: '8px' }}>FATHER MOBILE</strong>
                                            <span className="fw-semibold">{liveValues.fathermobilenumber || '---'}</span>
                                        </div>
                                        <div className="col-4">
                                            <strong className="text-muted d-block" style={{ fontSize: '8px' }}>FATHER AADHAAR</strong>
                                            <span className="fw-semibold">{liveValues.fatheraadhaarnumber || '---'}</span>
                                        </div>
                                        <div className="col-4">
                                            <strong className="text-muted d-block" style={{ fontSize: '8px' }}>MOTHER'S NAME</strong>
                                            <span className="fw-semibold">{liveValues.mothername || '---'}</span>
                                        </div>
                                        <div className="col-4">
                                            <strong className="text-muted d-block" style={{ fontSize: '8px' }}>MOTHER MOBILE</strong>
                                            <span className="fw-semibold">{liveValues.mothermobilenumber || '---'}</span>
                                        </div>
                                        <div className="col-4">
                                            <strong className="text-muted d-block" style={{ fontSize: '8px' }}>MOTHER AADHAAR</strong>
                                            <span className="fw-semibold">{liveValues.motheraadhaarnumber || '---'}</span>
                                        </div>
                                        <div className="col-6">
                                            <strong className="text-muted d-block" style={{ fontSize: '8px' }}>STUDENT MOBILE</strong>
                                            <span className="fw-semibold">{liveValues.studentmobilenumber || '---'}</span>
                                        </div>
                                        <div className="col-6">
                                            <strong className="text-muted d-block" style={{ fontSize: '8px' }}>STUDENT EMAIL</strong>
                                            <span className="fw-semibold">{liveValues.studentemail || '---'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 4: Previous Education & Address */}
                                <div className="col-12 mt-2">
                                    <div className="section-title fw-bold text-secondary border-bottom pb-1 mb-2" style={{ letterSpacing: '0.5px', fontSize: '10px' }}>
                                        IV. PREVIOUS EDUCATION & CONTACT ADDRESS
                                    </div>
                                    <div className="row g-2">
                                        <div className="col-6">
                                            <strong className="text-muted d-block" style={{ fontSize: '8px' }}>PREVIOUS SCHOOL</strong>
                                            <span className="fw-semibold">{liveValues.previousschool || '---'}</span>
                                        </div>
                                        <div className="col-6">
                                            <strong className="text-muted d-block" style={{ fontSize: '8px' }}>TC NUMBER</strong>
                                            <span className="fw-semibold">{liveValues.tcnumber || '---'}</span>
                                        </div>
                                        <div className="col-12">
                                            <strong className="text-muted d-block" style={{ fontSize: '8px' }}>STREET ADDRESS</strong>
                                            <span className="fw-semibold">{liveValues.address || '---'}</span>
                                        </div>
                                        <div className="col-3">
                                            <strong className="text-muted d-block" style={{ fontSize: '8px' }}>CITY</strong>
                                            <span className="fw-semibold">{liveValues.city || '---'}</span>
                                        </div>
                                        <div className="col-3">
                                            <strong className="text-muted d-block" style={{ fontSize: '8px' }}>DISTRICT</strong>
                                            <span className="fw-semibold">{liveValues.district || '---'}</span>
                                        </div>
                                        <div className="col-3">
                                            <strong className="text-muted d-block" style={{ fontSize: '8px' }}>STATE</strong>
                                            <span className="fw-semibold">{liveValues.state || '---'}</span>
                                        </div>
                                        <div className="col-3">
                                            <strong className="text-muted d-block" style={{ fontSize: '8px' }}>PINCODE</strong>
                                            <span className="fw-semibold">{liveValues.pincode || '---'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Signatures */}
                                <div className="col-12 mt-4 pt-3 border-top">
                                    <div className="d-flex justify-content-between text-center" style={{ fontSize: '9px' }}>
                                        <div>
                                            <div className="mb-3"></div>
                                            <strong>Parent's Signature</strong>
                                        </div>
                                        <div>
                                            <div className="mb-3"></div>
                                            <strong>Registrar / Admin Office</strong>
                                        </div>
                                        <div>
                                            <div className="mb-3"></div>
                                            <strong>Principal Stamp</strong>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <LoadingIndicator message={loadingMessage} active={loading} />
        </div>
    );
}
