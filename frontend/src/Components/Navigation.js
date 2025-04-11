import React, { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import vts from './Images/Bada school logo.png';
import axios from 'axios';

export default function Navigation() {
    const themes = ["light", "dark", "midnight-red", "Ocean", "Deep Ocean", "Earth", "Rose Blush",];
    const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("theme", theme);
    }, [theme]);

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('https://sss-server-eosin.vercel.app/login', { username, password });
            localStorage.setItem('token', res.data.token);
            alert('Login Successful')
            window.location.href = '/';
        } catch (err) {
            setError('Invalid username or password');
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('https://sss-server-eosin.vercel.app/register', { username, password });
            setMessage(res.data.message);
            setError('');
        } catch (err) {
            setMessage('');
            setError(err.response?.data?.message || 'Registration failed');
        }
    };

    return (
        <>
            <div className="Navigation">
                <div className="logo"><img src={vts} alt='...' />Vamshee Techno School</div>
                <Link to='AddNewStudent' className="AddStudent">
                    <i className="fa-solid fa-address-book fa-xl"></i> Register Student
                </Link>
                <div className="LinkToPages">
                    <NavLink to="/" className={({ isActive }) => isActive ? "Link active" : "Link"}>
                        <i className="fa-solid fa-chart-simple fa-lg"></i> OverView
                    </NavLink>
                    <NavLink to="/Students" className={({ isActive }) => isActive ? "Link active" : "Link"}>
                        <i className="fa-solid fa-user fa-lg"></i> Students
                    </NavLink>
                    <NavLink to="/Classes" className={({ isActive }) => isActive ? "Link active" : "Link"}>
                        <i className="fa-solid fa-school fa-lg"></i> Classes
                    </NavLink>
                    <NavLink to="/Results" className={({ isActive }) => isActive ? "Link active" : "Link"}>
                        <i className="fa-solid fa-file fa-lg"></i> Results
                    </NavLink>
                    <NavLink to="/Payments" className={({ isActive }) => isActive ? "Link active" : "Link"}>
                        <i className="fa-solid fa-money-check-dollar fa-lg"></i> Payments
                    </NavLink>
                </div>

                {/* Theme Toggle Button */}
                <div className="theme-selector mt-5">
                    <label htmlFor="theme-select">Select Theme:</label>
                    <select id="theme-select" value={theme} onChange={(e) => setTheme(e.target.value)}>
                        {themes.map((t) => (
                            <option key={t} value={t}>
                                {t.charAt(0).toUpperCase() + t.slice(1)}
                            </option>
                        ))}
                    </select>
                </div>

                <div className='d-flex my-5'>

                    {localStorage.getItem("token") ? (
                        <>
                            <button type="button" className="btn btn-save mx-2" data-bs-toggle="modal" data-bs-target="#RegisterModal">
                                Register
                            </button>
                            <button className="btn btn-danger btn-sm mx-2" onClick={() => {
                                localStorage.removeItem("token");
                                window.location.href = "/login";
                            }}>
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <button type="button" className="btn btn-save mx-2" data-bs-toggle="modal" data-bs-target="#LoginModal">
                                Login
                            </button>
                        </>
                    )}



                </div>
            </div>

            <div class="modal" id="RegisterModal" tabindex="-1" aria-labelledby="RegisterModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div className="modal-content">
                        <form onSubmit={handleRegister}>
                            <div className="modal-header">
                                <h5 className="modal-title">Register</h5>
                            </div>
                            <div className="modal-body">
                                {message && <div className="text-success mb-2">{message}</div>}
                                {error && <div className="text-danger mb-2">{error}</div>}
                                <input type="text" placeholder="Username" className="form-control mb-2"
                                    value={username} onChange={e => setUsername(e.target.value)} required />
                                <input type="password" placeholder="Password" className="form-control"
                                    value={password} onChange={e => setPassword(e.target.value)} required />
                            </div>
                            <div className="modal-footer">
                                <button type="submit" className="btn btn-success">Register</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <div class="modal fade" id="LoginModal" tabindex="-1" aria-labelledby="LoginModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div className="modal-content">
                        <form onSubmit={handleLogin}>
                            <div className="modal-header">
                                <h5 className="modal-title">Login</h5>
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
