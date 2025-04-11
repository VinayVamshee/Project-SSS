import React, { useEffect, useState } from "react";
import axios from "axios";
import boy from "./Images/bussiness-man.png";
import { generatePDF } from "./ReportCard";
import { useNavigate } from "react-router-dom";

export default function Results() {

    const navigate = useNavigate();
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
        }
    }, [navigate]);    

    const [students, setStudents] = useState([]);
    const [selectedYear, setSelectedYear] = useState("");
    const [academicYears, setAcademicYears] = useState([]);
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState("");
    const [searchStudent, setSearchStudent] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const studentResponse = await axios.get("https://sss-server-eosin.vercel.app/getStudent");
                setStudents(studentResponse.data.students || []);

                const yearResponse = await axios.get("https://sss-server-eosin.vercel.app/GetAcademicYear");
                const sortedYears = (yearResponse.data.data || []).sort((a, b) =>
                    parseInt(b.year.split("-")[0]) - parseInt(a.year.split("-")[0])
                );

                setAcademicYears(sortedYears);
                if (sortedYears.length > 0) {
                    setSelectedYear(sortedYears[0].year);
                }

                const classResponse = await axios.get("https://sss-server-eosin.vercel.app/getClasses");
                const sortedClasses = classResponse.data.classes.sort((a, b) => Number(a.class) - Number(b.class));
                setClasses(sortedClasses || []);


            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };

        fetchData();
    }, []);

    const filteredStudents = students
        .filter((student) =>
            (
                (selectedYear === "" && selectedClass === "") ||
                student.academicYears.some((year) =>
                    (selectedYear === "" || year.academicYear === selectedYear) &&
                    (selectedClass === "" || String(year.class) === String(selectedClass))
                )
            ) &&
            (searchStudent === "" || student.name.toLowerCase().includes(searchStudent.toLowerCase()))
        )
        .sort((a, b) => a.name.localeCompare(b.name));

    const [StudentMarks, setStudentMarks] = useState(null);
    const [marksView, setMarksView] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const studentResponse = await axios.get("https://sss-server-eosin.vercel.app/getStudent");
                setStudents(studentResponse.data.students || []);

                const yearResponse = await axios.get("https://sss-server-eosin.vercel.app/GetAcademicYear");
                const sortedYears = (yearResponse.data.data || []).sort((a, b) =>
                    parseInt(b.year.split("-")[0]) - parseInt(a.year.split("-")[0])
                );
                setAcademicYears(sortedYears);
                if (sortedYears.length > 0) {
                    setSelectedYear(sortedYears[0].year);
                }

                const classResponse = await axios.get("https://sss-server-eosin.vercel.app/getClasses");
                const sortedClasses = classResponse.data.classes.sort((a, b) => Number(a.class) - Number(b.class));
                setClasses(sortedClasses || []);

            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };

        fetchData();
    }, []);

    const [examsData, setExamsData] = useState([]);

    const fetchExamsData = async () => {
        try {
            const response = await axios.get('https://sss-server-eosin.vercel.app/getExams');
            const sortedExams = response.data.exams.sort((a, b) => parseInt(a.class) - parseInt(b.class));
            setExamsData(sortedExams || []);

            const responseData = await axios.get("https://sss-server-eosin.vercel.app/class-subjects");
            setClassSubjectsData(responseData.data.data || []);
        } catch (error) {
            console.error('Error fetching exams data:', error);
        }
    };
    useEffect(() => {
        fetchExamsData();
    }, []);

    const [classSubjectsData, setClassSubjectsData] = useState([]);


    const handleViewMarks = async (student) => {
        setMarksView(student);
        try {
            const response = await axios.get(`https://sss-server-eosin.vercel.app/get-marks`, {
                params: { studentId: student._id, academicYear: selectedYear }
            });

            if (response.data.studentMarks) {
                setStudentMarks(response.data.studentMarks.marks);
            } else {
                setStudentMarks(null);
            }
        } catch (err) {
            console.error("Error fetching marks:", err);
        }
    };

    const [examsForMarksView, setExamsForMarksView] = useState(null);
    const [subjectsForMarksView, setSubjectsForMarksView] = useState([]);


    const handleAddMarksClick = (student) => {
        setMarksView(student);

        const studentAcademicYear = student.academicYears?.find(yr => yr.academicYear === selectedYear);
        if (!studentAcademicYear) return;

        const studentClass = studentAcademicYear.class;

        const classExams = examsData.find(exam => exam.class === studentClass);
        setExamsForMarksView(classExams || { examNames: [] });

        const classSubjects = classSubjectsData.find(entry => entry.className === studentClass);
        setSubjectsForMarksView(classSubjects?.subjectNames || []);
    };

    const handleMarksSubmit = (event) => {
        event.preventDefault();

        const formElements = event.target.elements;
        let marksData = {};

        // Loop through subjects
        subjectsForMarksView.forEach((subject) => {
            marksData[subject] = {};

            // Loop through exams
            examsForMarksView.examNames.forEach((examName) => {
                const inputName = `marks-${subject}-${examName}`;
                const marks = formElements[inputName]?.value;

                if (marks) {
                    marksData[subject][examName] = parseInt(marks, 10);
                }
            });
        });

        const studentClass = marksView.academicYears.find(year => year.academicYear === selectedYear)?.class;
        if (!studentClass) {
            console.error("Student class not found!");
            return;
        }

        const marksInfo = {
            studentId: marksView._id,
            name: marksView.name,
            class: studentClass,
            academicYear: selectedYear,
            marks: marksData,
        };

        submitMarksToDatabase(marksInfo);
    };

    const submitMarksToDatabase = (marksInfo) => {
        axios.post('https://sss-server-eosin.vercel.app/submit-marks', marksInfo)
            .then(response => {
                alert('Marks Added Successfully')
                setMarksView(null);
            })
            .catch(error => {
                console.error('Error submitting marks:', error.response?.data || error.message);
            });
    };

    return (
        <div className='ResultsPage'>
            <div className="SearchFilter">
                <div className="yearFilter">
                    <select className="form-select form-select-sm" value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)}>
                        <option value="">Select Academic Year</option>
                        <option value="">All</option>
                        {academicYears.length > 0 ? (
                            academicYears.map((year, index) => (
                                <option key={index} value={year.year}>
                                    {year.year}
                                </option>
                            ))
                        ) : (
                            <option disabled>No Academic Years Available</option>
                        )}
                    </select>
                </div>

                <div className="classFilter">
                    <select className="form-select form-select-sm" value={selectedClass} onChange={(event) => setSelectedClass(event.target.value)}>
                        <option value="">Select Class</option>
                        <option value="">All</option>
                        {classes.length > 0 ? (
                            classes.map((cls) => (
                                <option key={cls._id} value={cls.class}>
                                    {cls.class}
                                </option>
                            ))
                        ) : (
                            <option disabled>No Classes Available</option>
                        )}
                    </select>
                </div>

                <input type="text" placeholder="Search Student..." value={searchStudent} onChange={(e) => setSearchStudent(e.target.value)} className="SearchStudent" />
                <button class="btn" type="button" data-bs-toggle="collapse" data-bs-target="#Subject-Class-Marks-Collapse" aria-expanded="false" aria-controls="Subject-Class-Marks-Collapse">
                    Subject / Class / Marks
                </button>
            </div>

            <div class="collapse" id="Subject-Class-Marks-Collapse">
                <div class="card card-body">
                    Some placeholder content for the collapse component. This panel is hidden by default but revealed when the user activates the relevant trigger.
                </div>
            </div>

            <div className="Results">
                {
                    filteredStudents.map((element, idx) => {
                        const studentClass = element.academicYears.find(
                            (year) => year.academicYear === selectedYear)?.class || "N/A";

                        return (
                            <div>
                                <div className="Result" key={idx} style={{ animationDelay: `${idx * 0.15}s` }}>
                                    <div className="Name">
                                        <img src={element.image || boy} alt="..." />
                                        <strong>{element.name}</strong>
                                    </div>
                                    <div className="class">
                                        <strong>Class:</strong> {studentClass}
                                    </div>
                                    <button type="button" className="btn btn-paymentHistory dropdown-toggle" data-bs-toggle="collapse" data-bs-target={`#ViewMarksCollapse-${element._id}`} aria-expanded="false" aria-controls={`ViewMarksCollapse-${element._id}`} onClick={() => handleViewMarks(element)}>
                                        <i className="fa-solid fa-sheet-plastic fa-lg me-2"></i>View Marks
                                    </button>
                                    <button type="button" className="btn btn-paymentHistory" data-bs-toggle="modal" data-bs-target="#AddMarksModal" onClick={() => handleAddMarksClick(element)}><i class="fa-solid fa-pen-to-square fa-lg me-2"></i>Add/Edit Marks</button>
                                    <button type="button" className="btn btn-outline-success" onClick={() => {
                                            const studentClass = element.academicYears.find(year => year.academicYear === selectedYear)?.class || "N/A";
                                            const marksInfo = {
                                                studentId: element._id,
                                                name: element.name,
                                                class: studentClass,
                                                academicYear: selectedYear,
                                                marks: StudentMarks || {},
                                            };
                                            generatePDF(marksInfo);
                                        }}>
                                        <i class="fa-solid fa-file-pdf fa-lg me-2"></i>Download Report Card
                                    </button>

                                </div>

                                <div className="collapse my-2" id={`ViewMarksCollapse-${element._id}`}>
                                    <div className="card card-body">
                                        {marksView?._id === element._id && StudentMarks ? (
                                            <table className="table table-bordered text-center">
                                                <thead className="table-dark">
                                                    <tr>
                                                        <th>Subject</th>
                                                        {/* Extract unique exam names dynamically */}
                                                        {Object.keys(StudentMarks).length > 0 &&
                                                            [...new Set(Object.values(StudentMarks).flatMap(m => Object.keys(m)))].map((exam, examIndex) => (
                                                                <th key={examIndex}>{exam}</th>
                                                            ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {Object.keys(StudentMarks).map((subject, subIndex) => (
                                                        <tr key={subIndex}>
                                                            <td><strong>{subject}</strong></td>
                                                            {/* Display marks for each exam */}
                                                            {[...new Set(Object.values(StudentMarks).flatMap(m => Object.keys(m)))].map((exam, examIndex) => (
                                                                <td key={examIndex}>
                                                                    {StudentMarks[subject]?.[exam] !== undefined ? StudentMarks[subject][exam] : '-'}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        ) : (
                                            <p className="text-center">No marks available for this academic year.</p>
                                        )}
                                    </div>
                                </div>

                            </div>

                        )

                    })
                }
            </div>

            <div className="modal fade" id="AddMarksModal" tabIndex="-1" aria-labelledby="AddMarksModalLabel" aria-hidden="true">
                <div className="modal-dialog modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title" id="AddMarksModalLabel">
                                Add/Edit Marks for {marksView?.name || "Student"}
                            </h5>
                            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div className="modal-body">
                            {marksView ? (
                                subjectsForMarksView.length > 0 ? (
                                    <form onSubmit={handleMarksSubmit}>
                                        <table className="table table-bordered">
                                            <thead>
                                                <tr>
                                                    <th>Subject</th>
                                                    {examsForMarksView?.examNames?.map((examName, examIndex) => (
                                                        <th key={examIndex}>{examName}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {subjectsForMarksView.map((subject, subIndex) => (
                                                    <tr key={subIndex}>
                                                        <td><strong>{subject}</strong></td>
                                                        {examsForMarksView?.examNames?.map((examName, examIndex) => (
                                                            <td key={examIndex}>
                                                                <input
                                                                    type="number"
                                                                    id={`marks-${subject}-${examName}`}
                                                                    className="form-control"
                                                                    placeholder={`Marks for ${examName}`}
                                                                    min="0"
                                                                />
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <button type="submit" className="btn btn-success">Save Marks</button>
                                    </form>
                                ) : (
                                    <p>No subjects available for this class. <br /><strong>Select Academic Year.</strong></p>
                                )
                            ) : (
                                <p>Select a student to add/edit marks.</p>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>

        </div >
    )
}
