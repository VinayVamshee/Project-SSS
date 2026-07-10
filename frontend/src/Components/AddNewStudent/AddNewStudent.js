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
                    (t.entity?.key === 'student_enrollment' || t.entity === 'student_enrollment') &&
                    t.key.includes('student_registration')
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
            await submitTemplateForm(templateForm.template._id, formData);
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
        const match = classes.find(c => c._id === id);
        return match ? match.class : id;
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
                {/* Left Column: The Form */}
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
                            />
                        </div>
                    )}
                </div>

                {/* Right Column: Premium Live Print Preview */}
                <div className="col-lg-6">
                    <div className="premium-card bg-white p-4 shadow-sm rounded border sticky-top" style={{ top: '24px', zIndex: 1 }}>
                        <h5 className="fw-bold mb-3 text-secondary border-bottom pb-2">
                            <i className="fa-solid fa-print me-2"></i>Live Document Print Preview (A4 Form)
                        </h5>
                        
                        {/* A4 Printout Sheet container */}
                        <div className="a4-sheet p-5 border shadow-sm mx-auto bg-white text-dark position-relative" style={{ maxWidth: '100%', minHeight: '650px', fontSize: '12px', border: '1px solid #ddd' }}>
                            
                            {/* School Header */}
                            <div className="text-center border-bottom pb-3 mb-4">
                                <h4 className="fw-bold mb-1 text-uppercase text-primary" style={{ letterSpacing: '1px', fontSize: '18px' }}>Vamshee Techno School</h4>
                                <p className="text-muted mb-0 small" style={{ fontSize: '10px' }}>Affiliated to CBSE, Academic Session {getAcademicYearName(liveValues.academicyear)}</p>
                                <h6 className="fw-bold text-secondary mt-2 mb-0" style={{ letterSpacing: '0.5px' }}>OFFICIAL ADMISSION RECORD</h6>
                            </div>

                            {/* Main Body */}
                            <div className="row g-3">
                                {/* Photo Box - Top Right */}
                                <div className="col-8">
                                    <div className="mb-2">
                                        <strong className="text-muted d-block" style={{ fontSize: '10px' }}>STUDENT NAME</strong>
                                        <span className="fw-bold text-uppercase" style={{ fontSize: '14px' }}>
                                            {liveValues.fullname || `${liveValues.firstname || ''} ${liveValues.middlename || ''} ${liveValues.lastname || ''}`.trim() || '---'}
                                        </span>
                                    </div>
                                    
                                    <div className="row g-2 mt-1">
                                        <div className="col-6">
                                            <strong className="text-muted d-block" style={{ fontSize: '10px' }}>GENDER</strong>
                                            <span className="fw-semibold">{liveValues.gender || '---'}</span>
                                        </div>
                                        <div className="col-6">
                                            <strong className="text-muted d-block" style={{ fontSize: '10px' }}>DATE OF BIRTH</strong>
                                            <span className="fw-semibold">{liveValues.dateofbirth || '---'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-4 text-end">
                                    <div className="d-inline-block border bg-light text-center rounded" style={{ width: '100px', height: '110px', overflow: 'hidden' }}>
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
                                <div className="col-12 mt-4">
                                    <div className="section-title fw-bold text-secondary border-bottom pb-1 mb-2" style={{ letterSpacing: '0.5px', fontSize: '11px' }}>
                                        I. ACADEMIC ENROLLMENT DETAILS
                                    </div>
                                    <div className="row g-3">
                                        <div className="col-4">
                                            <strong className="text-muted d-block" style={{ fontSize: '9px' }}>ADMISSION NUMBER</strong>
                                            <span className="font-monospace fw-semibold">{liveValues.admissionnumber || '---'}</span>
                                        </div>
                                        <div className="col-4">
                                            <strong className="text-muted d-block" style={{ fontSize: '9px' }}>ROLL NUMBER</strong>
                                            <span className="font-monospace fw-semibold">{liveValues.rollnumber || '---'}</span>
                                        </div>
                                        <div className="col-4">
                                            <strong className="text-muted d-block" style={{ fontSize: '9px' }}>ACADEMIC YEAR</strong>
                                            <span className="fw-semibold">{getAcademicYearName(liveValues.academicyear)}</span>
                                        </div>
                                        <div className="col-6">
                                            <strong className="text-muted d-block" style={{ fontSize: '9px' }}>CLASS</strong>
                                            <span className="fw-semibold">{getClassName(liveValues.class)}</span>
                                        </div>
                                        <div className="col-6">
                                            <strong className="text-muted d-block" style={{ fontSize: '9px' }}>SECTION</strong>
                                            <span className="fw-semibold">{liveValues.section || '---'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Parent / Guardian Details */}
                                <div className="col-12 mt-4">
                                    <div className="section-title fw-bold text-secondary border-bottom pb-1 mb-2" style={{ letterSpacing: '0.5px', fontSize: '11px' }}>
                                        II. PARENT / GUARDIAN INFORMATION
                                    </div>
                                    <div className="row g-3">
                                        <div className="col-6">
                                            <strong className="text-muted d-block" style={{ fontSize: '9px' }}>FATHER'S NAME</strong>
                                            <span className="fw-semibold">{liveValues.fathername || '---'}</span>
                                        </div>
                                        <div className="col-6">
                                            <strong className="text-muted d-block" style={{ fontSize: '9px' }}>MOTHER'S NAME</strong>
                                            <span className="fw-semibold">{liveValues.mothername || '---'}</span>
                                        </div>
                                        <div className="col-6">
                                            <strong className="text-muted d-block" style={{ fontSize: '9px' }}>CONTACT PHONE</strong>
                                            <span className="fw-semibold">{liveValues.mobilenumber || '---'}</span>
                                        </div>
                                        <div className="col-6">
                                            <strong className="text-muted d-block" style={{ fontSize: '9px' }}>EMAIL ADDRESS</strong>
                                            <span className="fw-semibold">{liveValues.email || '---'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 3: Contact & Address Details */}
                                <div className="col-12 mt-4">
                                    <div className="section-title fw-bold text-secondary border-bottom pb-1 mb-2" style={{ letterSpacing: '0.5px', fontSize: '11px' }}>
                                        III. PERMANENT CONTACT ADDRESS
                                    </div>
                                    <div className="row g-3">
                                        <div className="col-12">
                                            <strong className="text-muted d-block" style={{ fontSize: '9px' }}>STREET ADDRESS</strong>
                                            <span className="fw-semibold">{liveValues.address || '---'}</span>
                                        </div>
                                        <div className="col-4">
                                            <strong className="text-muted d-block" style={{ fontSize: '9px' }}>CITY</strong>
                                            <span className="fw-semibold">{liveValues.city || '---'}</span>
                                        </div>
                                        <div className="col-4">
                                            <strong className="text-muted d-block" style={{ fontSize: '9px' }}>STATE</strong>
                                            <span className="fw-semibold">{liveValues.state || '---'}</span>
                                        </div>
                                        <div className="col-4">
                                            <strong className="text-muted d-block" style={{ fontSize: '9px' }}>PINCODE</strong>
                                            <span className="fw-semibold">{liveValues.pincode || '---'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Signatures */}
                                <div className="col-12 mt-5 pt-4 position-absolute bottom-0 start-0 end-0 px-5 mb-5">
                                    <div className="d-flex justify-content-between text-center pt-3 border-top" style={{ fontSize: '10px' }}>
                                        <div>
                                            <div className="mb-4"></div>
                                            <strong>Parent's Signature</strong>
                                        </div>
                                        <div>
                                            <div className="mb-4"></div>
                                            <strong>Registrar / Admin Office</strong>
                                        </div>
                                        <div>
                                            <div className="mb-4"></div>
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
