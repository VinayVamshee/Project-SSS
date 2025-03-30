import React, { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import vts from './Images/Bada school logo.png';

export default function Navigation() {
    const themes = ["light", "dark", "midnight-red", "Ocean", "Earth", "Rose Blush"];
    const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("theme", theme);
    }, [theme]);


    return (
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
        </div>
    );
}
