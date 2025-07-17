import axios from "axios";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Classes() {

    const navigate = useNavigate();
    const [canEdit, setCanEdit] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("token");
        const storedUserType = localStorage.getItem("userType");

        if (!token || !storedUserType) {
            navigate("/login");
        } else {
            if (storedUserType === "admin") {
                setCanEdit(true);
            }
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
                const classResponse = await axios.get("http://localhost:3001/getClasses");
                const sortedClasses = (classResponse.data.classes || []).sort((a, b) =>
                    parseInt(a.class) - parseInt(b.class)
                );
                setClasses(sortedClasses);

                const response = await axios.get("http://localhost:3001/class-subjects");
                setClassSubjectsData(response.data.data || []);

                const subjectResponse = await axios.get("http://localhost:3001/getSubjects");
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
            const response = await axios.post("http://localhost:3001/AddNewSubject", { subjectName });
            const newSubject = response.data.subject;

            if (newSubject && newSubject.name) {
                setSubjects([...subjects, newSubject]);
                setMessage("Subject added successfully!");
                setSubjectName("");
            } else {
                setMessage("Invalid subject data received.");
                console.error("Invalid subject:", response.data);
            }
        } catch (error) {
            console.error("Error adding subject:", error);
            setMessage("Error adding subject. Please try again.");
        }
    };

    const handleDeleteSubject = async (subjectId) => {
        try {
            await axios.delete(`http://localhost:3001/deleteSubject/${subjectId}`);
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
            await axios.post("http://localhost:3001/ClassSubjectLink", {
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
            const response = await axios.get('http://localhost:3001/getExams');
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
            const response = await axios.post('http://localhost:3001/addExams', {
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
    //         const response = await axios.get(`http://localhost:3001/getExams/${className}`);
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
            const res = await axios.get("http://localhost:3001/chapters");
            const found = res.data.data.find(
                (item) => item.className === selectedClass && item.subjectName === subjectName
            );
            setChapterList(found ? found.chapters : []);
        } catch (err) {
            console.error("Error fetching chapters:", err);
            setChapterList([]);
        }
    };

    const [className, setClassName] = useState('');
    const handleAddNewClass = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:3001/AddNewClass', {
                className,
            });

            setMessage('Class added successfully!');
            setClassName('');
        } catch (error) {
            setMessage('Error adding class. Please try again.');
        }
    };

    // Delete Classes
    const deleteClass = async (classId) => {
        try {
            // Send request to delete class
            await axios.delete(`http://localhost:3001/deleteClass/${classId}`);
            // Remove the deleted class from the state
            setClasses(classes.filter(cls => cls._id !== classId));
        } catch (error) {
            console.error('Error deleting class:', error);
        }
    };

    return (
        <div className="ClassesPage">

            <div className="SearchFilter">
                <div className="form-group mb-0">
                    <select
                        className="form-select"
                        value={selectedClass}
                        onChange={(e) => handleClassClick(e.target.value)}
                    >
                        <option value="">Select Class</option>
                        {classes.map((cls) => (
                            <option key={cls.class} value={cls.class}>
                                {cls.class}
                            </option>
                        ))}
                    </select>
                </div>
                <button className="btn" onClick={handleSubjectsClick}>
                    <i className="fa-solid fa-book me-2"></i>Subjects
                </button>
                <button className="btn" data-bs-toggle="modal" data-bs-target="#linkSubjectsModal" >
                    <i className="fa-solid fa-link me-2"></i>Link Subjects
                </button>
                <button type="button" className="btn" data-bs-toggle="modal" data-bs-target="#AddNewClassModal">Classes</button>
                <button className="btn" data-bs-toggle="modal" data-bs-target="#addExamModal">
                    <i className="fa-solid fa-plus me-2"></i>Add Exams
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
                                        <option key={cls.class} value={cls.class}>
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

                        {/* Show Exams Section */}
                        <div className="card shadow-sm mb-4 mt-4">
                            <div className="card-body">
                                <h5 className="card-title mb-3">📘 Exams Linked to <strong>{selectedClass}</strong></h5>

                                {examsData.length > 0 &&
                                    examsData.some(exam => exam.class === selectedClass) ? (
                                    <div className="table-responsive">
                                        <table className="table table-hover table-bordered align-middle">
                                            <thead className="table-light">
                                                <tr>
                                                    <th style={{ width: "80px" }}>S.No</th>
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
                                    </div>
                                ) : (
                                    <div className="alert alert-warning mb-0">
                                        No exams available for this class.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Add Exams Form Section
                        <div className="card shadow-sm">
                            <div className="card-body">
                                <h5 className="card-title mb-3">➕ Add Exams to <strong>{selectedClass}</strong></h5>

                                <form onSubmit={handleSubmitExam}>
                                    <div className="row mb-3">
                                        <div className="col-md-4">
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
                                    </div>

                                    {examData.numExams > 0 && (
                                        <div className="row">
                                            {examData.examNames.map((examName, index) => (
                                                <div className="col-md-6 mb-3" key={index}>
                                                    <label className="form-label">Exam {index + 1} Name</label>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        placeholder={`Enter name for Exam ${index + 1}`}
                                                        value={examName}
                                                        onChange={(e) =>
                                                            handleExamNameChange(index, e.target.value)
                                                        }
                                                        required
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="d-flex justify-content-between align-items-center mt-3">
                                        <button type="submit" className="btn btn-primary">
                                            <i className="fa-solid fa-plus me-2"></i>Add Exams
                                        </button>
                                        {message && (
                                            <span className="text-success fw-semibold">{message}</span>
                                        )}
                                    </div>
                                </form>
                            </div>
                        </div> */}

                        <div className="modal fade" id="addExamModal" tabIndex="-1" aria-labelledby="addExamModalLabel" aria-hidden="true">
                            <div className="modal-dialog modal-lg modal-dialog-scrollable">
                                <div className="modal-content">
                                    <form onSubmit={handleSubmitExam} style={{ display: 'flex', flexDirection: 'column', width: "100%" }}>
                                        <div className="modal-header w-100">
                                            <h5 className="modal-title" id="addExamModalLabel">
                                                <i className="fa-solid fa-pen-to-square me-2"></i>
                                                Add Exams to <strong>{selectedClass}</strong>
                                            </h5>
                                            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                        </div>


                                        <div className="modal-body w-100">
                                            {/* Number of Exams - Single line full width */}
                                            <div className="mb-3">
                                                <label className="form-label">Number of Exams</label>
                                                <input
                                                    type="number"
                                                    className="form-control w-25"
                                                    value={examData.numExams}
                                                    onChange={handleNumExamsChange}
                                                    min="1"
                                                    required
                                                    placeholder="e.g., 3"
                                                />
                                            </div>

                                            {/* Exam Name Inputs */}
                                            {examData.numExams > 0 && (
                                                <div className="row g-3">
                                                    {examData.examNames.map((examName, index) => (
                                                        <div className="col-sm-6 col-md-4" key={index}>
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
                                                </div>
                                            )}

                                            {/* Success Message */}
                                            {message && (
                                                <div className="text-success fw-semibold mt-3 w-100">
                                                    {message}
                                                </div>
                                            )}
                                        </div>

                                        <div className="modal-footer w-100">
                                            <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                            <button type="submit" className="btn btn-primary">
                                                <i className="fa-solid fa-check me-2"></i>Save Exams
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>



                    </div>
                )}

                {/* 🔹 All Subjects Section */}
                {showAllSubjects && (
                    <div className="card Subjects mt-4">
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
                                                    disabled={!canEdit}
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

            <div className="modal fade" id="chapterModal" tabIndex="-1" data-bs-backdrop="false" aria-labelledby="chapterModalLabel" aria-hidden="true" >
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
                                        await axios.post("http://localhost:3001/chapters", {
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
                                                            const confirmDelete = window.confirm(`Are you sure you want to delete "${ch}"?`);
                                                            if (!confirmDelete) return;

                                                            const updated = chapterList.filter((c) => c !== ch);
                                                            try {
                                                                await axios.post("http://localhost:3001/chapters", {
                                                                    className: selectedClass,
                                                                    subjectName: selectedChapterSubject,
                                                                    chapters: updated,
                                                                });
                                                                setChapterList(updated);
                                                            } catch (err) {
                                                                console.error("Failed to update chapters:", err);
                                                            }
                                                        }}
                                                        disabled={!canEdit}
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

            {/* Add New Class Modal */}
            <div className="modal fade" id="AddNewClassModal" tabIndex="-1" aria-labelledby="AddNewClassModalLabel" aria-hidden="true">
                <div className="modal-dialog modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h1 className="modal-title fs-5" id="AddNewClassModalLabel">Classes</h1>
                            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={handleAddNewClass}>
                                <div className="mb-3">
                                    <label htmlFor="className" className="form-label">Add a new class</label>
                                    <input type="text" className="form-control" id="className" value={className} onChange={(e) => setClassName(e.target.value)} required />
                                </div>
                                {message && <p className="text-center">{message}</p>}
                                <button type="submit" className="btn btn-success w-100">Save</button>
                            </form>
                            <hr />
                            <div className="list-group">
                                {classes.length > 0 ? (
                                    classes.map((classItem) => (
                                        <div key={classItem.class} className="list-group-item d-flex justify-content-between align-items-center">
                                            <span>{classItem.class}</span>
                                            <button
                                                className="btn btn-outline-danger btn-sm"
                                                onClick={() => deleteClass(classItem._id)}
                                                disabled={!canEdit}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <p>No classes available</p>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
