import axios from "axios";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Classes() {

    const navigate = useNavigate();
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
        }
    }, [navigate]);

    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [classSubjectsData, setClassSubjectsData] = useState([]);
    const [selectedClass, setSelectedClass] = useState(1);
    const [filteredSubjects, setFilteredSubjects] = useState([]);
    const [showAllSubjects, setShowAllSubjects] = useState(false);
    const [subjectName, setSubjectName] = useState("");
    const [message, setMessage] = useState("");

    useEffect(() => {
        const fetchClassesAndSubjects = async () => {
            try {
                const classResponse = await axios.get("https://sss-server-eosin.vercel.app/getClasses");
                const sortedClasses = (classResponse.data.classes || []).sort((a, b) =>
                    parseInt(a.class) - parseInt(b.class)
                );
                setClasses(sortedClasses);

                const response = await axios.get("https://sss-server-eosin.vercel.app/class-subjects");
                setClassSubjectsData(response.data.data || []);

                const subjectResponse = await axios.get("https://sss-server-eosin.vercel.app/getSubjects");
                setSubjects(subjectResponse.data.subjects || []);
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };

        fetchClassesAndSubjects();
    }, []);

    const handleClassClick = (className) => {
        setSelectedClass(className);
        setShowAllSubjects(false);
        const classData = classSubjectsData.find((item) => item.className === className);
        setFilteredSubjects(classData ? classData.subjectNames : []);
    };

    const handleSubjectsClick = () => {
        setSelectedClass(null);
        setShowAllSubjects(true);
    };

    const handleAddNewSubject = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post("https://sss-server-eosin.vercel.app/AddNewSubject", { subjectName });
            setSubjects([...subjects, response.data.subject] || []);
            setMessage("Subject added successfully!");
            setSubjectName("");
        } catch (error) {
            setMessage("Error adding subject. Please try again.");
        }
    };

    const handleDeleteSubject = async (subjectId) => {
        try {
            await axios.delete(`https://sss-server-eosin.vercel.app/deleteSubject/${subjectId}`);
            setSubjects(subjects.filter((subject) => subject._id !== subjectId));
        } catch (error) {
            console.error("Error deleting subject:", error);
        }
    };

    const [newSelectedSubjects, setNewSelectedSubjects] = useState([]);
    const handleCheckboxChange = (subjectName) => {
        setNewSelectedSubjects((prevSubjects) =>
            prevSubjects.includes(subjectName)
                ? prevSubjects.filter((subject) => subject !== subjectName)
                : [...prevSubjects, subjectName]
        );
    };

    const handleAddSubjectToClass = async (e) => {
        e.preventDefault();

        if (newSelectedSubjects.length === 0) {
            setMessage("Please select at least one subject.");
            return;
        }

        try {
            await axios.post("https://sss-server-eosin.vercel.app/ClassSubjectLink", {
                className: selectedClass,
                subjectNames: newSelectedSubjects,
            });
            window.location.reload();
        } catch (error) {
            setMessage("Error adding subjects. Please try again.");
            console.error(error.response?.data || error);
        }
    };

    const [examData, setExamData] = useState({
        selectedClass: '',
        numExams: 0,
        examNames: [],
    });

    const [examsData, setExamsData] = useState([]);

    const fetchExamsData = async () => {
        try {
            const response = await axios.get('https://sss-server-eosin.vercel.app/getExams');
            const sortedExams = response.data.exams.sort((a, b) => parseInt(a.class) - parseInt(b.class));
            setExamsData(sortedExams || []);
        } catch (error) {
            console.error('Error fetching exams data:', error);
        }
    };

    // Fetch exams when the component mounts
    useEffect(() => {
        fetchExamsData();
    }, []);

    const handleNumExamsChange = (e) => {
        const numExams = parseInt(e.target.value) || 0;
        setExamData((prevState) => ({
            ...prevState,
            numExams,
            examNames: [
                ...prevState.examNames.slice(0, numExams), // Keep existing names
                ...Array(Math.max(0, numExams - prevState.examNames.length)).fill(''), // Add new empty slots
            ],
        }));
    };

    const handleExamNameChange = (index, value) => {
        const updatedExamNames = [...examData.examNames];
        updatedExamNames[index] = value;
        setExamData({
            ...examData,
            examNames: updatedExamNames,
        });
    };


    const handleSubmitExam = async (e) => {
        e.preventDefault();
        if (!selectedClass) {
            setMessage("Please select a class before adding exams.");
            return;
        }
        try {
            const response = await axios.post('https://sss-server-eosin.vercel.app/addExams', {
                className: selectedClass, // Use selectedClass instead of examData.selectedClass
                numExams: examData.numExams,
                examNames: examData.examNames,
            });
            setMessage(response.data);
            fetchExamsData(); // Refresh the exams list
        } catch (err) {
            console.log(err);
            setMessage('Error while saving exam data');
        }
    };


    // const handleClassSelection = async (className) => {
    //     try {
    //         const response = await axios.get(`https://sss-server-eosin.vercel.app/getExams/${className}`);
    //         setExamData((prevState) => ({
    //             ...prevState,
    //             selectedClass: className,
    //             numExams: response.data.numExams,
    //             examNames: response.data.examNames,
    //         }));
    //     } catch (err) {
    //         setMessage('No exams data found for this class');
    //     }
    // };

    const [chapterList, setChapterList] = useState([]);
    const [newChapter, setNewChapter] = useState("");
    const [chapterMessage, setChapterMessage] = useState("");
    const [selectedChapterSubject, setSelectedChapterSubject] = useState("");

    const handleChapterOpen = async (subjectName) => {
        setSelectedChapterSubject(subjectName);
        setChapterMessage("");
        setNewChapter("");

        try {
            const res = await axios.get("https://sss-server-eosin.vercel.app/chapters");
            const found = res.data.data.find(
                (item) => item.className === selectedClass && item.subjectName === subjectName
            );
            setChapterList(found ? found.chapters : []);
        } catch (err) {
            console.error("Error fetching chapters:", err);
            setChapterList([]);
        }
    };

    return (
        <div className="ClassesPage">
            {/* 🔹 Top Bar: Classes + Subjects */}
            <div className="d-flex flex-wrap gap-2 mb-4 justify-content-start SearchFilter">
                {classes.map((cls) => (
                    <button
                        key={cls._id}
                        className={`btn ${selectedClass === cls.class ? "active" : ""}`}
                        onClick={() => handleClassClick(cls.class)}
                        style={{ backgroundColor: 'white', color: 'black' }}
                    >
                        {cls.class}
                    </button>
                ))}
                <button className="btn btn-secondary btn-sm" onClick={handleSubjectsClick}>
                    <i className="fa-solid fa-book me-2"></i>Subjects
                </button>
                <button className="btn btn-sm" data-bs-toggle="modal" data-bs-target="#linkSubjectsModal" >
                    <i className="fa-solid fa-link me-2"></i>Link Subjects
                </button>
            </div>

            {/* Link Subjects Modal */}
            <div
                className="modal fade"
                id="linkSubjectsModal"
                tabIndex="-1"
                aria-labelledby="linkSubjectsModalLabel"
                aria-hidden="true"
                data-bs-backdrop="false"
            >
                <div className="modal-dialog modal-lg modal-dialog-centered">
                    <div className="modal-content border-0 shadow-lg rounded-3">
                        <div className="modal-header bg-light border-bottom">
                            <h5 className="modal-title" id="linkSubjectsModalLabel">
                                <i className="fa-solid fa-link me-2 text-primary"></i>
                                Link Subjects to a Class
                            </h5>
                            <button
                                type="button"
                                className="btn-close"
                                data-bs-dismiss="modal"
                                aria-label="Close"
                            ></button>
                        </div>

                        <div className="modal-body px-4 py-3">
                            {/* Class Selector */}
                            <div className="mb-4">
                                <label className="form-label fw-semibold">Select Class</label>
                                <select
                                    className="form-select"
                                    value={selectedClass}
                                    onChange={(e) => handleClassClick(e.target.value)}
                                >
                                    <option value="">-- Choose Class --</option>
                                    {classes.map((cls) => (
                                        <option key={cls._id} value={cls.class}>
                                            {cls.class}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Subjects Table */}
                            <form onSubmit={handleAddSubjectToClass}>
                                <div className="card border shadow-sm">
                                    <div className="card-body p-0">
                                        <div className="table-responsive">
                                            <table className="table table-sm table-hover table-bordered m-0 align-middle">
                                                <thead className="table-light">
                                                    <tr>
                                                        <th style={{ width: "10%" }}>#</th>
                                                        <th>Subject Name</th>
                                                        <th style={{ width: "15%" }} className="text-center">
                                                            Select
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {subjects.map((subject, index) => (
                                                        <tr key={subject._id}>
                                                            <td>{index + 1}</td>
                                                            <td>{subject.name}</td>
                                                            <td className="text-center">
                                                                <input
                                                                    type="checkbox"
                                                                    className="form-check-input"
                                                                    checked={newSelectedSubjects.includes(subject.name)}
                                                                    onChange={() => handleCheckboxChange(subject.name)}
                                                                />
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                {/* Button + Message */}
                                <div className="d-flex justify-content-between align-items-center mt-3">
                                    <button type="submit" className="btn btn-success btn-sm">
                                        <i className="fa-solid fa-plus me-1"></i>
                                        Link Selected Subjects
                                    </button>
                                    {message && <span className="text-info small">{message}</span>}
                                </div>
                            </form>
                        </div>

                        <div className="modal-footer bg-light">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                data-bs-dismiss="modal"
                            >
                                <i className="fa-solid fa-xmark me-1"></i>Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>



            {/* 🔹 Main Content Area */}
            <div>
                {selectedClass && (
                    <div className="mb-4 Class-Subjects">
                        <div className="p-2 text-dark w-100">
                            Linked Subjects - {selectedClass}
                        </div>

                        {/* Subjects Linked to Class */}
                        <table className="table table-bordered m-0">
                            <thead className="table-light">
                                <tr>
                                    <th>S.No</th>
                                    <th>Subject Name</th>
                                    <th>Chapters</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSubjects.length > 0 ? (
                                    filteredSubjects.map((subject, index) => (
                                        <tr key={index}>
                                            <td>{index + 1}</td>
                                            <td>{subject}</td>
                                            <td>
                                                <button
                                                    className="btn btn-outline-secondary btn-sm"
                                                    data-bs-toggle="modal"
                                                    data-bs-target="#chapterModal"
                                                    onClick={() => handleChapterOpen(subject)}
                                                >
                                                    Chapters
                                                </button>


                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="3">No subjects available</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* Show Exams */}
                        <div className="card-body pt-0">
                            <h6 className="mt-4">Exams Linked to Class {selectedClass}</h6>
                            {examsData.length > 0 ? (
                                <table className="table table-bordered table-striped">
                                    <thead>
                                        <tr>
                                            <th>S.No</th>
                                            <th>Exam Name</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {examsData
                                            .filter((exam) => exam.class === selectedClass)
                                            .flatMap((exam, index) =>
                                                exam.examNames.map((examName, idx) => (
                                                    <tr key={`${index}-${idx}`}>
                                                        <td>{idx + 1}</td>
                                                        <td>{examName}</td>
                                                    </tr>
                                                ))
                                            )}
                                    </tbody>
                                </table>
                            ) : (
                                <p>No exams available for this class.</p>
                            )}
                        </div>

                        {/* Add Exams Form */}
                        <div className="card-body">
                            <h6 className="mt-3">Add Exams to Class {selectedClass}</h6>
                            <form onSubmit={handleSubmitExam}>
                                <div className="mb-3">
                                    <label className="form-label">Number of Exams</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={examData.numExams}
                                        onChange={handleNumExamsChange}
                                        min="1"
                                        required
                                    />
                                </div>

                                {examData.numExams > 0 && (
                                    <>
                                        {examData.examNames.map((examName, index) => (
                                            <div key={index} className="mb-3">
                                                <label className="form-label">Exam {index + 1} Name</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    placeholder={`Enter name for Exam ${index + 1}`}
                                                    value={examName}
                                                    onChange={(e) => handleExamNameChange(index, e.target.value)}
                                                    required
                                                />
                                            </div>
                                        ))}
                                    </>
                                )}

                                <button type="submit" className="btn btn-primary btn-sm">Add Exams</button>
                            </form>
                            {message && <p className="text-center text-info mt-2">{message}</p>}
                        </div>
                    </div>
                )}

                {/* 🔹 All Subjects Section */}
                {showAllSubjects && (
                    <div className="card Subjects">
                        <div className="card-header bg-secondary text-white">
                            Manage Subjects
                        </div>
                        <div className="card-body">
                            <form onSubmit={handleAddNewSubject} className="mb-3 d-flex gap-2">
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Enter new subject"
                                    value={subjectName}
                                    onChange={(e) => setSubjectName(e.target.value)}
                                    required
                                />
                                <button type="submit" className="btn btn-success btn-sm">Add Subject</button>
                            </form>

                            {message && <p className="text-success">{message}</p>}

                            <table className="table table-bordered table-hover">
                                <thead className="table-light">
                                    <tr>
                                        <th>#</th>
                                        <th>Subject Name</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {subjects.map((subject, index) => (
                                        <tr key={subject._id}>
                                            <td>{index + 1}</td>
                                            <td>{subject.name}</td>
                                            <td>
                                                <button
                                                    className="btn btn-outline-danger btn-sm"
                                                    onClick={() => handleDeleteSubject(subject._id)}
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            <div
                className="modal fade"
                id="chapterModal"
                tabIndex="-1"
                data-bs-backdrop="false"
                aria-labelledby="chapterModalLabel"
                aria-hidden="true"
            >
                <div className="modal-dialog modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title" id="chapterModalLabel">
                                Chapters for {selectedChapterSubject} (Class {selectedClass})
                            </h5>
                            <button
                                type="button"
                                className="btn-close"
                                data-bs-dismiss="modal"
                                aria-label="Close"
                            ></button>
                        </div>

                        <div className="modal-body">
                            <form
                                className="mb-3"
                                onSubmit={async (e) => {
                                    e.preventDefault();
                                    if (!newChapter.trim()) return;

                                    const updatedChapters = [...chapterList, newChapter];
                                    try {
                                        await axios.post("https://sss-server-eosin.vercel.app/chapters", {
                                            className: selectedClass,
                                            subjectName: selectedChapterSubject,
                                            chapters: updatedChapters,
                                        });
                                        setChapterList(updatedChapters);
                                        setNewChapter("");
                                        setChapterMessage("Chapter added successfully!");
                                    } catch (err) {
                                        console.error(err);
                                        setChapterMessage("Failed to add chapter.");
                                    }
                                }}
                            >
                                <div className="input-group">
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Enter chapter name"
                                        value={newChapter}
                                        onChange={(e) => setNewChapter(e.target.value)}
                                        required
                                    />
                                    <button type="submit" className="btn btn-success">Add</button>
                                </div>
                            </form>

                            {chapterMessage && (
                                <div className="alert alert-info py-1">{chapterMessage}</div>
                            )}

                            <table className="table table-bordered table-sm">
                                <thead className="table-light">
                                    <tr>
                                        <th style={{ width: "10%" }}>#</th>
                                        <th>Chapter Name</th>
                                        <th style={{ width: "15%" }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {chapterList.length > 0 ? (
                                        chapterList.map((ch, idx) => (
                                            <tr key={idx}>
                                                <td>{idx + 1}</td>
                                                <td>{ch}</td>
                                                <td>
                                                    <button
                                                        className="btn btn-outline-danger btn-sm"
                                                        onClick={async () => {
                                                            const updated = chapterList.filter((c) => c !== ch);
                                                            try {
                                                                await axios.post("https://sss-server-eosin.vercel.app/chapters", {
                                                                    className: selectedClass,
                                                                    subjectName: selectedChapterSubject,
                                                                    chapters: updated,
                                                                });
                                                                setChapterList(updated);
                                                            } catch (err) {
                                                                console.error(err);
                                                            }
                                                        }}
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="3" className="text-center">
                                                No chapters available
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                data-bs-dismiss="modal"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>


        </div>
    );
}
