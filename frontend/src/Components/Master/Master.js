import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMasters, updateMaster, getAcademicYears, addAcademicYear as apiAddAcademicYear, deleteAcademicYear as apiDeleteAcademicYear } from '../../API';
import './Master.css';

export default function Master() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('profile');

    useEffect(() => {
        const token = localStorage.getItem("token");
        const userType = localStorage.getItem("userType");

        if (!token) {
            navigate("/login");
            return;
        }

        if (userType !== "admin") {
            navigate("/");
        }
    }, [navigate]);

    const [form, setForm] = useState({
        imageUrl: '',
        name: '',
        address: '',
        phoneNo: '',
        email: '',
        theme: {
            themeName: 'light'
        }
    });

    const [latestId, setLatestId] = useState(null);

    useEffect(() => {
        getMasters()
            .then(res => {
                const data = res.data;
                if (data) {
                    const activeTheme = data.theme?.themeName || 'light';
                    setForm({
                        imageUrl: data.logoUrl || data.imageUrl || '',
                        name: data.name || '',
                        address: data.address || '',
                        phoneNo: data.phoneNo || '',
                        email: data.email || '',
                        theme: { themeName: activeTheme }
                    });
                    setLatestId(data._id);
                }
            })
            .catch(() => setLatestId(null));
    }, []);

    // Cleanup preview theme on unmount if not saved
    useEffect(() => {
        return () => {
            const savedTheme = localStorage.getItem('theme') || 'light';
            document.documentElement.setAttribute('data-theme', savedTheme);
        };
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.startsWith('theme.')) {
            const themeKey = name.split('.')[1];
            setForm(prev => ({
                ...prev,
                theme: {
                    ...prev.theme,
                    [themeKey]: value
                }
            }));

            // Set the theme instantly on the root document element so the user sees the preview change live!
            if (themeKey === 'themeName') {
                document.documentElement.setAttribute('data-theme', value);
            }
        } else {
            setForm(prev => ({ ...prev, [name]: value }));
        }
    };

    const updateLatestMaster = () => {
        if (!latestId) return alert('⚠️ No school record to update.');

        const payload = { ...form, logoUrl: form.imageUrl };
        updateMaster(latestId, payload)
            .then(() => {
                alert('✅ Settings saved successfully!');
                localStorage.setItem('schoolLogo', form.imageUrl);
                localStorage.setItem('schoolName', form.name);
                localStorage.setItem('theme', form.theme.themeName);
                window.location.reload();
            })
            .catch(err => alert('Error saving settings: ' + err.message));
    };

    const [academicYear, setAcademicYear] = useState('');
    const [academicYears, setAcademicYears] = useState([]);
    useEffect(() => {
        fetchAcademicYears();
    }, []);
    const fetchAcademicYears = () => {
        getAcademicYears()
            .then(res => setAcademicYears(res.data.data))
            .catch(() => alert("❌ Failed to load academic years."));
    };
    const addAcademicYear = () => {
        if (!academicYear) return alert("Please enter an academic year.");
        apiAddAcademicYear({ year: academicYear })
            .then(() => {
                setAcademicYear('');
                fetchAcademicYears();
                alert("✅ Academic Year Added Successfully!");
            })
            .catch(() => alert("❌ Failed to add academic year"));
    };
    const deleteAcademicYear = (id) => {
        if (window.confirm("Are you sure you want to delete this academic year?")) {
            apiDeleteAcademicYear(id)
                .then(() => {
                    fetchAcademicYears();
                    alert("🗑️ Deleted");
                })
                .catch(() => alert("❌ Failed to delete"));
        }
    };

    const themes = [
        "light", "dark", "midnight-red", "Ocean", "Deep Ocean", "Earth", "Rose Blush",
        "Sunset Peach", "Mint Cream", "Lavender Day", "Charcoal Cyan", "Dracula Midnight",
        "Candy Pop", "Lemon Zest", "Watermelon Twist", "Sakura Bloom", "Grape Soda",
        "Cherry Red", "Neon Orange", "Solar Yellow", "Tropical Green", "Electric Blue",
        "Ultra Violet"
    ];


    return (
        <div className="master-container">
            {/* Navigation Tabs */}
            <ul className="nav nav-tabs mb-4 border-bottom-0">
                <li className="nav-item">
                    <button
                        className={`nav-link premium-nav-link ${activeTab === 'profile' ? 'active' : ''}`}
                        onClick={() => setActiveTab('profile')}
                    >
                        <i className="fas fa-id-card me-2"></i>Profile Details
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link premium-nav-link ${activeTab === 'branding' ? 'active' : ''}`}
                        onClick={() => setActiveTab('branding')}
                    >
                        <i className="fas fa-palette me-2"></i>Branding & Themes
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link premium-nav-link ${activeTab === 'sessions' ? 'active' : ''}`}
                        onClick={() => setActiveTab('sessions')}
                    >
                        <i className="fas fa-history me-2"></i>Academic Rollover
                    </button>
                </li>
            </ul>

            {/* Forms section */}
            <div className="row g-4">
                <div className="col-lg-8">
                    <div className="premium-card">
                        <div className="card-header-gradient d-flex align-items-center">
                            <i className="fas fa-edit me-2"></i>
                            {activeTab === 'profile' && "Update School Contact Metadata"}
                            {activeTab === 'branding' && "Modify Theme Preset Settings"}
                            {activeTab === 'sessions' && "Manage Operational Calendars"}
                        </div>

                        <div className="card-body p-4">
                            {activeTab === 'profile' && (
                                <div className="row g-3">
                                    <div className="col-12">
                                        <label className="premium-label">School Name</label>
                                        <input type="text" className="form-control premium-input" name="name" value={form.name} onChange={handleChange} required />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="premium-label">Email Address</label>
                                        <input type="email" className="form-control premium-input" name="email" value={form.email} onChange={handleChange} required />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="premium-label">Phone Number</label>
                                        <input type="text" className="form-control premium-input" name="phoneNo" value={form.phoneNo} onChange={handleChange} required />
                                    </div>
                                    <div className="col-12">
                                        <label className="premium-label">Physical Address</label>
                                        <input type="text" className="form-control premium-input" name="address" value={form.address} onChange={handleChange} required />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'branding' && (
                                <div className="row g-3">
                                    <div className="col-12">
                                        <label className="premium-label">Logo URL</label>
                                        <input type="text" className="form-control premium-input" name="imageUrl" value={form.imageUrl} onChange={handleChange} placeholder="https://domain.com/logo.png" />
                                    </div>
                                    <div className="col-12">
                                        <label className="premium-label">Theme Preset Layout</label>
                                        <select className="form-select premium-input" name="theme.themeName" value={form.theme.themeName} onChange={handleChange}>
                                            {themes.map((t) => (
                                                <option key={t} value={t}>{t.replace('-', ' ').toUpperCase()}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'sessions' && (
                                <div>
                                    <p className="text-muted mb-4">Select or add new active academic years. These serve as the system boundaries for student marks, promotion, and invoicing tracks.</p>
                                    <div className="d-flex gap-2 mb-4">
                                        <input
                                            type="text"
                                            className="form-control premium-input"
                                            placeholder="e.g. 2025-26"
                                            value={academicYear}
                                            onChange={(e) => setAcademicYear(e.target.value)}
                                        />
                                        <button className="btn btn-success btn-premium" onClick={addAcademicYear} style={{ padding: '0.4rem 0.8rem' }}>
                                            <i className="fas fa-plus me-1"></i>Add Session
                                        </button>
                                    </div>

                                    <div className="row g-3">
                                        {academicYears.length === 0 ? (
                                            <div className="col-12 text-center py-4">
                                                <p className="text-muted mb-0">No active academic years registered.</p>
                                            </div>
                                        ) : (
                                            academicYears.map((yearObj) => (
                                                <div className="col-md-6" key={yearObj._id}>
                                                    <div className="border rounded p-3 d-flex justify-content-between align-items-center shadow-sm bg-white">
                                                        <span className="fw-semibold">
                                                            <i className="fas fa-calendar me-2 text-muted"></i>{yearObj.year}
                                                        </span>
                                                        <button className="btn btn-sm btn-outline-danger" onClick={() => deleteAcademicYear(yearObj._id)}>
                                                            <i className="fas fa-trash-alt"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Actions Buttons inside Card Footer */}
                            {activeTab !== 'sessions' && (
                                <div className="d-flex gap-3 mt-4 pt-3 border-top justify-content-end">
                                    <button type="button" className="btn btn-premium btn-premium-primary" onClick={updateLatestMaster} style={{ padding: '0.4rem 0.8rem' }}>
                                        <i className="fas fa-save me-2"></i>Save Configuration
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar Preview Box */}
                <div className="col-lg-4">
                    <div className="premium-card h-100 p-4 d-flex flex-column justify-content-between align-items-center text-center bg-white">
                        <div className="w-100">
                            <h4 className="fw-bold mb-3">Live Branding Preview</h4>
                            <p className="text-muted small mb-4">Preview of how the branding matches dynamically with the client dashboard layouts.</p>

                            <div className="brand-preview-box mb-4" style={{ backgroundColor: 'lightgrey', color: 'var(--text-color)', border: '1px solid rgba(0,0,0,0.15)' }}>
                                {form.imageUrl ? (
                                    <img src={form.imageUrl} alt="School Logo" className="brand-preview-logo" />
                                ) : (
                                    <div className="d-flex align-items-center justify-content-center bg-secondary text-white rounded-circle mx-auto mb-3" style={{ width: '70px', height: '70px' }}>
                                        <i className="fas fa-school fa-2x"></i>
                                    </div>
                                )}
                                <h5 className="fw-bold mb-1 text-truncate">{form.name || 'School Name'}</h5>
                                <span className="badge bg-success small mb-2 p-2 rounded-pill">
                                    {form.theme.themeName.toUpperCase()}
                                </span>
                            </div>
                        </div>

                        <div className="w-100">
                            <div className="d-grid gap-2">
                                <button className="btn w-100 text-white" style={{ backgroundColor: 'var(--button-color)', border: 'none' }}>
                                    Primary Action Button
                                </button>
                                <div className="p-3 rounded text-center small fw-semibold" style={{ backgroundColor: 'var(--background-color)', border: '1px solid var(--button-color)', color: 'var(--text-color)' }}>
                                    Secondary Accent Palette
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
