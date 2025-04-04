import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function AddNewStudent() {
    const [student, setStudent] = useState({
        name: '',
        dob: '',
        gender: '',
        bloodGroup: '',
        image: '',
        caste: '',
        academicYears: [],
        additionalInfo: {},
    });
    const [message, setMessage] = useState('');
    const [academicYears, setAcademicYears] = useState([]);
    const [classes, setClasses] = useState([]);

    // Fetch academic years and classes
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [academicYearsRes, classesRes] = await Promise.all([
                    axios.get('https://sss-server-eosin.vercel.app/GetAcademicYear'),
                    axios.get('https://sss-server-eosin.vercel.app/getClasses'),
                ]);

                // Ensure years array exists
                const years = academicYearsRes.data?.data || [];

                // Sort years in descending order (latest first)
                const sortedYears = years.sort((a, b) => {
                    const yearA = parseInt(a.year?.split("-")[0] || "0", 10);
                    const yearB = parseInt(b.year?.split("-")[0] || "0", 10);
                    return yearB - yearA; // Swap order for descending sort
                });

                // Ensure classes array exists
                const classes = classesRes.data?.classes || [];

                // Sort classes in ascending order (smallest first)
                const sortedClasses = classes.sort((a, b) => parseInt(a.class) - parseInt(b.class));

                setAcademicYears(sortedYears);
                setClasses(sortedClasses);
            } catch (error) {
                console.error('Error fetching data:', error);
                setAcademicYears([]);
                setClasses([]);
            }
        };


        fetchData();
    }, []);


    const [personalInfoList, setpersonalInfoList] = useState([]);
    const fetchPersonalInformationList = async () => {
        try {
            const response = await axios.get('https://sss-server-eosin.vercel.app/GetPersonalInformationList');
            setpersonalInfoList(response.data.data || []); // Default to an empty array if no data is returned
        } catch (error) {
            console.error('Error fetching personal information list:', error);
        }
    };

    useEffect(() => {
        fetchPersonalInformationList();
    }, []);


    const handleAddStudent = async (e) => {
        e.preventDefault();

        const studentData = {
            name: student.name,
            dob: student.dob,
            gender: student.gender,
            image: student.image,
            caste: student.caste,
            bloodGroup: student.bloodGroup,
            additionalInfo: Object.keys(student.additionalInfo).map((key) => ({
                key: key,
                value: student.additionalInfo[key],
            })),
            academicYears: student.academicYears,
        };

        try {
            await axios.post('https://sss-server-eosin.vercel.app/addStudent', studentData);
            setMessage('Student added successfully!');
            setStudent({
                name: '',
                dob: '',
                gender: '',
                bloodGroup: '',
                image: '',
                caste: '',
                academicYears: [],
                additionalInfo: {},
            });
        } catch (error) {
            setMessage('Error adding student');
            console.error('Error adding student:', error);
        }
    };

    const handleChangeAdditionalInfo = (field, value) => {
        setStudent((prev) => ({
            ...prev,
            additionalInfo: {
                ...prev.additionalInfo,
                [field]: value,
            },
        }));
    };

    return (
        <div className="AddNewStudent">
            <form onSubmit={handleAddStudent} className="border p-4 rounded shadow-sm bg-light">
                {/* Student Name & Image URL with Preview */}
                <div className="mb-3 d-flex align-items-center">
                    <div className="flex-grow-1">
                        {/* Student Name */}
                        <label htmlFor="name" className="form-label">Name</label>
                        <input
                            type="text"
                            className="form-control mb-2"
                            id="name"
                            value={student.name}
                            onChange={(e) => setStudent((prev) => ({ ...prev, name: e.target.value }))}
                            required
                        />

                        {/* Student Image URL */}
                        <label htmlFor="imageUrl" className="form-label">Student Image URL</label>
                        <input
                            type="text"
                            className="form-control"
                            id="imageUrl"
                            value={student.image}
                            onChange={(e) => setStudent((prev) => ({ ...prev, image: e.target.value }))}
                            required
                        />
                    </div>

                    {/* Image Preview */}
                    <div className="ms-3">
                        {student.image ? (
                            <img src={student.image} alt="Student" className="border rounded" style={{ width: "150px", height: "180px", objectFit: "cover" }} />
                        ) : (
                            <div className="border rounded bg-light d-flex align-items-center justify-content-center" style={{ width: "150px", height: "180px" }}>
                                No Image
                            </div>
                        )}
                    </div>
                </div>

                {/* Student DOB */}
                <div className="mb-3">
                    <label htmlFor="dob" className="form-label">Date of Birth</label>
                    <input
                        type="date"
                        className="form-control"
                        id="dob"
                        value={student.dob}
                        onChange={(e) => setStudent((prev) => ({ ...prev, dob: e.target.value }))}
                        required
                    />
                </div>

                <div className="row">
                    {/* Gender */}
                    <div className="col-md-6 mb-3">
                        <label className="form-label">Gender</label>
                        <select className="form-select" value={student.gender}
                            onChange={(e) => setStudent((prev) => ({ ...prev, gender: e.target.value }))} required>
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                    </div>

                    {/* Blood Group */}
                    <div className="col-md-6 mb-3">
                        <label className="form-label">Blood Group</label>
                        <select className="form-select" value={student.bloodGroup}
                            onChange={(e) => setStudent((prev) => ({ ...prev, bloodGroup: e.target.value }))} required>
                            <option value="">Select Blood Group</option>
                            <option value="A+">A+</option>
                            <option value="A-">A-</option>
                            <option value="B+">B+</option>
                            <option value="B-">B-</option>
                            <option value="O+">O+</option>
                            <option value="O-">O-</option>
                            <option value="AB+">AB+</option>
                            <option value="AB-">AB-</option>
                        </select>
                    </div>

                    {/* Caste */}
                    <div className="col-md-6 mb-3">
                        <label className="form-label">Caste</label>
                        <select className="form-select" value={student.caste}
                            onChange={(e) => setStudent((prev) => ({ ...prev, caste: e.target.value }))} required>
                            <option value="">Select Caste</option>
                            <option value="General">General</option>
                            <option value="OBC">OBC (Other Backward Classes)</option>
                            <option value="SC">SC (Scheduled Caste)</option>
                            <option value="ST">ST (Scheduled Tribe)</option>
                            <option value="EWS">EWS (Economically Weaker Section)</option>
                        </select>
                    </div>
                </div>

                {/* Add Academic Year and Class */}
                <div className="mb-3">
                    <h5>Academic History</h5>
                    <button
                        type="button"
                        className="btn btn-save mb-3"
                        onClick={() => setStudent((prev) => ({
                            ...prev,
                            academicYears: [...prev.academicYears, { academicYear: '', class: '' }]
                        }))}>
                        + Add Academic Year
                    </button>

                    {student.academicYears.map((academicYear, index) => (
                        <div key={index} className="mb-3 border p-3 rounded">
                            <div className="row">
                                <div className="col-md-6">
                                    <label htmlFor={`academicYear-${index}`} className="form-label">Academic Year</label>
                                    <select
                                        className="form-select"
                                        value={academicYear.academicYear}
                                        onChange={(e) => {
                                            const newAcademicYears = [...student.academicYears];
                                            newAcademicYears[index].academicYear = e.target.value;
                                            setStudent((prev) => ({ ...prev, academicYears: newAcademicYears }));
                                        }}
                                        required
                                    >
                                        <option value="">Select Academic Year</option>
                                        {academicYears.map((year) => (
                                            <option key={year._id} value={year.year}>{year.year}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-md-6">
                                    <label htmlFor={`class-${index}`} className="form-label">Class</label>
                                    <select
                                        className="form-select"
                                        value={academicYear.class}
                                        onChange={(e) => {
                                            const newAcademicYears = [...student.academicYears];
                                            newAcademicYears[index].class = e.target.value;
                                            setStudent((prev) => ({ ...prev, academicYears: newAcademicYears }));
                                        }}
                                        required
                                    >
                                        <option value="">Select Class</option>
                                        {classes.map((cls) => (
                                            <option key={cls._id} value={cls.class}>{cls.class}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>


                {/* Personal Information */}
                <div className="row">
                    {personalInfoList.map((info) => (
                        <div key={info._id} className="col-md-6 mb-3">
                            <label htmlFor={info._id} className="form-label">{info.name}</label>
                            <input
                                type="text"
                                className="form-control"
                                id={info._id}
                                value={student.additionalInfo[info.name] || ''}
                                onChange={(e) => handleChangeAdditionalInfo(info.name, e.target.value)}
                            />
                        </div>
                    ))}
                </div>

                {/* Submit Button */}
                <button type="submit" className="btn btn-save w-100">Save Student</button>

                {/* Success/Error Message */}
                {message && <p className="mt-3 text-center text-primary">{message}</p>}
            </form>
        </div>
    );
}
