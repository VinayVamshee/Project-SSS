import axios from "axios";
import React, { useEffect, useState } from "react";

export default function Classes() {
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
            setSubjects([...subjects, response.data.subject] || []);
            setMessage("Subject added successfully!");
            setSubjectName("");
        } catch (error) {
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


    return (
        <div className="ClassesPage">
            <div className="Classes">
                {classes.map((cls) => (
                    <div key={cls._id} className={`Class ${selectedClass === cls.class ? "active" : ""}`} onClick={() => handleClassClick(cls.class)}>
                        Class {cls.class}
                    </div>
                ))}
                <div className="SubjectsButton" onClick={handleSubjectsClick}>
                    <i className="fa-solid fa-book me-2"></i>Subjects
                </div>
            </div>

            {selectedClass && (
                <div className="Class-Subjects">
                    {filteredSubjects.length > 0 ? (
                        <table>
                            <thead>
                                <tr>
                                    <th>S.No</th>
                                    <th>Subject Name</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSubjects && filteredSubjects.length > 0 ? (
                                    filteredSubjects.map((subject, index) => (
                                        <tr key={index}>
                                            <td>{index + 1}</td>
                                            <td>{subject}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="2">No subjects available</td>
                                    </tr>
                                )}

                            </tbody>
                        </table>
                    ) : (
                        <p>No subjects linked to this class.</p>
                    )}
                    <br /><br />
                    <form onSubmit={handleAddSubjectToClass}>
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Subject Name</th>
                                    <th>Select</th>
                                </tr>
                            </thead>
                            <tbody>
                                {subjects.map((subject, index) => (
                                    <tr key={subject._id}>
                                        <td>{index + 1}</td>
                                        <td>{subject.name}</td>
                                        <td>
                                            <input
                                                type="checkbox"
                                                value={subject.name}
                                                checked={newSelectedSubjects.includes(subject.name)}
                                                onChange={() => handleCheckboxChange(subject.name)}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <button type="submit" className="btn btn-save btn-sm mt-2">Add Selected Subjects</button>
                    </form>
                    {message && <p className="text-center">{message}</p>}

                    {/* Show Exams for the Selected Class */}
                    {examsData.length > 0 ? (
                        <table className="mt-4">
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

                    {/* Form to Add Exams for Selected Class */}
                    <h5 className="mt-3">Add Exams to Class {selectedClass}</h5>
                    <form onSubmit={handleSubmitExam}>
                        <div className="mb-3">
                            <label htmlFor="numExams" className="form-label">Number of Exams</label>
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
                                <h5>Enter Exam Names</h5>
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

                        <button type="submit" className="btn btn-save btn-sm">Add Exams</button>
                    </form>

                    {message && <p className="text-center mt-2">{message}</p>}
                </div>
            )}


            {showAllSubjects && (
                <div className="Subjects">
                    <form onSubmit={handleAddNewSubject} style={{ marginBottom: "10px" }}>
                        <input
                            type="text"
                            placeholder="Enter new subject"
                            value={subjectName}
                            onChange={(e) => setSubjectName(e.target.value)}
                            required
                        />
                        <button type="submit" className="btn btn-sm">Add Subject</button>
                    </form>
                    {message && <p style={{ color: "green" }}>{message}</p>}

                    <table>
                        <thead>
                            <tr style={{ backgroundColor: "#f4f4f4" }}>
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
                                    <td><button className="btn btn-outline-danger btn-sm" onClick={() => handleDeleteSubject(subject._id)} >Delete </button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

        </div>
    );
}
