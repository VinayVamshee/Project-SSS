import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Master() {

    const navigate = useNavigate();
    // Redirect to login if no token
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) navigate("/login");
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

    // Load latest master on mount
    useEffect(() => {
        axios.get('https://sss-server-eosin.vercel.app/masters')
            .then(res => {
                const data = res.data;
                setForm({
                    imageUrl: data.imageUrl || '',
                    name: data.name || '',
                    address: data.address || '',
                    phoneNo: data.phoneNo || '',
                    email: data.email || '',
                    sessions: data.sessions || [{ from: '', to: '' }]
                });
                setLatestId(data._id);
            })
            .catch(() => {
                setLatestId(null);
            });
    }, []);

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

    const [allMasters, setAllMasters] = useState([]);

    useEffect(() => {
        axios.get('https://sss-server-eosin.vercel.app/get-all-masters')
            .then(res => setAllMasters(res.data))
            .catch(err => console.error('Error fetching all masters:', err.message));
    }, [latestId]);

    return (
        <div className="Master">
            <h2>Master Form</h2>
            <form>
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
                    <button type="button" className="btn btn-secondary" onClick={addSession}>+ Add Session</button>
                </div>

                <div className="d-flex gap-2">
                    <button type="button" className="btn btn-success" onClick={postNewMaster}>➕ New Master Data</button>
                    <button type="button" className="btn btn-primary" onClick={updateLatestMaster}>🔁 Update Latest</button>
                </div>
            </form>

            <h3 className="mt-5">🗂️ All Master Records</h3>
            {allMasters.map((master, idx) => (
                <div key={master._id} className="card mb-3">
                    <div className="card-body">
                        <h5 className="card-title">{master.name}</h5>
                        <p><strong>Email:</strong> {master.email}</p>
                        <p><strong>Phone:</strong> {master.phoneNo}</p>
                        <p><strong>Address:</strong> {master.address}</p>
                        <p><strong>Sessions:</strong></p>
                        <ol>
                            {master.sessions.map((session, i) => (
                                <li key={i}>
                                    {new Date(session.from).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                    <br />to<br />
                                    {new Date(session.to).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                </li>
                            ))}
                        </ol>
                        <p className="text-muted">
                            Created: {new Date(master.createdAt).toLocaleString()}<br />
                            Updated: {new Date(master.updatedAt).toLocaleString()}
                        </p>
                    </div>
                </div>
            ))}

        </div>
    );
}