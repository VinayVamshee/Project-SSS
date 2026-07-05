import React, { useState, useEffect } from 'react';
import { login as apiLogin, getAllMasters } from '../../API';
import './Login.css';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [schools, setSchools] = useState([]);
    const [selectedSchool, setSelectedSchool] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Load available school tenants
    useEffect(() => {
        getAllMasters()
            .then(res => {
                setSchools(res.data || []);
                
                // 1. Check if subdomain is active
                const host = window.location.hostname;
                if (host.includes('.localhost') && res.data) {
                    const subdomain = host.split('.')[0];
                    const match = res.data.find(s => s.slug === subdomain);
                    if (match) {
                        setSelectedSchool(match);
                        localStorage.setItem('schoolSlug', match.slug);
                        localStorage.setItem('schoolId', match._id);
                        localStorage.setItem('schoolName', match.name);
                        localStorage.setItem('schoolLogo', match.logoUrl || match.imageUrl || '');
                        document.documentElement.setAttribute('data-theme', match.theme?.themeName || 'light');
                        return; // Done
                    }
                }

                // Default to stored school if available
                const storedSlug = localStorage.getItem('schoolSlug');
                if (storedSlug && res.data) {
                    const match = res.data.find(s => s.slug === storedSlug);
                    if (match) {
                        setSelectedSchool(match);
                        document.documentElement.setAttribute('data-theme', match.theme?.themeName || 'light');
                    }
                } else if (res.data && res.data.length > 0) {
                    // Fallback to active school
                    const activeSchool = res.data.find(s => s.status === 'active') || res.data[0];
                    setSelectedSchool(activeSchool);
                    localStorage.setItem('schoolSlug', activeSchool.slug);
                    localStorage.setItem('schoolId', activeSchool._id);
                    localStorage.setItem('schoolName', activeSchool.name);
                    localStorage.setItem('schoolLogo', activeSchool.logoUrl || activeSchool.imageUrl || '');
                    document.documentElement.setAttribute('data-theme', activeSchool.theme?.themeName || 'light');
                }
            })
            .catch(err => console.error('Error fetching schools:', err));
    }, []);

    const handleSchoolSwitch = (schoolId) => {
        const match = schools.find(s => s._id === schoolId);
        if (match) {
            setSelectedSchool(match);
            localStorage.setItem('schoolSlug', match.slug);
            localStorage.setItem('schoolId', match._id);
            localStorage.setItem('schoolName', match.name);
            localStorage.setItem('schoolLogo', match.logoUrl || match.imageUrl || '');
            document.documentElement.setAttribute('data-theme', match.theme?.themeName || 'light');
        }
    };

    const isSubdomain = window.location.hostname.includes('.localhost');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await apiLogin({ username, password });
            const { token, school } = res.data;

            localStorage.setItem('token', token);

            // Parse JWT
            const payload = JSON.parse(atob(token.split('.')[1]));
            localStorage.setItem('userType', payload.role || 'viewer');
            localStorage.setItem('userRole', payload.role || 'viewer');
            localStorage.setItem('isDev', payload.isDev ? 'true' : 'false');
            localStorage.setItem('username', payload.username);

            if (school) {
                localStorage.setItem('schoolSlug', school.slug || '');
                localStorage.setItem('schoolId', school._id || payload.schoolId || '');
                localStorage.setItem('schoolName', school.name || '');
                localStorage.setItem('schoolLogo', school.logoUrl || school.imageUrl || '');
                localStorage.setItem('theme', school.theme?.themeName || 'light');
                document.documentElement.setAttribute('data-theme', school.theme?.themeName || 'light');
            }

            // Redirect to home dashboard
            window.location.href = '/';
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid username or password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page-container">
            <div className="login-card-wrapper ov-animate-fade">
                {/* Branding Block */}
                <div className="login-branding">
                    {selectedSchool ? (
                        <>
                            <img 
                                src={selectedSchool.logoUrl || selectedSchool.imageUrl || 'default.jpg'} 
                                alt={selectedSchool.name} 
                                className="login-school-logo mb-3"
                                onError={(e) => { e.target.src = 'https://placehold.co/120x120?text=School'; }}
                            />
                            <h4 className="school-brand-title">{selectedSchool.name}</h4>
                            <p className="school-brand-subtitle">Student Scholastic System</p>
                        </>
                    ) : (
                        <>
                            <i className="fas fa-school fa-3x text-primary mb-3"></i>
                            <h4 className="school-brand-title">Scholastic Portal</h4>
                            <p className="school-brand-subtitle">Select School Tenant to Begin</p>
                        </>
                    )}
                </div>

                {/* Form Content */}
                <div className="login-form-content">
                    <form onSubmit={handleSubmit}>
                        {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}

                        {/* Tenant Switcher dropdown on Login screen - hidden if loading via subdomain */}
                        {!isSubdomain && (
                            <div className="mb-3">
                                <label className="form-label login-field-label">Portal Directory</label>
                                <select 
                                    className="form-select login-select" 
                                    value={selectedSchool?._id || ''} 
                                    onChange={(e) => handleSchoolSwitch(e.target.value)}
                                >
                                    {schools.map(s => (
                                        <option key={s._id} value={s._id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="mb-3">
                            <label className="form-label login-field-label">Username</label>
                            <div className="input-group">
                                <span className="input-group-text login-input-icon"><i className="fas fa-user text-muted"></i></span>
                                <input 
                                    type="text" 
                                    className="form-control login-input" 
                                    value={username} 
                                    onChange={(e) => setUsername(e.target.value)} 
                                    placeholder="Enter username" 
                                    required 
                                />
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="form-label login-field-label">Password</label>
                            <div className="input-group">
                                <span className="input-group-text login-input-icon"><i className="fas fa-lock text-muted"></i></span>
                                <input 
                                    type="password" 
                                    className="form-control login-input" 
                                    value={password} 
                                    onChange={(e) => setPassword(e.target.value)} 
                                    placeholder="••••••••" 
                                    required 
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            className="btn btn-login w-100 fw-bold py-2 mt-2" 
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    Authenticating...
                                </>
                            ) : 'Sign In'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
