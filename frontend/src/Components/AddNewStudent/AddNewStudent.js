import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFieldDefinitions, getAcademicYears, getClasses, addStudent } from '../../API';
import './AddNewStudent.css';

// Renders a single dynamic form field based on its type
function DynamicField({ field, value, onChange }) {
    const handleChange = (e) => onChange(field._id, e.target.value);

    switch (field.fieldType) {
        case 'date':
            return <input type="date" className="form-control" value={value || ''} onChange={handleChange} />;
        case 'number':
            return <input type="number" className="form-control" value={value || ''} onChange={handleChange} placeholder={field.fieldName} />;
        case 'textarea':
            return <textarea className="form-control" rows={2} value={value || ''} onChange={handleChange} placeholder={field.fieldName} />;
        case 'phone':
            return <input type="tel" className="form-control" value={value || ''} onChange={handleChange} placeholder={field.fieldName} />;
        case 'email':
            return <input type="email" className="form-control" value={value || ''} onChange={handleChange} placeholder={field.fieldName} />;
        case 'select':
            return (
                <select className="form-select" value={value || ''} onChange={handleChange}>
                    <option value="">-- Select --</option>
                    {(field.options || []).map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            );
        default:
            return <input type="text" className="form-control" value={value || ''} onChange={handleChange} placeholder={field.fieldName} />;
    }
}

export default function AddNewStudent() {
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userType = localStorage.getItem('userType');
        if (!token || (userType !== 'student-enrollment' && userType !== 'admin')) {
            navigate('/');
        }
    }, [navigate]);

    // Core student fields
    const [name, setName] = useState('');
    const [image, setImage] = useState('');
    const [academicYearId, setAcademicYearId] = useState('');
    const [enrollmentClass, setEnrollmentClass] = useState('');

    // Dynamic EAV field values: { fieldId: value }
    const [dynamicValues, setDynamicValues] = useState({});

    // Fetched data
    const [fieldDefs, setFieldDefs] = useState([]);
    const [academicYears, setAcademicYears] = useState([]);
    const [classes, setClasses] = useState([]);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    // Fetch field definitions, academic years, and classes on mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [fieldsRes, yearsRes, classesRes] = await Promise.all([
                    getFieldDefinitions(),
                    getAcademicYears(),
                    getClasses(),
                ]);

                setFieldDefs(fieldsRes.data?.data || []);
                setAcademicYears(yearsRes.data?.data || []);
                setClasses(classesRes.data?.classes || classesRes.data?.data || classesRes.data || []);

                // Pre-select first academic year
                const years = yearsRes.data?.data || [];
                if (years.length > 0) setAcademicYearId(years[0]._id);
            } catch (err) {
                console.error('Failed to load form data:', err.message);
            }
        };
        fetchData();
    }, []);

    // Handle dynamic field value updates
    const handleDynamicChange = (fieldId, value) => {
        setDynamicValues(prev => ({ ...prev, [fieldId]: value }));
    };

    // Submit student
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return setMessage('⚠️ Student name is required.');

        setLoading(true);

        // Build dynamicFields array from values
        const dynamicFields = Object.entries(dynamicValues)
            .filter(([, v]) => v !== '' && v !== undefined && v !== null)
            .map(([fieldId, value]) => ({ fieldId, value }));

        // Client-side validation using regex formulas
        for (const df of dynamicFields) {
            const fieldDef = fieldDefs.find(f => f._id === df.fieldId);
            if (fieldDef && fieldDef.validationPattern) {
                try {
                    const regex = new RegExp(fieldDef.validationPattern);
                    if (df.value && !regex.test(df.value)) {
                        setLoading(false);
                        return setMessage(`⚠️ ${fieldDef.validationMessage || `Invalid format for '${fieldDef.fieldName}'`}`);
                    }
                } catch (regexErr) {
                    console.error("Invalid regex pattern defined:", fieldDef.validationPattern);
                }
            }
        }

        const payload = {
            name: name.trim(),
            image,
            academicYearId,
            enrollmentClass,
            dynamicFields
        };

        try {
            await addStudent(payload);
            setMessage('✅ Student registered successfully!');
            // Reset form
            setName('');
            setImage('');
            setDynamicValues({});
            if (academicYears.length > 0) setAcademicYearId(academicYears[0]._id);
            setEnrollmentClass('');
        } catch (err) {
            setMessage('❌ Error: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="AddNewStudent">

            {message && (
                <div className={`alert ${message.startsWith('✅') ? 'alert-success' : 'alert-danger'} mb-4`} role="alert">
                    {message}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="row g-4">
                    {/* Core fields card */}
                    <div className="col-lg-8">
                        <div className="card border-0 shadow-sm mb-4">
                            <div className="card-header fw-semibold" style={{ backgroundColor: 'var(--button-color)', color: 'white' }}>
                                <i className="fas fa-id-card me-2"></i>Core Information
                            </div>
                            <div className="card-body p-4">
                                <div className="row g-3">
                                    <div className="col-12">
                                        <label className="form-label fw-semibold">Full Name <span className="text-danger">*</span></label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            placeholder="Student's full name"
                                            required
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold">Academic Year <span className="text-danger">*</span></label>
                                        <select className="form-select" value={academicYearId} onChange={e => setAcademicYearId(e.target.value)} required>
                                            <option value="">-- Select Academic Year --</option>
                                            {academicYears.map(y => (
                                                <option key={y._id} value={y._id}>{y.year || y.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold">Class</label>
                                        <select className="form-select" value={enrollmentClass} onChange={e => setEnrollmentClass(e.target.value)}>
                                            <option value="">-- Select Class --</option>
                                            {classes.map((cls, i) => (
                                                <option key={cls._id || i} value={cls.class || cls.name || cls}>{cls.class || cls.name || cls}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-12">
                                        <label className="form-label fw-semibold">Profile Photo URL</label>
                                        <input
                                            type="url"
                                            className="form-control"
                                            value={image}
                                            onChange={e => setImage(e.target.value)}
                                            placeholder="https://example.com/photo.jpg"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Dynamic EAV fields card */}
                        {fieldDefs.length > 0 && (
                            <div className="card border-0 shadow-sm">
                                <div className="card-header fw-semibold" style={{ backgroundColor: 'var(--button-color)', color: 'white' }}>
                                    <i className="fas fa-list-alt me-2"></i>Additional Information
                                </div>
                                <div className="card-body p-4">
                                    <div className="row g-3">
                                        {fieldDefs.map(field => (
                                            <div key={field._id} className={field.fieldType === 'textarea' ? 'col-12' : 'col-md-6'}>
                                                <label className="form-label fw-semibold">
                                                    {field.fieldName}
                                                    {field.required && <span className="text-danger ms-1">*</span>}
                                                </label>
                                                <DynamicField
                                                    field={field}
                                                    value={dynamicValues[field._id] || ''}
                                                    onChange={handleDynamicChange}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right sidebar: image preview and actions */}
                    <div className="col-lg-4">
                        <div className="card border-0 shadow-sm mb-4 text-center">
                            <div className="card-body p-4">
                                {image ? (
                                    <img src={image} alt="Preview" className="rounded-circle mb-3" style={{ width: '120px', height: '120px', objectFit: 'cover' }} />
                                ) : (
                                    <div className="d-flex align-items-center justify-content-center rounded-circle bg-light mx-auto mb-3" style={{ width: '120px', height: '120px' }}>
                                        <i className="fas fa-user fa-3x text-secondary"></i>
                                    </div>
                                )}
                                <p className="text-muted small">Profile photo preview</p>
                            </div>
                        </div>

                        <div className="card border-0 shadow-sm">
                            <div className="card-body p-4 d-grid gap-2">
                                <button
                                    type="submit"
                                    className="btn text-white fw-bold"
                                    style={{ backgroundColor: 'var(--button-color)', border: 'none', padding: '0.5rem 1rem' }}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <><i className="fas fa-spinner fa-spin me-2"></i>Registering...</>
                                    ) : (
                                        <><i className="fas fa-save me-2"></i>Register Student</>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    style={{ padding: '0.5rem 1rem' }}
                                    onClick={() => navigate('/Students')}
                                >
                                    <i className="fas fa-arrow-left me-2"></i>Back to Students
                                </button>
                            </div>
                        </div>

                        {/* Summary of loaded fields */}
                        <div className="card border-0 shadow-sm mt-4">
                            <div className="card-body p-3">
                                <p className="mb-1 small text-muted fw-semibold">Form Configuration</p>
                                <p className="mb-0 small">{fieldDefs.length} dynamic fields loaded</p>
                                <p className="mb-0 small">{academicYears.length} academic year(s) available</p>
                                <p className="mb-0 small">{classes.length} class(es) available</p>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
