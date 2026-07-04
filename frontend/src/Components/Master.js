import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Master() {
    const navigate = useNavigate();

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
        sessions: [{ from: '', to: '' }]
    });

    const [latestId, setLatestId] = useState(null);
    const [allMasters, setAllMasters] = useState([]);

    const fetchAllMasters = () => {
        axios.get('https://sss-server-eosin.vercel.app/get-all-masters')
            .then(res => setAllMasters(res.data))
            .catch(err => console.error('Error fetching all masters:', err.message));
    };

    useEffect(() => {
        axios.get('https://sss-server-eosin.vercel.app/masters/')
            .then(res => {
                const data = res.data;
                if (data) {
                    setForm({
                        imageUrl: data.imageUrl || '',
                        name: data.name || '',
                        address: data.address || '',
                        phoneNo: data.phoneNo || '',
                        email: data.email || '',
                        sessions: data.sessions || [{ from: '', to: '' }]
                    });
                    setLatestId(data._id);
                }
            })
            .catch(() => setLatestId(null));
    }, []);

    useEffect(() => {
        fetchAllMasters();
    }, [latestId]);

    const handleChange = (e) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSessionChange = (index, field, value) => {
        const updated = [...form.sessions];
        updated[index][field] = value;
        setForm(prev => ({ ...prev, sessions: updated }));
    };

    const addSession = () => {
        setForm(prev => ({
            ...prev,
            sessions: [...prev.sessions, { from: '', to: '' }]
        }));
    };

    const postNewMaster = () => {
        axios.post('https://sss-server-eosin.vercel.app/masters', form)
            .then(res => {
                alert('✅ New master added!');
                setLatestId(res.data._id);
            })
            .catch(err => alert('Error adding master: ' + err.message));
    };

    const updateLatestMaster = () => {
        if (!latestId) return alert('⚠️ No master record to update.');

        axios.put(`https://sss-server-eosin.vercel.app/masters/${latestId}`, form)
            .then(() => alert('✅ Master updated successfully!'))
            .catch(err => alert('Error updating master: ' + err.message));
    };

    const setInUse = (id) => {
        axios.put(`https://sss-server-eosin.vercel.app/masters/set-in-use/${id}`)
            .then(() => {
                alert("✅ This master is now in use.");
                setLatestId(id);
                fetchAllMasters();
            })
            .catch(() => alert("❌ Failed to set in use."));
    };

    const deleteMaster = (id) => {
        if (window.confirm("⚠️ Are you sure you want to delete this master?")) {
            axios.delete(`https://sss-server-eosin.vercel.app/masters/${id}`)
                .then(() => {
                    alert("🗑️ Master deleted.");
                    fetchAllMasters();
                })
                .catch(() => alert("❌ Failed to delete."));
        }
    };

    const [academicYear, setAcademicYear] = useState('');
    const [academicYears, setAcademicYears] = useState([]);
    useEffect(() => {
        fetchAcademicYears();
    }, []);
    const fetchAcademicYears = () => {
        axios.get("https://sss-server-eosin.vercel.app/GetAcademicYear")
            .then(res => setAcademicYears(res.data.data))
            .catch(() => alert("❌ Failed to load academic years."));
    };
    const addAcademicYear = () => {
        if (!academicYear) return alert("Please enter an academic year.");
        axios.post("https://sss-server-eosin.vercel.app/AddAcademicYear", { year: academicYear })
            .then(() => {
                setAcademicYear('');
                fetchAcademicYears();
                alert("✅ Academic Year Added");
            })
            .catch(() => alert("❌ Failed to add academic year"));
    };
    const deleteAcademicYear = (id) => {
        if (window.confirm("Are you sure you want to delete this academic year?")) {
            axios.delete(`https://sss-server-eosin.vercel.app/DeleteAcademicYear/${id}`)
                .then(() => {
                    fetchAcademicYears();
                    alert("🗑️ Deleted");
                })
                .catch(() => alert("❌ Failed to delete"));
        }
    };


    return (
        <div className="Master py-4">
            <h2 className="mb-4"><i className="fas fa-database me-2"></i>Master Form</h2>

            <form className="border p-4 rounded bg-light shadow-sm mb-5">
                <div className="mb-3">
                    <label>Image URL</label>
                    <input type="text" className="form-control" name="imageUrl" value={form.imageUrl} onChange={handleChange} />
                </div>
                <div className="mb-3">
                    <label>Name</label>
                    <input type="text" className="form-control" name="name" value={form.name} onChange={handleChange} />
                </div>
                <div className="mb-3">
                    <label>Address</label>
                    <input type="text" className="form-control" name="address" value={form.address} onChange={handleChange} />
                </div>
                <div className="mb-3">
                    <label>Phone No</label>
                    <input type="text" className="form-control" name="phoneNo" value={form.phoneNo} onChange={handleChange} />
                </div>
                <div className="mb-3">
                    <label>Email</label>
                    <input type="email" className="form-control" name="email" value={form.email} onChange={handleChange} />
                </div>

                <div className="mb-3">
                    <label>Sessions</label>
                    {form.sessions.map((session, index) => (
                        <div className="d-flex mb-2" key={index}>
                            <input
                                type="month"
                                className="form-control me-2"
                                value={session.from}
                                onChange={(e) => handleSessionChange(index, 'from', e.target.value)}
                            />
                            <input
                                type="month"
                                className="form-control"
                                value={session.to}
                                onChange={(e) => handleSessionChange(index, 'to', e.target.value)}
                            />
                        </div>
                    ))}
                    <button type="button" className="btn btn-outline-secondary" onClick={addSession}>
                        <i className="fas fa-plus me-1"></i>Add Session
                    </button>
                </div>

                <div className="d-flex gap-2 mt-3">
                    <button type="button" className="btn btn-success" onClick={postNewMaster}>
                        <i className="fas fa-plus-circle me-1"></i>New Master Data
                    </button>
                    <button type="button" className="btn btn-primary" onClick={updateLatestMaster}>
                        <i className="fas fa-sync-alt me-1"></i>Update Latest
                    </button>
                </div>
            </form>

            <div className="border p-4 rounded bg-white shadow-sm mb-5">
                <h4 className="mb-3">
                    <i className="fas fa-calendar-alt me-2 text-primary"></i>Academic Years
                </h4>

                <div className="d-flex gap-2 mb-3">
                    <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. 2023-24"
                        value={academicYear}
                        onChange={(e) => setAcademicYear(e.target.value)}
                    />
                    <button className="btn btn-success" onClick={addAcademicYear}>
                        <i className="fas fa-plus me-1"></i>Add
                    </button>
                </div>

                <div className="row">
                    {academicYears.length === 0 ? (
                        <p className="text-muted">No academic years added yet.</p>
                    ) : (
                        academicYears.map((yearObj) => (
                            <div className="col-md-6 mb-3" key={yearObj._id}>
                                <div className="border rounded p-3 d-flex justify-content-between align-items-center shadow-sm">
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


            <h3 className="mb-3"><i className="fas fa-folder-open me-2"></i>All Master Records</h3>

            <div className="row">
                {allMasters.map((master) => (
                    <div key={master._id} className="col-md-6">
                        <div className="card shadow-sm mb-4 border border-secondary">
                            <div className="card-body">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <h5 className="card-title mb-0">
                                        <i className="fas fa-user me-2 text-primary"></i>{master.name}
                                    </h5>
                                    {master.inUse && (
                                        <span className="badge bg-success">
                                            <i className="fas fa-check-circle me-1 p-1"></i>In Use
                                        </span>
                                    )}
                                </div>
                                <p><i className="fas fa-envelope me-2 text-muted"></i>{master.email}</p>
                                <p><i className="fas fa-phone me-2 text-muted"></i>{master.phoneNo}</p>
                                <p><i className="fas fa-map-marker-alt me-2 text-muted"></i>{master.address}</p>
                                <p><strong>Sessions:</strong></p>
                                <ul className="list-group list-group-flush mb-3">
                                    {master.sessions.map((session, i) => (
                                        <li key={i} className="list-group-item">
                                            {new Date(session.from).toLocaleDateString('en-IN')} <strong>to</strong> {new Date(session.to).toLocaleDateString('en-IN')}
                                        </li>
                                    ))}
                                </ul>
                                <p className="text-muted small">
                                    Created: {new Date(master.createdAt).toLocaleString()}<br />
                                    Updated: {new Date(master.updatedAt).toLocaleString()}
                                </p>
                                <div className="d-flex gap-2">
                                    {!master.inUse && (
                                        <button className="btn btn-outline-success btn-sm" onClick={() => setInUse(master._id)}>
                                            <i className="fas fa-check-circle me-1"></i>Set As In Use
                                        </button>
                                    )}
                                    <button className="btn btn-outline-danger btn-sm" onClick={() => deleteMaster(master._id)}>
                                        <i className="fas fa-trash me-1"></i>Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
