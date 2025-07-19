import axios from "axios";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Classes() {

    const navigate = useNavigate();
    const [uploading, setUploading] = useState(false);
    const [canEdit, setCanEdit] = useState(false);
    const [canNoDeleteEdit, setCanNoDeleteEdit] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("token");
        const storedUserType = localStorage.getItem("userType");

        if (!token || !storedUserType) {
            navigate("/login");
        } else {
            if (storedUserType === "admin") {
                setCanEdit(true);
            }

            if (storedUserType === "qp-editor") {
                setCanNoDeleteEdit(true);
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
    const showMessage = (msg) => {
        setMessage(msg);
        setTimeout(() => setMessage(""), 5000);
    };

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

    useEffect(() => {
        fetchClassesAndSubjects();
    }, []);

    const handleClassClick = (classId) => {
        setSelectedClass(classId);
        setShowAllSubjects(false);

        const classData = classSubjectsData.find((item) => item.classId === classId);

        if (!classData) {
            setFilteredSubjects([]); // or setShowAllSubjects(true) if fallback needed
            return;
        }

        const resolvedSubjects = subjects.filter((subj) =>
            classData.subjectIds.includes(subj._id)
        );
        setFilteredSubjects(resolvedSubjects);
    };

    const handleSubjectsClick = () => {
        setSelectedClass(null);
        setShowAllSubjects(true);
    };

    const handleAddNewSubject = async (e) => {
        e.preventDefault();
        setUploading(true); // Start uploading

        try {
            const response = await axios.post("https://sss-server-eosin.vercel.app/AddNewSubject", { subjectName });
            const newSubject = response.data.subject;

            if (newSubject && newSubject.name) {
                setSubjects([...subjects, newSubject]);
                showMessage("Subject added successfully!");
                setSubjectName("");
            } else {
                showMessage("Invalid subject data received.");
                console.error("Invalid subject:", response.data);
            }
        } catch (error) {
            console.error("Error adding subject:", error);
            showMessage("Error adding subject. Please try again.");
        } finally {
            setUploading(false); // Stop uploading
        }
    };

    const handleDeleteSubject = async (subjectId) => {
        const confirmDelete = window.confirm("Are you sure you want to delete this subject?");
        if (!confirmDelete) return;

        setUploading(true); // Start uploading

        try {
            await axios.delete(`https://sss-server-eosin.vercel.app/deleteSubject/${subjectId}`);
            setSubjects(subjects.filter((subject) => subject._id !== subjectId));
            showMessage("Subject deleted successfully!");
        } catch (error) {
            console.error("Error deleting subject:", error);
            showMessage("Failed to delete subject.");
        } finally {
            setUploading(false); // Stop uploading
        }
    };

    const [newSelectedSubjects, setNewSelectedSubjects] = useState([]);
    const handleCheckboxChange = (subjectId) => {
        setNewSelectedSubjects((prev) =>
            prev.includes(subjectId)
                ? prev.filter((id) => id !== subjectId)
                : [...prev, subjectId]
        );
    };

    const handleAddSubjectToClass = async (e) => {
        e.preventDefault();

        if (!selectedClass) {
            showMessage("Please select a class.");
            return;
        }

        if (newSelectedSubjects.length === 0) {
            showMessage("Please select at least one subject.");
            return;
        }

        setUploading(true); // Start loading

        try {
            await axios.post("https://sss-server-eosin.vercel.app/ClassSubjectLink", {
                classId: selectedClass,
                subjectIds: newSelectedSubjects,
            });

            await fetchClassesAndSubjects();
            showMessage("Subject and Class linked successfully!");
        } catch (error) {
            console.error("Add subject error:", error.response?.data || error);
            showMessage(error.response?.data?.message || "Error adding subjects. Please try again.");
        } finally {
            setUploading(false); // Stop loading
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
            showMessage("Please select a class before adding exams.");
            return;
        }

        setUploading(true); // Start loading

        try {
            await axios.post('https://sss-server-eosin.vercel.app/addExams', {
                classId: selectedClass,
                numExams: examData.numExams,
                examNames: examData.examNames,
            });

            fetchExamsData(); // Refresh the exams list
            showMessage("Exams added successfully!");
        } catch (err) {
            console.error(err);
            showMessage("Error while saving exam data");
        } finally {
            setUploading(false); // Stop loading
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

    const handleChapterOpen = async (subject) => {
        setSelectedChapterSubject(subject);
        setChapterMessage("");
        setNewChapter("");
        setUploading(true); // Start loading

        try {
            const res = await axios.get("https://sss-server-eosin.vercel.app/chapters");

            const found = res.data.data.find(
                (item) =>
                    item.classId.toString() === selectedClass.toString() &&
                    item.subjectId.toString() === subject._id.toString()
            );

            setChapterList(found ? found.chapters : []);
        } catch (err) {
            console.error("Error fetching chapters:", err);
            setChapterList([]);
        } finally {
            setUploading(false); // Stop loading
        }
    };

    const [className, setClassName] = useState('');
    const handleAddNewClass = async (e) => {
        e.preventDefault();
        setUploading(true); // Start loading

        try {
            await axios.post('https://sss-server-eosin.vercel.app/AddNewClass', {
                className,
            });

            showMessage('Class added successfully!');
            setClassName('');
        } catch (error) {
            showMessage('Error adding class. Please try again.');
            console.error(error);
        } finally {
            setUploading(false); // Stop loading
        }
    };
    // Delete Classes
    const deleteClass = async (classId) => {
        setUploading(true); // Start loading

        try {
            await axios.delete(`https://sss-server-eosin.vercel.app/deleteClass/${classId}`);
            setClasses(classes.filter(cls => cls._id !== classId));
            showMessage("Class deleted successfully!");
        } catch (error) {
            console.error('Error deleting class:', error);
            showMessage("Error deleting class. Please try again.");
        } finally {
            setUploading(false); // Stop loading
        }
    };

    const [editChapterId, setEditChapterId] = useState(null);
    const [editChapterName, setEditChapterName] = useState("");

    const fetchChapters = async () => {
        try {
            const res = await axios.get(`https://sss-server-eosin.vercel.app/chapters/${selectedClass}/${selectedChapterSubject._id}`);
            setChapterList(res.data.chapters);
        } catch (err) {
            console.error("❌ Failed to fetch chapters:", err);
        }
    };

    const [editSubjectId, setEditSubjectId] = useState(null); // stores the ID of the subject being edited
    const [editedSubjectName, setEditedSubjectName] = useState(""); // stores new value during editing

    const handleSaveSubject = async (id) => {
        if (!editedSubjectName.trim()) return;

        setUploading(true); // Start loading

        try {
            await axios.put(`https://sss-server-eosin.vercel.app/updateSubject/${id}`, {
                name: editedSubjectName.trim(),
            });

            const updatedSubjects = subjects.map((s) =>
                s._id === id ? { ...s, name: editedSubjectName.trim() } : s
            );
            setSubjects(updatedSubjects);
            setEditSubjectId(null);
            showMessage("Subject updated successfully!");
        } catch (error) {
            console.error("Error updating subject:", error);
            showMessage("Update failed || Error");
        } finally {
            setUploading(false); // Stop loading
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
                            <option key={cls._id} value={cls._id}>{cls.class}</option>

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
                                        <option key={cls._id} value={cls._id}>
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
                                                                    checked={newSelectedSubjects.includes(subject._id)}
                                                                    onChange={() => handleCheckboxChange(subject._id)}
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
                                    <button
                                        type="submit"
                                        className="btn btn-success btn-sm"
                                        disabled={!(canEdit || canNoDeleteEdit) ||uploading}
                                    >
                                        {uploading ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                                Linking...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fa-solid fa-plus me-1"></i>
                                                Link Selected Subjects
                                            </>
                                        )}
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
                            Linked Subjects - {classes.find(cls => cls._id === selectedClass)?.class || "Unknown"}
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
                                            <td>{subject.name}</td>
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
                                <h5 className="card-title mb-3">📘 Exams Linked to <strong>{classes.find(cls => cls._id === selectedClass)?.class || "Unknown"}</strong></h5>

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
                                                Add Exams to {classes.find(cls => cls._id === selectedClass)?.class || "Unknown"}
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
                                            <button
                                                type="submit"
                                                className="btn btn-primary"
                                                disabled={!canEdit || uploading}
                                            >
                                                {uploading ? (
                                                    <>
                                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                        Saving...
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="fa-solid fa-check me-2"></i>Save Exams
                                                    </>
                                                )}
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
                                <button
                                    type="submit"
                                    className="btn btn-success btn-sm"
                                    disabled={!canEdit || uploading}
                                >
                                    {uploading ? (
                                        <>
                                            <span
                                                className="spinner-border spinner-border-sm me-2"
                                                role="status"
                                                aria-hidden="true"
                                            ></span>
                                            Adding...
                                        </>
                                    ) : (
                                        "Add Subject"
                                    )}
                                </button>
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
                                            <td>
                                                {editSubjectId === subject._id ? (
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        value={editedSubjectName}
                                                        onChange={(e) => setEditedSubjectName(e.target.value)}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    subject.name
                                                )}
                                            </td>
                                            <td className="d-flex gap-2">
                                                {editSubjectId === subject._id ? (
                                                    <>
                                                        <button
                                                            className="btn btn-success btn-sm"
                                                            onClick={() => handleSaveSubject(subject._id)}
                                                            disabled={uploading}
                                                        >
                                                            {uploading ? (
                                                                <>
                                                                    <span
                                                                        className="spinner-border spinner-border-sm me-2"
                                                                        role="status"
                                                                        aria-hidden="true"
                                                                    ></span>
                                                                    Saving...
                                                                </>
                                                            ) : (
                                                                "Save"
                                                            )}
                                                        </button>
                                                        <button
                                                            className="btn btn-secondary btn-sm"
                                                            onClick={() => setEditSubjectId(null)}
                                                        >
                                                            Cancel
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            className="btn btn-outline-primary btn-sm"
                                                            onClick={() => {
                                                                setEditSubjectId(subject._id);
                                                                setEditedSubjectName(subject.name);
                                                            }}
                                                            disabled={!(canEdit || canNoDeleteEdit)}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            className="btn btn-outline-danger btn-sm"
                                                            onClick={() => handleDeleteSubject(subject._id)}
                                                            disabled={!canEdit || uploading}
                                                        >
                                                            {uploading ? (
                                                                <>
                                                                    <span
                                                                        className="spinner-border spinner-border-sm me-2"
                                                                        role="status"
                                                                        aria-hidden="true"
                                                                    ></span>
                                                                    Deleting...
                                                                </>
                                                            ) : (
                                                                "Delete"
                                                            )}
                                                        </button>
                                                    </>
                                                )}
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
                <div className="modal-dialog modal-xl modal-dialog-scrollable">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title" id="chapterModalLabel">
                                Chapters for {selectedChapterSubject?.name || "Unknown"} (Class {classes.find(c => c._id === selectedClass)?.class || "Unknown"})
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

                                    setUploading(true);
                                    try {
                                        await axios.post("https://sss-server-eosin.vercel.app/chapters", {
                                            classId: selectedClass,
                                            subjectId: selectedChapterSubject._id,
                                            chapters: [...chapterList, { name: newChapter }],
                                        });

                                        await fetchChapters();

                                        setNewChapter("");
                                        setChapterMessage("Chapter added successfully!");
                                        showMessage("Chapter added successfully!");
                                    } catch (err) {
                                        console.error(err);
                                        setChapterMessage("Failed to add chapter.");
                                    } finally {
                                        setUploading(false);
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
                                    <button type="submit" className="btn btn-success" disabled={!(canEdit || canNoDeleteEdit) || uploading}>
                                        {uploading ? (
                                            <>
                                                <span
                                                    className="spinner-border spinner-border-sm me-2"
                                                    role="status"
                                                    aria-hidden="true"
                                                ></span>
                                                Adding...
                                            </>
                                        ) : (
                                            "Add"
                                        )}
                                    </button>
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
                                                <td>
                                                    {editChapterId === ch._id ? (
                                                        <input
                                                            type="text"
                                                            className="form-control form-control-sm"
                                                            value={editChapterName}
                                                            onChange={(e) => setEditChapterName(e.target.value)}
                                                        />
                                                    ) : (
                                                        ch.name
                                                    )}
                                                </td>
                                                <td className="d-flex gap-1">
                                                    {editChapterId === ch._id ? (
                                                        <>
                                                            <button
                                                                className="btn btn-success btn-sm"
                                                                onClick={async () => {
                                                                    if (uploading) return; // Prevent double click
                                                                    setUploading(true);

                                                                    try {
                                                                        if (!ch?._id) {
                                                                            console.error("❌ Chapter ID missing!", ch);
                                                                            showMessage("Chapter cannot be edited because ID is missing. || Error");
                                                                            return;
                                                                        }

                                                                        await axios.put(
                                                                            `https://sss-server-eosin.vercel.app/chapters/${selectedClass?._id || selectedClass}/${selectedChapterSubject._id}/${ch._id}`,
                                                                            { newName: editChapterName }
                                                                        );

                                                                        await fetchChapters();
                                                                        setEditChapterId(null);
                                                                        setEditChapterName("");
                                                                        showMessage("Chapter Name updated!");
                                                                    } catch (err) {
                                                                        console.error("❌ Update failed:", err);
                                                                        showMessage("Chapter Name Error!");
                                                                    } finally {
                                                                        setUploading(false);
                                                                    }
                                                                }}
                                                                disabled={uploading}
                                                            >
                                                                {uploading ? (
                                                                    <>
                                                                        <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                                                        Saving...
                                                                    </>
                                                                ) : (
                                                                    "Save"
                                                                )}
                                                            </button>

                                                            <button
                                                                className="btn btn-secondary btn-sm"
                                                                onClick={() => {
                                                                    setEditChapterId(null);
                                                                    setEditChapterName("");
                                                                }}
                                                            >
                                                                Cancel
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button
                                                                className="btn btn-outline-primary btn-sm"
                                                                onClick={() => {
                                                                    setEditChapterId(ch._id);
                                                                    setEditChapterName(ch.name);
                                                                }}
                                                                disabled={!(canEdit || canNoDeleteEdit)}
                                                            >
                                                                Edit
                                                            </button>

                                                            <button
                                                                className="btn btn-outline-danger btn-sm"
                                                                onClick={async () => {
                                                                    if (uploading) return; // Prevent multiple clicks
                                                                    const confirmDelete = window.confirm(`Are you sure you want to delete "${ch.name}"?`);
                                                                    if (!confirmDelete) return;

                                                                    setUploading(true);
                                                                    try {
                                                                        await axios.delete(
                                                                            `https://sss-server-eosin.vercel.app/chapters/${selectedClass}/${selectedChapterSubject._id}/${ch._id}`
                                                                        );

                                                                        const updated = chapterList.filter((c) => c._id !== ch._id);
                                                                        setChapterList(updated);
                                                                        showMessage("Chapter Deleted!");
                                                                    } catch (err) {
                                                                        console.error("Failed to delete chapter:", err);
                                                                    } finally {
                                                                        setUploading(false);
                                                                    }
                                                                }}
                                                                disabled={!canEdit || uploading}
                                                            >
                                                                {uploading ? (
                                                                    <>
                                                                        <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                                                        Deleting...
                                                                    </>
                                                                ) : (
                                                                    "Delete"
                                                                )}
                                                            </button>
                                                        </>
                                                    )}
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
                                <button type="submit" className="btn btn-success w-100" disabled={!canEdit || uploading}>
                                    {uploading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                            Saving...
                                        </>
                                    ) : (
                                        "Save"
                                    )}
                                </button>
                            </form>
                            <hr />
                            <div className="list-group">
                                {classes.length > 0 ? (
                                    classes.map((classItem) => (
                                        <div key={classItem.class} className="list-group-item d-flex justify-content-between align-items-center">
                                            <span>{classItem.class}</span>
                                            <button
                                                className="btn btn-outline-danger btn-sm"
                                                onClick={async () => {
                                                    setUploading(true);
                                                    try {
                                                        await deleteClass(classItem._id);
                                                    } catch (err) {
                                                        console.error(err);
                                                    } finally {
                                                        setUploading(false);
                                                    }
                                                }}
                                                disabled
                                            >
                                                {uploading ? (
                                                    <>
                                                        <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                                        Deleting...
                                                    </>
                                                ) : (
                                                    "Delete"
                                                )}
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

            {message && (
                <div
                    className="position-fixed fade-in"
                    style={{
                        bottom: "20px",
                        right: "20px",
                        zIndex: 9999,
                        backgroundColor:
                            message.toLowerCase().includes("delete") || message.toLowerCase().includes("error")
                                ? "#f8d7da"
                                : message.toLowerCase().includes("success") || message.toLowerCase().includes("updated")
                                    ? "#d1e7dd"
                                    : message.toLowerCase().includes("please")
                                        ? "#fff3cd"
                                        : "#e2e3e5",
                        color:
                            message.toLowerCase().includes("delete") || message.toLowerCase().includes("error")
                                ? "#842029"
                                : message.toLowerCase().includes("success") || message.toLowerCase().includes("updated")
                                    ? "#0f5132"
                                    : message.toLowerCase().includes("please")
                                        ? "#664d03"
                                        : "#41464b",
                        padding: "12px 18px 18px",
                        borderRadius: "8px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                        fontWeight: "500",
                        maxWidth: "300px",
                        overflow: "hidden",
                    }}
                >
                    {message}

                    <div
                        className="progress-bar-animate mt-2"
                        style={{
                            height: "4px",
                            backgroundColor:
                                message.toLowerCase().includes("delete") || message.toLowerCase().includes("error")
                                    ? "#842029"
                                    : message.toLowerCase().includes("success") || message.toLowerCase().includes("updated")
                                        ? "#0f5132"
                                        : message.toLowerCase().includes("please")
                                            ? "#664d03"
                                            : "#41464b",
                        }}
                    />
                </div>
            )}

        </div>
    );
}
