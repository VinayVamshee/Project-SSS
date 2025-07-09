import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function AddNewStudent() {

    const navigate = useNavigate();
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
        }
    }, [navigate]);    
    const [student, setStudent] = useState({
        name: '',
        nameHindi: '',
        dob: '',
        dobInWords: '',
        aadharNo: '',
        gender: '',
        bloodGroup: '',
        image: '',
        category: '',
        AdmissionNo: '',
        Caste: '',
        CasteHindi: '',
        FreeStud: '',
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
            nameHindi: student.nameHindi,
            dob: student.dob,
            dobInWords: student.dobInWords,
            aadharNo: student.aadharNo,
            gender: student.gender,
            bloodGroup: student.bloodGroup,
            image: student.image,
            category: student.category,
            AdmissionNo: student.AdmissionNo,
            Caste: student.Caste,
            CasteHindi: student.CasteHindi,
            FreeStud: student.FreeStud,
            academicYears: student.academicYears,
            additionalInfo: Object.keys(student.additionalInfo).map((key) => ({
                key: key,
                value: student.additionalInfo[key],
            })),
        };

        try {
            await axios.post('https://sss-server-eosin.vercel.app/addStudent', studentData);
            setMessage('Student added successfully!');
            setStudent({
                name: '',
                nameHindi: '',
                dob: '',
                dobInWords: '',
                aadharNo: '',
                gender: '',
                bloodGroup: '',
                image: '',
                category: '',
                AdmissionNo: '',
                Caste: '',
                CasteHindi: '',
                FreeStud: '',
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

    const [personalInfo, setPersonalInfo] = useState({
        sno: '',
        personalInformationList_name: ''
    });

    const handleAddAdditionalPersonalInformation = async (e) => {
        e.preventDefault();
        try {
            await axios.post('https://sss-server-eosin.vercel.app/AddAdditionalPersonalInformation', personalInfo);
            setPersonalInfo({ sno: '', personalInformationList_name: '' });
            fetchPersonalInformationList();
        } catch (error) {
            setMessage('Error adding personal information. Please try again.');
        }
    };


    // eslint-disable-next-line
    const handleDeletePersonalInfo = async (infoId) => {
        try {
            await axios.delete(`https://sss-server-eosin.vercel.app/DeletePersonalInfo/${infoId}`);
            setpersonalInfoList(personalInfoList.filter(info => info._id !== infoId));
        } catch (error) {
            console.error('Error deleting personal information:', error);
        }
    };


    return (
        <div className="AddNewStudent">

            <p style={{ margin: '0px' }}>
                <button className="btn btn-save btn-sm" type="button" data-bs-toggle="collapse" data-bs-target="#AdditionalInformationCollapse" aria-expanded="false" aria-controls="AdditionalInformationCollapse">
                    Add Additional Information
                </button>
            </p>
            <div>
                <div className="collapse" id="AdditionalInformationCollapse">
                    <div className="card card-body">
                        <form onSubmit={handleAddAdditionalPersonalInformation}>
                            <div className="mb-3">
                                <label htmlFor="sno" className="form-label">S.No</label>
                                <input type="text" className="form-control" id="sno" placeholder="Enter S.No" value={personalInfo.sno} onChange={e => setPersonalInfo(p => ({ ...p, sno: e.target.value }))} required />
                            </div>
                            <div className="mb-3">
                                <label htmlFor="name" className="form-label">Name</label>
                                <input type="text" className="form-control" id="name" placeholder='Enter the Additional Personal Information You Want to Take ' value={personalInfo.personalInformationList_name} onChange={e => setPersonalInfo(p => ({ ...p, personalInformationList_name: e.target.value }))} required />
                            </div>
                            <button type="submit" className="btn btn-success btn-sm ">Save</button>
                        </form>
                    </div>
                </div>
            </div>



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

                        {/* Name (Hindi) */}

                        <label className="form-label">Name (Hindi)</label>
                        <input
                            type="text"
                            className="form-control"
                            value={student.nameHindi}
                            onChange={(e) => setStudent((prev) => ({ ...prev, nameHindi: e.target.value }))}
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

                <div className="row">
                    {/* Student DOB */}
                    <div className="col-md-6 mb-3">
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

                    {/* DOB in Words (auto-filled based on DOB selection if you want) */}
                    <div className="col-md-6 mb-3">
                        <label className="form-label">Date of Birth (in Words)</label>
                        <input
                            type="text"
                            className="form-control"
                            value={student.dobInWords}
                            onChange={(e) => setStudent((prev) => ({ ...prev, dobInWords: e.target.value }))}
                        />
                    </div>

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

                    {/* category */}
                    <div className="col-md-6 mb-3">
                        <label className="form-label">Category</label>
                        <select className="form-select" value={student.category}
                            onChange={(e) => setStudent((prev) => ({ ...prev, category: e.target.value }))} required>
                            <option value="">Select category</option>
                            <option value="General">General</option>
                            <option value="OBC">OBC (Other Backward Classes)</option>
                            <option value="SC">SC (Scheduled category)</option>
                            <option value="ST">ST (Scheduled Tribe)</option>
                            <option value="EWS">EWS (Economically Weaker Section)</option>
                        </select>
                    </div>

                    {/* Admission No */}
                    <div className="col-md-6 mb-3">
                        <label className="form-label">Admission No</label>
                        <input
                            type="text"
                            className="form-control"
                            value={student.AdmissionNo}
                            onChange={(e) => setStudent((prev) => ({ ...prev, AdmissionNo: e.target.value }))}
                            required
                        />
                    </div>

                    {/* Caste */}
                    <div className="col-md-6 mb-3">
                        <label className="form-label">Caste</label>
                        <input
                            type="text"
                            className="form-control"
                            value={student.Caste}
                            onChange={(e) => setStudent((prev) => ({ ...prev, Caste: e.target.value }))}
                            required
                        />
                    </div>

                    {/* Caste (Hindi) */}
                    <div className="col-md-6 mb-3">
                        <label className="form-label">Caste (Hindi)</label>
                        <input
                            type="text"
                            className="form-control"
                            value={student.CasteHindi}
                            onChange={(e) => setStudent((prev) => ({ ...prev, CasteHindi: e.target.value }))}
                        />
                    </div>

                    {/* Aadhaar No */}
                    <div className="col-md-6 mb-3">
                        <label className="form-label">Aadhaar No</label>
                        <input
                            type="text"
                            className="form-control"
                            value={student.aadharNo}
                            onChange={(e) => setStudent((prev) => ({ ...prev, aadhaarNo: e.target.value }))}
                            title="Enter a valid 12-digit Aadhaar number"
                        />
                    </div>

                    {/* Free Student */}
                    <div className="col-md-6 mb-3">
                        <label className="form-label">Free Student</label>
                        <input
                            type="text"
                            className="form-control"
                            value={student.FreeStud}
                            onChange={(e) => setStudent((prev) => ({ ...prev, FreeStud: e.target.value }))}
                        />
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
                    {personalInfoList
                        .filter(info => info.sno && info._id) // filter out incomplete items
                        .sort((a, b) => parseInt(a.sno) - parseInt(b.sno))
                        .map(info => (
                            <div key={info._id} className="col-md-6 mb-3">
                                <label htmlFor={info._id} className="form-label">{info.name}</label>
                                <input type="text" className="form-control" id={info._id} value={student.additionalInfo[info.name] || ''} onChange={(e) => handleChangeAdditionalInfo(info.name, e.target.value)} />
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
