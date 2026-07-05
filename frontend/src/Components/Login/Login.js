import React, { useState, useEffect } from 'react';
import { login as apiLogin, getAllMasters } from '../../API';
import './Login.css';

// Dynamic assets maps based on school slug
const schoolAssets = {
    "brilliant-public-school": {
        motto: "Nurturing Excellence, Inspiring Brilliance",
        campusImage: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1200&q=80",
        overlayColor: "rgba(15, 32, 67, 0.88)" // Rich Deep Navy Blue
    },
    "vamshee": {
        motto: "Innovation in Education, Excellence in Life",
        campusImage: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=80",
        overlayColor: "rgba(67, 30, 15, 0.88)" // Deep Warm Amber/Bronze
    },
    "default": {
        motto: "Empowering Minds, Shaping Futures",
        campusImage: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=1200&q=80",
        overlayColor: "rgba(15, 23, 42, 0.9)" // Slate Dark
    }
};

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
                
                // 1. Check if subdomain is active on system domains, or if it is a custom domain
                const host = window.location.hostname;
                const isSystemDomain = host.endsWith('.schooltechnosolution.com') || host.endsWith('.localhost') || host.endsWith('.vercel.app');
                
                if (isSystemDomain && res.data) {
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
                } else if (host !== 'localhost' && host.includes('.') && res.data) {
                    // Custom Domain: Find matching school by customDomain field
                    const match = res.data.find(s => s.customDomain === host);
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

    const hostForSub = window.location.hostname;
    const isSystemDomainForSub = hostForSub.endsWith('.schooltechnosolution.com') || hostForSub.endsWith('.localhost') || hostForSub.endsWith('.vercel.app');
    const isCustomDomainForSub = hostForSub !== 'localhost' && hostForSub.includes('.') && !isSystemDomainForSub;
    const isSubdomain = isSystemDomainForSub || isCustomDomainForSub;

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
                localStorage.setItem('schoolMotto', school.motto || '');
                localStorage.setItem('schoolBgImage', school.backgroundImage || '');
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

    // Resolve active school assets - prioritizing database fields, falling back to local preset configs
    const activeAssets = {
        motto: selectedSchool?.motto || (selectedSchool ? (schoolAssets[selectedSchool.slug]?.motto || schoolAssets["default"].motto) : schoolAssets["default"].motto),
        campusImage: selectedSchool?.backgroundImage || (selectedSchool ? (schoolAssets[selectedSchool.slug]?.campusImage || schoolAssets["default"].campusImage) : schoolAssets["default"].campusImage),
        overlayColor: selectedSchool ? (schoolAssets[selectedSchool.slug]?.overlayColor || schoolAssets["default"].overlayColor) : schoolAssets["default"].overlayColor
    };

    return (
        <div className="login-split-container">
            {/* Left Side: Authentication (40–45% width) */}
            <div className="login-auth-panel">
                <div className="login-card-inner">
                    <div className="login-header-minimal">
                        <h2>Sign In</h2>
                        <p>Enter your institutional credentials to gain access.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="mt-4">
                        {error && <div className="alert alert-danger py-2 small mb-4">{error}</div>}

                        {/* Tenant Switcher dropdown on Login screen - hidden if loading via subdomain */}
                        {!isSubdomain && (
                            <div className="mb-4">
                                <label className="form-label login-field-label">Select School</label>
                                <select 
                                    className="form-select login-select-modern" 
                                    value={selectedSchool?._id || ''} 
                                    onChange={(e) => handleSchoolSwitch(e.target.value)}
                                >
                                    {schools.map(s => (
                                        <option key={s._id} value={s._id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="mb-4">
                            <label className="form-label login-field-label">Username</label>
                            <input 
                                type="text" 
                                className="form-control login-input-modern" 
                                placeholder="name@school" 
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required 
                            />
                        </div>

                        <div className="mb-4">
                            <label className="form-label login-field-label">Password</label>
                            <input 
                                type="password" 
                                className="form-control login-input-modern" 
                                placeholder="••••••••" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required 
                            />
                        </div>

                        <button 
                            type="submit" 
                            className="btn btn-login w-100 py-3 mt-3"
                            disabled={loading}
                        >
                            {loading ? (
                                <span><i className="fa-solid fa-spinner fa-spin me-2"></i>Verifying...</span>
                            ) : (
                                <span>Continue <i className="fa-solid fa-arrow-right ms-2"></i></span>
                            )}
                        </button>
                    </form>
                </div>
            </div>

            {/* Right Side: School Branding Area (55–60% width) */}
            <div 
                className="login-brand-panel"
                style={{ backgroundImage: `url(${activeAssets.campusImage})` }}
            >
                {/* Brand Overlay containing deep tinted transparency matching school theme */}
                <div 
                    className="brand-panel-overlay"
                    style={{ backgroundColor: activeAssets.overlayColor }}
                ></div>
                
                <div className="brand-panel-content">
                    {selectedSchool ? (
                        <>
                            <img 
                                src={selectedSchool.logoUrl || selectedSchool.imageUrl || 'default.jpg'} 
                                alt={selectedSchool.name} 
                                className="brand-school-logo mb-4"
                                onError={(e) => { e.target.src = 'https://placehold.co/120x120?text=School'; }}
                            />
                            <h1 className="brand-school-name">{selectedSchool.name}</h1>
                            <p className="brand-school-motto">{activeAssets.motto}</p>
                        </>
                    ) : (
                        <>
                            <div className="brand-global-icon mb-4">
                                <i className="fa-solid fa-globe"></i>
                            </div>
                            <h1 className="brand-school-name">School Scholastic System</h1>
                            <p className="brand-school-motto">Integrated multi-tenant enterprise portal</p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
