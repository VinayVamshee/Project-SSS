import React, { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { jwtDecode } from "jwt-decode";
import { login as apiLogin, register as apiRegister, getMasters } from '../../API';
import './Navigation.css';


export default function Navigation() {
   const themes = [
    "light",
    "Dark",
    "Liquid Glass",
    "Crystal Glass",
    "Neo Glass",
    "Aurora Glass",
    "Moonlight Glass",
    "Ocean",
    "Deep Ocean",
    "Earth",
    "Sunset Peach",
    "Mint Cream",
    "Lavender Day",
    "Lemon Zest",
    "Charcoal Cyan",
    "Dracula Midnight",
    "Cherry Red",
    "Electric Blue",
    "Tropical Green",
    "Ultra Violet",
    "Emerald Pro",
    "Royal Indigo",
    "Crimson Wine"
];

    const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [userType, setUserType] = useState('viewer');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [latestMaster, setLatestMaster] = useState({});
    const [isCollapsed, setIsCollapsed] = useState(false);
    const isDev = localStorage.getItem("isDev") === "true";
    const userRole = localStorage.getItem("userRole") || localStorage.getItem("userType") || "viewer";

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("theme", theme);
    }, [theme]);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            try {
                const decoded = jwtDecode(token);
                setLoggedInUser(decoded.username);
            } catch (e) {
                console.error("Invalid token", e);
                setLoggedInUser("");
            }
        }
    }, []);

    const toggleSidebar = () => {
        setIsCollapsed(prev => !prev);
    };

    const [loggedInUser, setLoggedInUser] = useState(localStorage.getItem("username") || "");

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await apiLogin({ username, password });
            const token = res.data.token;
            const school = res.data.school;

            localStorage.setItem('token', token);

            const decoded = jwtDecode(token);
            localStorage.setItem('userType', decoded.role || 'viewer'); // Keep legacy alias
            localStorage.setItem('userRole', decoded.role || 'viewer');
            localStorage.setItem('isDev', decoded.isDev ? 'true' : 'false');
            localStorage.setItem('username', decoded.username);

            // Store school context for multi-tenant API calls
            if (school) {
                localStorage.setItem('schoolSlug', school.slug || '');
                localStorage.setItem('schoolId', school._id || decoded.schoolId || '');
                localStorage.setItem('schoolName', school.name || '');
                localStorage.setItem('schoolLogo', school.logoUrl || school.imageUrl || '');
                localStorage.setItem('theme', school.theme?.themeName || 'light');
                document.documentElement.setAttribute('data-theme', school.theme?.themeName || 'light');
            }

            alert('Login Successful');
            window.location.href = '/';
        } catch (err) {
            setError('Invalid username or password');
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            const res = await apiRegister({ username, password, type: userType });
            setMessage(res.data.message);
            setError('');
        } catch (err) {
            setMessage('');
            setError(err.response?.data?.message || 'Registration failed');
        }
    };

    useEffect(() => {
        getMasters()
            .then(res => setLatestMaster(res.data))
            .catch(err => console.error('Error fetching all masters:', err.message));
    }, []);

    return (
        <>
            <div className={`Navigation ${isCollapsed ? 'collapsed' : ''}`}>
                <button className="toggle-btn btn" onClick={toggleSidebar}>
                    <i className={`fa-solid ${isCollapsed ? 'fa-angles-right' : 'fa-angles-left'}`}></i>
                </button>

                <div className="logo">
                    <img src={localStorage.getItem('schoolLogo') || latestMaster.imageUrl} alt="..." />
                    {!isCollapsed && (localStorage.getItem('schoolName') || latestMaster.name)}
                </div>


                <Link to='/AddNewStudent' className="AddStudent">
                    <i className="fa-solid fa-address-book fa-xl"></i>
                    {!isCollapsed && " Register Student"}
                </Link>

                <div className="LinkToPages">
                    <NavLink to="/" className={({ isActive }) => isActive ? "Link active" : "Link"}>
                        <i className="fa-solid fa-chart-simple fa-lg"></i>
                        {!isCollapsed && " Overview"}
                    </NavLink>
                    <NavLink to="/Students" className={({ isActive }) => isActive ? "Link active" : "Link"}>
                        <i className="fa-solid fa-user fa-lg"></i>
                        {!isCollapsed && " Students"}
                    </NavLink>
                    {(isDev || userRole === "admin") && (
                        <NavLink to="/Classes" className={({ isActive }) => isActive ? "Link active" : "Link"}>
                            <i className="fa-solid fa-school fa-lg"></i>
                            {!isCollapsed && " Classes"}
                        </NavLink>
                    )}
                    <NavLink to="/Results" className={({ isActive }) => isActive ? "Link active" : "Link"}>
                        <i className="fa-solid fa-file fa-lg"></i>
                        {!isCollapsed && " Results"}
                    </NavLink>
                    <NavLink to="/AssessmentAnalytics" className={({ isActive }) => isActive ? "Link active" : "Link"}>
                        <i className="fa-solid fa-chart-line fa-lg"></i>
                        {!isCollapsed && " Assessment Analytics"}
                    </NavLink>
                    <NavLink to="/Payments" className={({ isActive }) => isActive ? "Link active" : "Link"}>
                        <i className="fa-solid fa-money-check-dollar fa-lg"></i>
                        {!isCollapsed && " Payments"}
                    </NavLink>
                    <NavLink to="/QuestionPaper" className={({ isActive }) => isActive ? "Link active" : "Link"}>
                        <i className="fa-solid fa-clipboard-question fa-lg"></i>
                        {!isCollapsed && " QuestionPaper"}
                    </NavLink>
                     <NavLink to="/QuestionPaperV2" className={({ isActive }) => isActive ? "Link active" : "Link"}>
                        <i className="fa-solid fa-clipboard-question fa-lg"></i>
                        {!isCollapsed && " QuestionPaper V2"}
                    </NavLink>
                    <NavLink to="/HRFinance" className={({ isActive }) => isActive ? "Link active" : "Link"}>
                        <i className="fa-solid fa-people-roof fa-lg"></i>
                        {!isCollapsed && " HR & Finance"}
                    </NavLink>
                    <NavLink to="/Settings" className={({ isActive }) => isActive ? "Link active" : "Link"}>
                        <i className="fa-solid fa-gears fa-lg"></i>
                        {!isCollapsed && " Settings"}
                    </NavLink>
                    {localStorage.getItem("isDev") === 'true' && (
                        <NavLink to="/Developer" className={({ isActive }) => isActive ? "Link active" : "Link"}>
                            <i className="fa-solid fa-lock fa-lg"></i>
                            {!isCollapsed && " Developer"}
                        </NavLink>
                    )}

                </div>

                <div className="theme-selector mt-5">
                    {!isCollapsed && (
                        <>
                            <label htmlFor="theme-select">Select Theme:</label>
                            <select id="theme-select" value={theme} onChange={(e) => setTheme(e.target.value)}>
                                {themes.map((t) => (
                                    <option key={t} value={t}>
                                        {t.charAt(0).toUpperCase() + t.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </>
                    )}
                </div>

                {!isCollapsed && (
                    <div>
                        <div className="d-flex mt-3">
                            {localStorage.getItem("token") ? (
                                <>
                                    {/* Show Register only if admin */}
                                    {(isDev || userRole === "admin") && (
                                         <button
                                             type="button"
                                             className="btn btn-save mx-2"
                                             data-bs-toggle="modal"
                                             data-bs-target="#RegisterModal"
                                         >
                                             Register
                                         </button>
                                     )}

                                    {/* Always show logout if logged in */}
                                    <button
                                        className="btn btn-danger btn-sm mx-2"
                                        onClick={() => {
                                            const isImpersonating = localStorage.getItem("isImpersonating") === "true";
                                            if (isImpersonating) {
                                                localStorage.setItem("isDev", "true");
                                                localStorage.setItem("userRole", localStorage.getItem("originalUserRole") || "");
                                                localStorage.setItem("userType", localStorage.getItem("originalUserType") || "");
                                                localStorage.removeItem("isImpersonating");
                                                localStorage.removeItem("impersonatedUsername");
                                                localStorage.removeItem("impersonatedRole");
                                                localStorage.removeItem("originalIsDev");
                                                localStorage.removeItem("originalUserRole");
                                                localStorage.removeItem("originalUserType");
                                                alert("🔄 Impersonation ended. Returned to Developer Mode.");
                                                window.location.href = "/Developer";
                                            } else {
                                                localStorage.removeItem("token");
                                                localStorage.removeItem("userType");
                                                localStorage.removeItem("username");
                                                window.location.href = "/login";
                                            }
                                        }}
                                    >
                                        Logout
                                    </button>
                                </>
                            ) : (
                                // Show login if not logged in
                                <button
                                    type="button"
                                    className="btn btn-save mx-2"
                                    data-bs-toggle="modal"
                                    data-bs-target="#LoginModal"
                                >
                                    Login
                                </button>
                            )}
                        </div>
                        <div className="d-flex justify-content-center btn btn-info mt-2"> {loggedInUser}</div>
                    </div>
                )}

            </div>

            {/* Register Modal */}
            <div className="modal" id="RegisterModal" tabIndex="-1" aria-labelledby="RegisterModalLabel" aria-hidden="true">
                <div className="modal-dialog">
                    <div className="modal-content">
                        <form onSubmit={handleRegister}>
                            <div className="modal-header">
                                <h5 className="modal-title">Register</h5>
                            </div>
                            <div className="modal-body">
                                {message && <div className="text-success mb-2">{message}</div>}
                                {error && <div className="text-danger mb-2">{error}</div>}

                                <input
                                    type="text"
                                    placeholder="Username"
                                    className="form-control mb-2"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    required
                                />

                                <input
                                    type="password"
                                    placeholder="Password"
                                    className="form-control mb-2"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                />

                                <select
                                    className="form-select"
                                    value={userType}
                                    onChange={e => setUserType(e.target.value)}
                                >
                                    <option value="viewer">Viewer</option>
                                    <option value="qp-editor">QuestionPaper Editor</option>
                                    <option value="payment">Payments Handler</option>
                                </select>
                            </div>

                            <div className="modal-footer">
                                <button type="submit" className="btn btn-success">Register</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Login Modal */}
            <div className="modal fade" id="LoginModal" tabIndex="-1" aria-labelledby="LoginModalLabel" aria-hidden="true">
                <div className="modal-dialog">
                    <div className="modal-content">
                        <form onSubmit={handleLogin}>
                            <div className="modal-header d-flex flex-column align-items-center border-bottom-0 pb-0">
                                {localStorage.getItem('schoolLogo') && (
                                    <img src={localStorage.getItem('schoolLogo')} alt="School Logo" style={{ maxHeight: '60px', marginBottom: '10px', objectFit: 'contain' }} />
                                )}
                                <h5 className="modal-title fw-bold text-center">
                                    {localStorage.getItem('schoolName') || 'School Login'}
                                </h5>
                            </div>
                            <div className="modal-body">

                                {error && <div className="text-danger">{error}</div>}
                                <input type="text" placeholder="Username" className="form-control mb-2"
                                    value={username} onChange={e => setUsername(e.target.value)} required />
                                <input type="password" placeholder="Password" className="form-control"
                                    value={password} onChange={e => setPassword(e.target.value)} required />
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-primary" type="submit">Login</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
}
