import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    getAllMasters, 
    createMaster, 
    updateMaster,
    setMasterInUse, 
    deleteMaster as apiDeleteMaster,
    getFieldDefinitions,
    addFieldDefinition,
    updateFieldDefinition,
    deleteFieldDefinition,
    devCreateUser,
    devGetUsers,
    devUpdateUser
} from '../../API';
import './Developer.css';

export default function Developer() {
    const navigate = useNavigate();

    // ─── AUTHENTICATION CHECK ────────────────────────────────────────────────
    useEffect(() => {
        const token = localStorage.getItem("token");
        const isDev = localStorage.getItem("isDev");

        if (!token) {
            navigate("/login");
            return;
        }

        if (isDev !== "true") {
            navigate("/");
        }
    }, [navigate]);

    // ─── STATE MANAGEMENT ────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState('schools');
    const [allMasters, setAllMasters] = useState([]);
    const [fieldDefs, setFieldDefs] = useState([]);
    
    // User Accounts state
    const [selectedSchoolForUsers, setSelectedSchoolForUsers] = useState(localStorage.getItem('schoolId') || '');
    const [usersList, setUsersList] = useState([]);
    const [isEditingUser, setIsEditingUser] = useState(false);
    const [editingUserId, setEditingUserId] = useState(null);
    const [showFormPassword, setShowFormPassword] = useState(false);
    const [visiblePasswords, setVisiblePasswords] = useState({});
    const [userForm, setUserForm] = useState({
        username: '',
        password: '',
        role: 'viewer',
        schoolId: localStorage.getItem('schoolId') || ''
    });
    
    // School provisioning state
    const [isEditingSchool, setIsEditingSchool] = useState(false);
    const [editingSchoolId, setEditingSchoolId] = useState(null);
    const [schoolForm, setSchoolForm] = useState({
        imageUrl: '',
        name: '',
        address: '',
        phoneNo: '',
        email: '',
        theme: {
            themeName: 'light'
        },
        subscriptionPlan: 'basic',
        subscriptionStatus: 'active',
        featureQuestionPaper: true
    });

    // Dynamic field creation state
    const [isEditingField, setIsEditingField] = useState(false);
    const [editingFieldId, setEditingFieldId] = useState(null);
    const [fieldForm, setFieldForm] = useState({
        sno: '',
        fieldKey: '',
        fieldName: '',
        fieldType: 'text',
        optionsRaw: '',
        required: false,
        isUnique: false,
        validationPattern: '',
        validationMessage: '',
        applicableSchools: [], // Stores Selected school IDs
        applyToAll: true      // Toggle flag for global scope
    });

    // Regex tester state
    const [regexTestString, setRegexTestString] = useState('');
    const [regexTestResult, setRegexTestResult] = useState({ tested: false, isValidSyntax: true, isMatch: false, error: '' });

    const themes = [
        "light", "dark", "midnight-red", "Ocean", "Deep Ocean", "Earth", "Rose Blush",
        "Sunset Peach", "Mint Cream", "Lavender Day", "Charcoal Cyan", "Dracula Midnight",
        "Candy Pop", "Lemon Zest", "Watermelon Twist", "Sakura Bloom", "Grape Soda",
        "Cherry Red", "Neon Orange", "Solar Yellow", "Tropical Green", "Electric Blue",
        "Ultra Violet"
    ];

    // ─── DATA FETCHERS ───────────────────────────────────────────────────────
    const fetchSchools = () => {
        getAllMasters()
            .then(res => setAllMasters(res.data))
            .catch(err => console.error('Error fetching schools:', err.message));
    };

    const fetchFields = () => {
        getFieldDefinitions()
            .then(res => setFieldDefs(res.data.data || []))
            .catch(err => console.error('Error fetching dynamic fields:', err.message));
    };

    useEffect(() => {
        fetchSchools();
        fetchFields();
    }, []);

    const fetchUsers = (schoolId) => {
        if (!schoolId) {
            setUsersList([]);
            return;
        }
        devGetUsers(schoolId)
            .then(res => setUsersList(res.data || []))
            .catch(err => {
                console.error('Error fetching users:', err.message);
                setUsersList([]);
            });
    };

    useEffect(() => {
        if (activeTab === 'users') {
            fetchUsers(selectedSchoolForUsers);
        }
    }, [activeTab, selectedSchoolForUsers]);

    const handleSchoolSelectForUsers = (e) => {
        const schoolId = e.target.value;
        setSelectedSchoolForUsers(schoolId);
        setUserForm(prev => ({ ...prev, schoolId }));
    };

    const handleCreateUser = (e) => {
        e.preventDefault();
        if (!userForm.username || !userForm.password || !userForm.schoolId) {
            alert('⚠️ Please fill all required fields');
            return;
        }
        if (isEditingUser) {
            devUpdateUser(editingUserId, userForm)
                .then(() => {
                    alert('🎉 User updated successfully!');
                    handleResetUserForm();
                    fetchUsers(selectedSchoolForUsers);
                })
                .catch(err => alert('❌ Error updating user: ' + (err.response?.data?.message || err.message)));
        } else {
            devCreateUser(userForm)
                .then(() => {
                    alert('🎉 User created successfully!');
                    setUserForm(prev => ({ ...prev, username: '', password: '' }));
                    fetchUsers(selectedSchoolForUsers);
                })
                .catch(err => alert('❌ Error creating user: ' + (err.response?.data?.message || err.message)));
        }
    };

    const handleEditUserClick = (user) => {
        setIsEditingUser(true);
        setEditingUserId(user._id);
        setUserForm({
            username: user.username,
            password: user.password,
            role: user.role,
            schoolId: user.schoolId
        });
    };

    const handleResetUserForm = () => {
        setIsEditingUser(false);
        setEditingUserId(null);
        setUserForm({
            username: '',
            password: '',
            role: 'viewer',
            schoolId: selectedSchoolForUsers
        });
    };

    const togglePasswordVisibility = (userId) => {
        setVisiblePasswords(prev => ({
            ...prev,
            [userId]: !prev[userId]
        }));
    };

    const handleImpersonateUser = (user) => {
        localStorage.setItem("isImpersonating", "true");
        localStorage.setItem("impersonatedUsername", user.username);
        localStorage.setItem("impersonatedRole", user.role);
        
        // Backup developer status
        localStorage.setItem("originalIsDev", "true");
        localStorage.setItem("originalUserRole", localStorage.getItem("userRole") || "");
        localStorage.setItem("originalUserType", localStorage.getItem("userType") || "");
        
        // Override with target impersonation role properties
        localStorage.setItem("isDev", "false");
        localStorage.setItem("userRole", user.role);
        localStorage.setItem("userType", user.role);
        
        alert(`🔑 Impersonating ${user.username} as ${user.role.toUpperCase()}. Redirecting to home...`);
        window.location.href = "/";
    };




    // ─── SCHOOL ACTIONS ──────────────────────────────────────────────────────
    const handleSchoolChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (name.startsWith('theme.')) {
            const themeKey = name.split('.')[1];
            setSchoolForm(prev => ({
                ...prev,
                theme: {
                    ...prev.theme,
                    [themeKey]: value
                }
            }));
        } else if (type === 'checkbox') {
            setSchoolForm(prev => ({ ...prev, [name]: checked }));
        } else {
            setSchoolForm(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSaveOrUpdateSchool = () => {
        if (!schoolForm.name || !schoolForm.email || !schoolForm.phoneNo) {
            return alert("Name, Email, and Phone Number are required fields.");
        }
        
        // Map form parameters to Mongoose School Schema structure
        const payload = {
            name: schoolForm.name.trim(),
            email: schoolForm.email.trim(),
            phoneNo: schoolForm.phoneNo.trim(),
            address: schoolForm.address.trim(),
            logoUrl: schoolForm.imageUrl.trim(),
            theme: {
                themeName: schoolForm.theme.themeName
            },
            subscription: {
                plan: schoolForm.subscriptionPlan,
                status: schoolForm.subscriptionStatus
            },
            features: {
                questionPaperModule: schoolForm.featureQuestionPaper
            }
        };

        if (isEditingSchool) {
            updateMaster(editingSchoolId, payload)
                .then(() => {
                    alert('✅ School Profile updated successfully!');
                    handleResetSchoolForm();
                    fetchSchools();
                })
                .catch(err => alert('Error updating school: ' + err.message));
        } else {
            // Include slug only during creation
            payload.slug = schoolForm.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
            createMaster(payload)
                .then(() => {
                    alert('✅ New School Tenant registered successfully!');
                    handleResetSchoolForm();
                    fetchSchools();
                })
                .catch(err => alert('Error adding school: ' + err.message));
        }
    };

    const handleEditSchoolClick = (school) => {
        setIsEditingSchool(true);
        setEditingSchoolId(school._id);
        setSchoolForm({
            name: school.name || '',
            email: school.email || '',
            phoneNo: school.phoneNo || '',
            address: school.address || '',
            imageUrl: school.logoUrl || school.imageUrl || '',
            theme: {
                themeName: school.theme?.themeName || 'light'
            },
            subscriptionPlan: school.subscription?.plan || 'basic',
            subscriptionStatus: school.subscription?.status || 'active',
            featureQuestionPaper: school.features?.hasOwnProperty('questionPaperModule') ? school.features.questionPaperModule : true
        });
        window.scrollTo({ top: 150, behavior: 'smooth' });
    };

    const handleResetSchoolForm = () => {
        setIsEditingSchool(false);
        setEditingSchoolId(null);
        setSchoolForm({
            imageUrl: '',
            name: '',
            address: '',
            phoneNo: '',
            email: '',
            theme: {
                themeName: 'light'
            },
            subscriptionPlan: 'basic',
            subscriptionStatus: 'active',
            featureQuestionPaper: true
        });
    };

    const handleSetInUse = (id) => {
        setMasterInUse(id)
            .then(() => { alert("✅ School brand set to active."); fetchSchools(); })
            .catch(() => alert("❌ Failed to set active."));
    };

    const handleDeleteSchool = (id) => {
        if (window.confirm("⚠️ Are you sure you want to delete this school profile? All related tenant records will become inaccessible.")) {
            apiDeleteMaster(id)
                .then(() => { alert("🗑️ School profile deleted."); fetchSchools(); })
                .catch((err) => { alert("❌ " + (err.response?.data?.error || err.response?.data?.message || err.message)); });
        }
    };

    // ─── REGEX SYNTAX CHECKER & TESTER ───────────────────────────────────────
    const validateRegexSyntax = (pattern) => {
        if (!pattern) return { isValidSyntax: true, error: '' };
        try {
            new RegExp(pattern);
            return { isValidSyntax: true, error: '' };
        } catch (e) {
            return { isValidSyntax: false, error: e.message };
        }
    };

    const checkRegexResult = useMemo(() => {
        const check = validateRegexSyntax(fieldForm.validationPattern);
        if (!check.isValidSyntax) {
            return { isValidSyntax: false, message: `❌ Invalid Regex Syntax: ${check.error}` };
        }
        if (fieldForm.validationPattern) {
            return { isValidSyntax: true, message: '✅ Regex Syntax is Valid' };
        }
        return { isValidSyntax: true, message: '' };
    }, [fieldForm.validationPattern]);

    const handleTestRegex = () => {
        const pattern = fieldForm.validationPattern;
        if (!pattern) {
            return setRegexTestResult({ tested: true, isValidSyntax: true, isMatch: false, error: 'No pattern provided' });
        }
        const syntaxCheck = validateRegexSyntax(pattern);
        if (!syntaxCheck.isValidSyntax) {
            return setRegexTestResult({ tested: true, isValidSyntax: false, isMatch: false, error: syntaxCheck.error });
        }
        try {
            const rx = new RegExp(pattern);
            const isMatch = rx.test(regexTestString);
            setRegexTestResult({ tested: true, isValidSyntax: true, isMatch, error: '' });
        } catch (err) {
            setRegexTestResult({ tested: true, isValidSyntax: false, isMatch: false, error: err.message });
        }
    };

    // ─── DUAL PICKLIST FOR SCHOOL SELECTION ──────────────────────────────────
    const availableSchools = useMemo(() => {
        return allMasters.filter(school => !fieldForm.applicableSchools.includes(school._id));
    }, [allMasters, fieldForm.applicableSchools]);

    const handleSelectSchool = (schoolId) => {
        setFieldForm(prev => ({
            ...prev,
            applicableSchools: [...prev.applicableSchools, schoolId]
        }));
    };

    const handleDeselectSchool = (schoolId) => {
        setFieldForm(prev => ({
            ...prev,
            applicableSchools: prev.applicableSchools.filter(id => id !== schoolId)
        }));
    };

    // ─── FIELD FORM HANDLERS ─────────────────────────────────────────────────
    const handleFieldChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (type === 'checkbox') {
            setFieldForm(prev => ({ ...prev, [name]: checked }));
        } else {
            setFieldForm(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSaveOrUpdateField = (e) => {
        e.preventDefault();
        const { sno, fieldKey, fieldName, fieldType, optionsRaw, required, isUnique, validationPattern, validationMessage, applicableSchools, applyToAll } = fieldForm;

        if (!sno || !fieldKey || !fieldName) {
            return alert("Sno, Field Key, and Field Name are required properties.");
        }

        if (validationPattern) {
            const syntaxCheck = validateRegexSyntax(validationPattern);
            if (!syntaxCheck.isValidSyntax) {
                return alert(`❌ Cannot save. The validation regex syntax is invalid: ${syntaxCheck.error}`);
            }
        }

        const optionsArray = optionsRaw ? optionsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
        const payload = {
            sno: Number(sno),
            fieldKey: fieldKey.trim(),
            fieldName: fieldName.trim(),
            fieldType,
            options: optionsArray,
            required,
            isUnique,
            validationPattern: validationPattern.trim(),
            validationMessage: validationMessage.trim(),
            applicableSchools: applyToAll ? [] : applicableSchools
        };

        if (isEditingField) {
            updateFieldDefinition(editingFieldId, payload)
                .then(() => {
                    alert('✅ Field definition updated successfully!');
                    handleResetFieldForm();
                    fetchFields();
                })
                .catch(err => alert('❌ Update failed: ' + (err.response?.data?.message || err.message)));
        } else {
            addFieldDefinition(payload)
                .then(() => {
                    alert('✅ Dynamic Field Definition registered successfully!');
                    handleResetFieldForm();
                    fetchFields();
                })
                .catch(err => alert('❌ Registration failed: ' + (err.response?.data?.message || err.message)));
        }
    };

    const handleEditClick = (field) => {
        setIsEditingField(true);
        setEditingFieldId(field._id);
        setFieldForm({
            sno: field.sno || '',
            fieldKey: field.fieldKey || '',
            fieldName: field.fieldName || '',
            fieldType: field.fieldType || 'text',
            optionsRaw: field.options ? field.options.join(', ') : '',
            required: field.required || false,
            isUnique: field.isUnique || false,
            validationPattern: field.validationPattern || '',
            validationMessage: field.validationMessage || '',
            applicableSchools: field.applicableSchools || [],
            applyToAll: !field.applicableSchools || field.applicableSchools.length === 0
        });
        setRegexTestString('');
        setRegexTestResult({ tested: false, isValidSyntax: true, isMatch: false, error: '' });
        window.scrollTo({ top: 150, behavior: 'smooth' });
    };

    const handleResetFieldForm = () => {
        setIsEditingField(false);
        setEditingFieldId(null);
        setFieldForm({
            sno: '',
            fieldKey: '',
            fieldName: '',
            fieldType: 'text',
            optionsRaw: '',
            required: false,
            isUnique: false,
            validationPattern: '',
            validationMessage: '',
            applicableSchools: [],
            applyToAll: true
        });
        setRegexTestString('');
        setRegexTestResult({ tested: false, isValidSyntax: true, isMatch: false, error: '' });
    };

    const handleToggleFieldStatus = (id, activeStatus) => {
        updateFieldDefinition(id, { isActive: !activeStatus })
            .then(() => {
                alert('✅ Field status updated!');
                fetchFields();
            })
            .catch(err => alert('❌ Error updating status: ' + err.message));
    };

    const handleDeleteField = (id) => {
        if (window.confirm("⚠️ Deleting this definition will hide this field from all registration forms. Existing data on student documents remains intact in database. Proceed?")) {
            deleteFieldDefinition(id)
                .then(() => {
                    alert('🗑️ Field definition removed successfully!');
                    fetchFields();
                })
                .catch(err => alert('❌ Error deleting field: ' + err.message));
        }
    };

    return (
        <div className="developer-container text-start">

            {/* Sub-Navigation Tabs Row */}
            <div className="d-flex gap-2 mb-4 border-bottom pb-2">
                <button 
                    onClick={() => setActiveTab('schools')}
                    className={`btn px-4 py-2 fw-semibold ${activeTab === 'schools' ? 'btn-primary' : 'btn-light text-muted'}`}
                    style={{ borderRadius: '8px' }}
                >
                    <i className="fas fa-school me-2"></i>School Tenants ({allMasters.length})
                </button>
                <button 
                    onClick={() => setActiveTab('fields')}
                    className={`btn px-4 py-2 fw-semibold ${activeTab === 'fields' ? 'btn-success text-white' : 'btn-light text-muted'}`}
                    style={{ borderRadius: '8px' }}
                >
                    <i className="fas fa-database me-2"></i>Registration Fields
                </button>
                <button 
                    onClick={() => setActiveTab('users')}
                    className={`btn px-4 py-2 fw-semibold ${activeTab === 'users' ? 'btn-info text-white' : 'btn-light text-muted'}`}
                    style={{ borderRadius: '8px' }}
                >
                    <i className="fas fa-users me-2"></i>User Accounts
                </button>
            </div>

            {/* TAB CONTENT: SCHOOL TENANTS */}
            {activeTab === 'schools' && (
                <div className="ov-animate-fade">

                    <div className="row g-4 mb-4">
                        <div className="col-12">
                            <div className="premium-card">
                                <div className={`card-header-gradient d-flex align-items-center justify-content-between ${isEditingSchool ? 'bg-warning text-dark' : 'bg-primary text-white'}`}>
                                    <span className="fw-bold">
                                        <i className={`fas ${isEditingSchool ? 'fa-edit' : 'fa-plus'} me-2`}></i>
                                        {isEditingSchool ? `Edit School Profile: ${schoolForm.name}` : 'Provision New School Tenant'}
                                    </span>
                                    {isEditingSchool && (
                                        <button className="btn btn-sm btn-outline-dark" onClick={handleResetSchoolForm}>
                                            <i className="fas fa-times me-1"></i>Cancel Edit
                                        </button>
                                    )}
                                </div>

                                <div className="card-body p-4">
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <label className="premium-label">School Name</label>
                                            <input type="text" className="form-control premium-input" name="name" value={schoolForm.name} onChange={handleSchoolChange} required />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="premium-label">Email Address</label>
                                            <input type="email" className="form-control premium-input" name="email" value={schoolForm.email} onChange={handleSchoolChange} required />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="premium-label">Phone Number</label>
                                            <input type="text" className="form-control premium-input" name="phoneNo" value={schoolForm.phoneNo} onChange={handleSchoolChange} required />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="premium-label">Physical Address</label>
                                            <input type="text" className="form-control premium-input" name="address" value={schoolForm.address} onChange={handleSchoolChange} />
                                        </div>
                                        <div className="col-md-12">
                                            <label className="premium-label">Logo URL</label>
                                            <input type="text" className="form-control premium-input" name="imageUrl" value={schoolForm.imageUrl} onChange={handleSchoolChange} placeholder="https://domain.com/logo.png" />
                                        </div>

                                        {/* Dynamic Theme selection */}
                                        <div className="col-md-4">
                                            <label className="premium-label">Theme Layout</label>
                                            <select className="form-select premium-input" name="theme.themeName" value={schoolForm.theme.themeName} onChange={handleSchoolChange}>
                                                {themes.map((t) => (
                                                    <option key={t} value={t}>{t.replace('-', ' ').toUpperCase()}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Subscription plan switcher */}
                                        <div className="col-md-4">
                                            <label className="premium-label">Subscription Plan</label>
                                            <select className="form-select premium-input" name="subscriptionPlan" value={schoolForm.subscriptionPlan} onChange={handleSchoolChange}>
                                                <option value="basic">Basic (Standard core options)</option>
                                                <option value="premium">Premium (Upgraded options)</option>
                                                <option value="enterprise">Enterprise (Unlimited options)</option>
                                            </select>
                                        </div>

                                        {/* Subscription status switcher */}
                                        <div className="col-md-4">
                                            <label className="premium-label">Subscription Status</label>
                                            <select className="form-select premium-input" name="subscriptionStatus" value={schoolForm.subscriptionStatus} onChange={handleSchoolChange}>
                                                <option value="active">Active (Access allowed)</option>
                                                <option value="suspended">Suspended (Access blocked)</option>
                                            </select>
                                        </div>

                                        {/* Module permissions features */}
                                        <div className="col-12 mt-2 pt-2 border-top">
                                            <label className="premium-label mb-2">Module Access Permissions</label>
                                            <div className="form-check">
                                                <input 
                                                    type="checkbox" 
                                                    className="form-check-input" 
                                                    id="featureQuestionPaper" 
                                                    name="featureQuestionPaper" 
                                                    checked={schoolForm.featureQuestionPaper} 
                                                    onChange={handleSchoolChange} 
                                                />
                                                <label className="form-check-label fw-semibold text-dark" htmlFor="featureQuestionPaper">
                                                    Enable Question Paper Module access
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="d-flex gap-3 mt-4 pt-3 border-top justify-content-end">
                                        {isEditingSchool && (
                                            <button type="button" className="btn btn-outline-secondary" onClick={handleResetSchoolForm}>
                                                Cancel Edit
                                            </button>
                                        )}
                                        <button type="button" className={`btn btn-premium ${isEditingSchool ? 'btn-premium-primary' : 'btn-premium-success'}`} onClick={handleSaveOrUpdateSchool}>
                                            <i className={`fas ${isEditingSchool ? 'fa-edit' : 'fa-plus-circle'} me-1`}></i>
                                            {isEditingSchool ? 'Update School Profile' : 'Provision School Profile'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <h4 className="fw-bold text-dark mb-3">Active Directories</h4>
                    <div className="row g-4">
                        {allMasters.map((school) => {
                            const isCurrentContext = localStorage.getItem('schoolId') === school._id;
                            return (
                                <div key={school._id} className="col-md-6 col-lg-4">
                                    <div className={`premium-card h-100 ${isCurrentContext ? 'border-primary' : ''}`} style={isCurrentContext ? { borderTop: '4px solid #3b82f6' } : {}}>
                                        <div className="card-body p-4 d-flex flex-column justify-content-between">
                                            <div>
                                                {/* Header Row with Logo */}
                                                <div className="d-flex align-items-center gap-3 mb-3">
                                                    <img 
                                                        src={school.logoUrl || school.imageUrl || 'default.jpg'} 
                                                        alt="logo" 
                                                        className="rounded-circle border" 
                                                        style={{ width: '48px', height: '48px', objectFit: 'cover', minWidth: '48px' }}
                                                        onError={(e) => { e.target.src = 'https://placehold.co/100x100?text=School'; }}
                                                    />
                                                    <div className="overflow-hidden">
                                                        <h5 className="fw-bold mb-0 text-truncate" style={{ color: '#1e293b' }}>
                                                            {school.name}
                                                        </h5>
                                                        <span className="small text-muted font-monospace">{school.slug}</span>
                                                    </div>
                                                </div>

                                                <div className="d-flex justify-content-between align-items-center mb-3">
                                                    <span className={`badge ${school.subscription?.status === 'active' ? 'bg-success' : 'bg-danger'}`}>
                                                        {school.subscription?.status === 'active' ? 'Active' : 'Suspended'}
                                                    </span>
                                                    <span className="badge bg-secondary text-uppercase">{school.subscription?.plan || 'basic'} Plan</span>
                                                    {isCurrentContext && (
                                                        <span className="badge bg-primary"><i className="fas fa-eye me-1"></i>Current View</span>
                                                    )}
                                                </div>

                                                {/* Meta Info */}
                                                <div className="small text-muted space-y-2 mb-4 border-top pt-2">
                                                    <p className="mb-1 text-truncate"><i className="fas fa-envelope me-2 text-primary"></i>{school.email}</p>
                                                    <p className="mb-1"><i className="fas fa-phone me-2 text-success"></i>{school.phoneNo}</p>
                                                    <p className="mb-1 text-truncate"><i className="fas fa-map-marker-alt me-2 text-danger"></i>{school.address || 'No address specified'}</p>
                                                    <p className="mb-1 font-monospace" style={{ fontSize: '0.75rem' }}><i className="fas fa-fingerprint me-2"></i>ID: {school._id}</p>
                                                    <p className="mb-0 mt-2 small">Theme preset: <span className="badge bg-info">{school.theme?.themeName || 'light'}</span></p>
                                                    <p className="mb-0 mt-1 small">Question Module: <span className="badge bg-dark">{school.features?.questionPaperModule ? 'Enabled' : 'Disabled'}</span></p>
                                                </div>
                                            </div>

                                            <div className="d-flex flex-column gap-2 pt-3 border-top">
                                                <button 
                                                    className={`btn btn-sm w-100 fw-bold ${isCurrentContext ? 'btn-outline-primary disabled' : 'btn-primary'}`} 
                                                    onClick={() => {
                                                        localStorage.setItem('schoolSlug', school.slug || '');
                                                        localStorage.setItem('schoolId', school._id || '');
                                                        localStorage.setItem('schoolName', school.name || '');
                                                        localStorage.setItem('schoolLogo', school.logoUrl || school.imageUrl || '');
                                                        localStorage.setItem('theme', school.theme?.themeName || 'light');
                                                        document.documentElement.setAttribute('data-theme', school.theme?.themeName || 'light');
                                                        alert(`🔄 Context Switched to '${school.name}'! Redirecting...`);
                                                        window.location.href = '/';
                                                    }}
                                                    disabled={isCurrentContext}
                                                >
                                                    <i className="fas fa-sign-in-alt me-1"></i>Switch to School View
                                                </button>
                                                <div className="d-flex gap-2">
                                                    <button className="btn btn-sm btn-outline-primary w-100" onClick={() => handleEditSchoolClick(school)}>
                                                        Edit Profile
                                                    </button>
                                                    {school.status !== 'active' && (
                                                        <button className="btn btn-sm btn-outline-success w-100" onClick={() => handleSetInUse(school._id)}>
                                                            Set Active
                                                        </button>
                                                    )}
                                                    <button className="btn btn-sm btn-outline-danger w-100" onClick={() => handleDeleteSchool(school._id)}>
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* TAB CONTENT: REGISTRATION FIELDS */}
            {activeTab === 'fields' && (
                <div className="ov-animate-fade">

                    {/* CREATE OR EDIT FIELD FORM CARD */}
                    <div className="row g-4 mb-5">
                        <div className="col-12">
                            <div className="premium-card">
                                <div className={`card-header-gradient d-flex align-items-center justify-content-between ${isEditingField ? 'bg-warning text-dark' : 'bg-success text-white'}`}>
                                    <span className="fw-bold">
                                        <i className={`fas ${isEditingField ? 'fa-edit' : 'fa-plus-circle'} me-2`}></i>
                                        {isEditingField ? `Edit Field Definition: ${fieldForm.fieldName}` : 'Create New Input Field Definition'}
                                    </span>
                                    {isEditingField && (
                                        <button className="btn btn-sm btn-outline-dark" onClick={handleResetFieldForm}>
                                            <i className="fas fa-times me-1"></i>Cancel Edit
                                        </button>
                                    )}
                                </div>

                                <form onSubmit={handleSaveOrUpdateField} className="card-body p-4">
                                    <div className="row g-3">
                                        {/* Row 1: Keys */}
                                        <div className="col-md-2">
                                            <label className="premium-label">Sequence (SNo)</label>
                                            <input type="number" className="form-control premium-input" name="sno" value={fieldForm.sno} onChange={handleFieldChange} placeholder="e.g. 10" required />
                                        </div>
                                        <div className="col-md-5">
                                            <label className="premium-label">Field Key (Unique Identifier)</label>
                                            <input 
                                                type="text" 
                                                className="form-control premium-input bg-light" 
                                                name="fieldKey" 
                                                value={fieldForm.fieldKey} 
                                                onChange={handleFieldChange} 
                                                placeholder="e.g. adharCard" 
                                                disabled={isEditingField} // Immutable on edit
                                                required 
                                            />
                                            {isEditingField && <span className="small text-muted font-monospace">Unique ID is immutable</span>}
                                        </div>
                                        <div className="col-md-5">
                                            <label className="premium-label">Display Field Label</label>
                                            <input type="text" className="form-control premium-input" name="fieldName" value={fieldForm.fieldName} onChange={handleFieldChange} placeholder="e.g. Aadhar Card Number" required />
                                        </div>

                                        {/* Row 2: Types */}
                                        <div className="col-md-4">
                                            <label className="premium-label">Input Type</label>
                                            <select className="form-select premium-input" name="fieldType" value={fieldForm.fieldType} onChange={handleFieldChange}>
                                                <option value="text">Text Box</option>
                                                <option value="number">Numeric Box</option>
                                                <option value="date">Date Picker</option>
                                                <option value="select">Dropdown Menu (Select)</option>
                                                <option value="textarea">Multi-line Text Area</option>
                                                <option value="email">Email input</option>
                                                <option value="phone">Phone number</option>
                                            </select>
                                        </div>

                                        <div className="col-md-8">
                                            <label className="premium-label">Dropdown Menu Options (Comma separated - only for Select type)</label>
                                            <input 
                                                type="text" 
                                                className="form-control premium-input" 
                                                name="optionsRaw" 
                                                value={fieldForm.optionsRaw} 
                                                onChange={handleFieldChange} 
                                                placeholder="Option A, Option B, Option C" 
                                                disabled={fieldForm.fieldType !== 'select'} 
                                            />
                                        </div>

                                        {/* Row 3: Regex validation */}
                                        <div className="col-md-6">
                                            <label className="premium-label">Validation Regex Formula</label>
                                            <div className="input-group">
                                                <input type="text" className="form-control premium-input" style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }} name="validationPattern" value={fieldForm.validationPattern} onChange={handleFieldChange} placeholder="e.g. ^[0-9]{12}$ (12 digit Aadhar)" />
                                                <button type="button" className="btn btn-outline-primary" style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }} onClick={() => {
                                                    const check = validateRegexSyntax(fieldForm.validationPattern);
                                                    if (!fieldForm.validationPattern) {
                                                        alert("ℹ️ Please enter a regex formula pattern first.");
                                                    } else if (check.isValidSyntax) {
                                                        alert("✅ Valid Regex Syntax! The formula is compiled successfully.");
                                                    } else {
                                                        alert(`❌ Invalid Regex Syntax!\nError: ${check.error}`);
                                                    }
                                                }}>Check Syntax</button>
                                            </div>
                                            {checkRegexResult.message && (
                                                <div className={`small fw-bold mt-1 ${checkRegexResult.isValidSyntax ? 'text-success' : 'text-danger'}`}>
                                                    {checkRegexResult.message}
                                                </div>
                                            )}
                                        </div>

                                        <div className="col-md-6">
                                            <label className="premium-label">Validation Error Message</label>
                                            <input type="text" className="form-control premium-input" name="validationMessage" value={fieldForm.validationMessage} onChange={handleFieldChange} placeholder="e.g. Invalid Aadhar number format." />
                                        </div>

                                        {/* Regex Testing Sandbox */}
                                        {fieldForm.validationPattern && checkRegexResult.isValidSyntax && (
                                            <div className="col-12 p-3 bg-light rounded border border-info mb-2">
                                                <h6 className="fw-bold text-info mb-2"><i className="fas fa-flask me-1"></i>Regex Syntax & Tester Sandbox</h6>
                                                <div className="row g-2 align-items-center">
                                                    <div className="col-md-8">
                                                        <input 
                                                            type="text" 
                                                            className="form-control premium-input" 
                                                            value={regexTestString} 
                                                            onChange={(e) => {
                                                                setRegexTestString(e.target.value);
                                                                setRegexTestResult({ tested: false, isValidSyntax: true, isMatch: false, error: '' });
                                                            }} 
                                                            placeholder="Type test string here (e.g. input text to validate)" 
                                                        />
                                                    </div>
                                                    <div className="col-md-4">
                                                        <button type="button" className="btn btn-outline-info w-100 fw-bold" onClick={handleTestRegex}>
                                                            Check Regex Match
                                                        </button>
                                                    </div>
                                                </div>
                                                {regexTestResult.tested && (
                                                    <div className={`mt-2 fw-bold small ${regexTestResult.isMatch ? 'text-success' : 'text-danger'}`}>
                                                        {regexTestResult.isMatch ? '✅ MATCH SUCCESSFUL! The string fits the pattern.' : '❌ MATCH FAILED! The string does not fit the pattern.'}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Row 4: Dual Listbox / Multipicklist for Schools */}
                                        <div className="col-12">
                                            <div className="d-flex align-items-center justify-content-between mb-2">
                                                <label className="premium-label mb-0">School Tenant Scope & Visibility</label>
                                                <div className="form-check form-switch">
                                                    <input 
                                                        type="checkbox" 
                                                        className="form-check-input" 
                                                        id="applyToAll" 
                                                        name="applyToAll" 
                                                        checked={fieldForm.applyToAll} 
                                                        onChange={(e) => setFieldForm(prev => ({ ...prev, applyToAll: e.target.checked }))} 
                                                    />
                                                    <label className="form-check-label fw-bold text-primary" htmlFor="applyToAll">Global (Visible to all schools)</label>
                                                </div>
                                            </div>

                                            {!fieldForm.applyToAll && (
                                                <div className="row mt-2 g-2">
                                                    {/* Available Schools (Left Column) */}
                                                    <div className="col-md-5">
                                                        <div className="border rounded bg-white p-2">
                                                            <div className="fw-bold small text-muted border-bottom pb-1 mb-2">Available Schools</div>
                                                            <div className="overflow-auto" style={{ maxHeight: '150px' }}>
                                                                {availableSchools.map(school => (
                                                                    <div 
                                                                        key={school._id} 
                                                                        onClick={() => handleSelectSchool(school._id)} 
                                                                        className="p-1 px-2 mb-1 rounded bg-light hover-select"
                                                                        style={{ cursor: 'pointer', fontSize: '0.85rem' }}
                                                                    >
                                                                        <i className="fas fa-plus text-success me-2"></i>{school.name}
                                                                    </div>
                                                                ))}
                                                                {availableSchools.length === 0 && (
                                                                    <div className="small text-muted text-center p-3">All schools selected.</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Middle indicator column */}
                                                    <div className="col-md-2 d-flex flex-column align-items-center justify-content-center text-muted">
                                                        <i className="fas fa-exchange-alt fa-lg d-none d-md-block"></i>
                                                    </div>

                                                    {/* Selected Schools (Right Column) */}
                                                    <div className="col-md-5">
                                                        <div className="border rounded bg-white p-2" style={{ borderLeft: '3px solid #10b981' }}>
                                                            <div className="fw-bold small text-success border-bottom pb-1 mb-2">Selected Schools Scope</div>
                                                            <div className="overflow-auto" style={{ maxHeight: '150px' }}>
                                                                {fieldForm.applicableSchools.map(schoolId => {
                                                                    const school = allMasters.find(s => s._id === schoolId);
                                                                    return (
                                                                        <div 
                                                                            key={schoolId} 
                                                                            onClick={() => handleDeselectSchool(schoolId)} 
                                                                            className="p-1 px-2 mb-1 rounded bg-success-light hover-select"
                                                                            style={{ cursor: 'pointer', fontSize: '0.85rem' }}
                                                                        >
                                                                            <i className="fas fa-times text-danger me-2"></i>{school ? school.name : schoolId}
                                                                        </div>
                                                                    );
                                                                })}
                                                                {fieldForm.applicableSchools.length === 0 && (
                                                                    <div className="small text-muted text-center p-3">Select schools from Left.</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Row 5: Flags Checkboxes */}
                                        <div className="col-md-12 d-flex align-items-center gap-4 pt-2">
                                            <div className="form-check">
                                                <input type="checkbox" className="form-check-input" id="required" name="required" checked={fieldForm.required} onChange={handleFieldChange} />
                                                <label className="form-check-label fw-semibold" htmlFor="required">Required input (Cannot be left empty)</label>
                                            </div>
                                            <div className="form-check">
                                                <input type="checkbox" className="form-check-input" id="isUnique" name="isUnique" checked={fieldForm.isUnique} onChange={handleFieldChange} />
                                                <label className="form-check-label fw-semibold" htmlFor="isUnique">Enforce unique values (No duplicates within the school)</label>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="d-flex mt-4 pt-3 border-top justify-content-end gap-2">
                                        {isEditingField && (
                                            <button type="button" className="btn btn-outline-secondary" onClick={handleResetFieldForm}>
                                                Cancel Edit
                                            </button>
                                        )}
                                        <button type="submit" className={`btn btn-premium ${isEditingField ? 'btn-premium-primary' : 'btn-premium-success'}`} disabled={fieldForm.validationPattern && !checkRegexResult.isValidSyntax}>
                                            <i className={`fas ${isEditingField ? 'fa-edit' : 'fa-save'} me-1`}></i>
                                            {isEditingField ? 'Update Field Definition' : 'Register Field Definition'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>

                    {/* TABLE CATALOG OF DYNAMIC FIELDS */}
                    <h4 className="fw-bold text-dark mb-3">Field Definitions Catalog</h4>
                    <div className="premium-card p-0 mb-4 overflow-hidden">
                        <div className="table-responsive">
                            <table className="table table-hover table-striped mb-0 align-middle">
                                <thead className="table-dark">
                                    <tr>
                                        <th style={{ width: '60px' }}>SNo</th>
                                        <th>Field Label</th>
                                        <th>Machine Key</th>
                                        <th>Field Type</th>
                                        <th>School Scope</th>
                                        <th className="text-center">Required</th>
                                        <th className="text-center">Unique</th>
                                        <th>Validation Formula</th>
                                        <th className="text-center">Status</th>
                                        <th className="text-center" style={{ width: '180px' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {fieldDefs.map((field) => {
                                        let scopeText = "All Schools";
                                        if (field.applicableSchools && field.applicableSchools.length > 0) {
                                            const names = field.applicableSchools.map(id => {
                                                const match = allMasters.find(s => s._id === id);
                                                return match ? match.name : id;
                                            });
                                            scopeText = names.join(', ');
                                        }

                                        return (
                                            <tr key={field._id}>
                                                <td className="fw-bold text-center">{field.sno}</td>
                                                <td><strong>{field.fieldName}</strong></td>
                                                <td><code>{field.fieldKey}</code></td>
                                                <td><span className="badge bg-secondary text-uppercase">{field.fieldType}</span></td>
                                                <td className="small" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{scopeText}</td>
                                                <td className="text-center">{field.required ? <i className="fas fa-check-circle text-success"></i> : <i className="fas fa-times text-muted"></i>}</td>
                                                <td className="text-center">{field.isUnique ? <i className="fas fa-check-circle text-info"></i> : <i className="fas fa-times text-muted"></i>}</td>
                                                <td className="small">
                                                    {field.validationPattern ? (
                                                        <div>
                                                            <code>{field.validationPattern}</code>
                                                            <div className="text-muted small" style={{ fontSize: '0.75rem' }}>{field.validationMessage}</div>
                                                        </div>
                                                    ) : <span className="text-muted">None</span>}
                                                </td>
                                                <td className="text-center">
                                                    {field.isActive ? (
                                                        <span className="badge bg-success">Active</span>
                                                    ) : (
                                                        <span className="badge bg-danger">Disabled</span>
                                                    )}
                                                </td>
                                                <td className="text-center">
                                                    <div className="d-flex gap-2 justify-content-center">
                                                        <button 
                                                            className="btn btn-xs btn-outline-primary"
                                                            onClick={() => handleEditClick(field)}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button 
                                                            className={`btn btn-xs ${field.isActive ? 'btn-outline-warning' : 'btn-outline-success'}`}
                                                            onClick={() => handleToggleFieldStatus(field._id, field.isActive)}
                                                        >
                                                            {field.isActive ? 'Disable' : 'Enable'}
                                                        </button>
                                                        <button 
                                                            className="btn btn-xs btn-outline-danger"
                                                            onClick={() => handleDeleteField(field._id)}
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {fieldDefs.length === 0 && (
                                        <tr>
                                            <td colSpan="10" className="text-center text-muted p-4">No custom field definitions created yet.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: USER ACCOUNTS */}
            {activeTab === 'users' && (
                <div className="ov-animate-fade">
                    <div className="row g-4 mb-4">
                        <div className="col-md-5">
                            <div className="premium-card p-4 shadow-sm" style={{ borderRadius: '12px', border: '1px solid rgba(226, 232, 240, 0.4)' }}>
                                <h4 className="fw-bold mb-4 text-primary d-flex align-items-center justify-content-between">
                                    <span>
                                        <i className={`fas ${isEditingUser ? 'fa-edit' : 'fa-user-plus'} me-2`}></i>
                                        {isEditingUser ? 'Edit User Account' : 'Create New User Account'}
                                    </span>
                                    {isEditingUser && (
                                        <span className="badge bg-warning text-dark" style={{ fontSize: '0.75rem' }}>Edit Mode</span>
                                    )}
                                </h4>
                                <form onSubmit={handleCreateUser}>
                                    <div className="mb-3 text-start">
                                        <label className="form-label fw-semibold text-muted">Select School Tenant *</label>
                                        <select 
                                            className="form-select"
                                            value={selectedSchoolForUsers}
                                            onChange={handleSchoolSelectForUsers}
                                            required
                                            disabled={isEditingUser}
                                        >
                                            <option value="">-- Choose School --</option>
                                            {allMasters.map(school => (
                                                <option key={school._id} value={school._id}>
                                                    {school.name} ({school.slug})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="mb-3 text-start">
                                        <label className="form-label fw-semibold text-muted">Username *</label>
                                        <input 
                                            type="text"
                                            className="form-control"
                                            placeholder="Enter username"
                                            value={userForm.username}
                                            onChange={e => setUserForm(prev => ({ ...prev, username: e.target.value }))}
                                            required
                                        />
                                    </div>
                                    <div className="mb-3 text-start">
                                        <label className="form-label fw-semibold text-muted">Password *</label>
                                        <div className="input-group">
                                            <input 
                                                type={showFormPassword ? "text" : "password"}
                                                className="form-control"
                                                placeholder="Enter password"
                                                value={userForm.password}
                                                onChange={e => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                                                required
                                            />
                                            <button 
                                                type="button" 
                                                className="btn btn-outline-secondary"
                                                onClick={() => setShowFormPassword(!showFormPassword)}
                                                style={{ borderTopRightRadius: '8px', borderBottomRightRadius: '8px' }}
                                            >
                                                <i className={`fas ${showFormPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mb-3 text-start">
                                        <label className="form-label fw-semibold text-muted">Role *</label>
                                        <select 
                                            className="form-select text-capitalize"
                                            value={userForm.role}
                                            onChange={e => setUserForm(prev => ({ ...prev, role: e.target.value }))}
                                            required
                                        >
                                            <option value="viewer">Viewer</option>
                                            <option value="qp-editor">QP-Editor</option>
                                            <option value="admin">Admin</option>
                                            <option value="payment-manager">Payment Manager</option>
                                        </select>
                                    </div>
                                    <div className="d-flex flex-column gap-2 mt-4">
                                        <button type="submit" className="btn btn-save w-100 fw-bold py-2" style={{ borderRadius: '8px' }}>
                                            <i className="fas fa-save me-2"></i>
                                            {isEditingUser ? 'Save Changes' : 'Create User Account'}
                                        </button>
                                        {isEditingUser && (
                                            <button 
                                                type="button" 
                                                className="btn btn-light w-100 fw-bold py-2" 
                                                style={{ borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                                onClick={handleResetUserForm}
                                            >
                                                Cancel Edit
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </div>
                        </div>

                        <div className="col-md-7">
                            <div className="premium-card p-4 shadow-sm" style={{ borderRadius: '12px', border: '1px solid rgba(226, 232, 240, 0.4)', height: '100%', minHeight: '400px' }}>
                                <h4 className="fw-bold mb-4 text-success d-flex align-items-center">
                                    <i className="fas fa-users me-2"></i>Current Users
                                </h4>
                                
                                <div className="mb-3 text-start">
                                    <label className="form-label fw-semibold text-muted">Filter by School Context</label>
                                    <select 
                                        className="form-select border-success"
                                        value={selectedSchoolForUsers}
                                        onChange={handleSchoolSelectForUsers}
                                    >
                                        <option value="">-- Choose School --</option>
                                        {allMasters.map(school => (
                                            <option key={school._id} value={school._id}>
                                                {school.name} ({school.slug})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="table-responsive" style={{ maxHeight: '380px', overflowY: 'auto' }}>
                                    <table className="table table-hover align-middle">
                                        <thead className="table-light sticky-top">
                                            <tr>
                                                <th className="text-start">Username</th>
                                                <th className="text-start">Role</th>
                                                <th className="text-start">Password</th>
                                                <th className="text-center">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {usersList.map(user => (
                                                <tr key={user._id}>
                                                    <td className="text-start fw-semibold">{user.username}</td>
                                                    <td className="text-start">
                                                        <span className={`badge ${
                                                            user.role === 'admin' ? 'bg-danger' :
                                                            user.role === 'qp-editor' ? 'bg-warning text-dark' :
                                                            user.role === 'payment-manager' ? 'bg-primary' :
                                                            'bg-secondary'
                                                        } text-uppercase`}>
                                                            {user.role === 'admin' ? 'Admin' :
                                                             user.role === 'qp-editor' ? 'QP-Editor' :
                                                             user.role === 'payment-manager' ? 'Payment Manager' :
                                                             user.role === 'viewer' ? 'Viewer' : user.role || 'Viewer'}
                                                        </span>
                                                    </td>
                                                    <td className="text-start">
                                                        <div className="d-flex align-items-center gap-2">
                                                            <span className="font-monospace" style={{ fontSize: '0.85rem' }}>
                                                                {visiblePasswords[user._id] ? user.password : '••••••••'}
                                                            </span>
                                                            <button 
                                                                type="button"
                                                                className="btn btn-xs btn-outline-secondary border-0 p-0"
                                                                onClick={() => togglePasswordVisibility(user._id)}
                                                                style={{ background: 'none' }}
                                                            >
                                                                <i className={`fas ${visiblePasswords[user._id] ? 'fa-eye-slash' : 'fa-eye'}`} style={{ fontSize: '0.85rem' }}></i>
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="text-center">
                                                        <div className="d-flex gap-2 justify-content-center">
                                                            <button 
                                                                className="btn btn-xs btn-outline-primary"
                                                                onClick={() => handleEditUserClick(user)}
                                                            >
                                                                Edit
                                                            </button>
                                                            <button 
                                                                className="btn btn-xs btn-outline-info"
                                                                onClick={() => handleImpersonateUser(user)}
                                                            >
                                                                Login As
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {usersList.length === 0 && (
                                                <tr>
                                                    <td colSpan="4" className="text-center text-muted py-4">
                                                        No users found for this school context.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
