import React, { useEffect, useState } from "react";
import axios from "axios";
import boy from "./Images/bussiness-man.png";

export default function Students() {
    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [selectedYear, setSelectedYear] = useState("");
    const [academicYears, setAcademicYears] = useState([]);
    const [selectedClass, setSelectedClass] = useState("");
    const [classes, setClasses] = useState([]);
    const [searchStudent, setSearchStudent] = useState("");
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [selectAllChecked, setSelectAllChecked] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const studentResponse = await axios.get("http://localhost:3001/getStudent");
                setStudents(studentResponse.data.students || []);

                const yearResponse = await axios.get("http://localhost:3001/GetAcademicYear");
                const sortedYears = (yearResponse.data.data || []).sort((a, b) => {
                    return parseInt(b.year.split("-")[0]) - parseInt(a.year.split("-")[0]);
                });

                setAcademicYears(sortedYears);
                if (sortedYears.length > 0) {
                    setSelectedYear(sortedYears[0].year);
                }

                const classResponse = await axios.get("http://localhost:3001/getClasses");
                const sortedClasses = (classResponse.data.classes || []).sort((a, b) =>
                    parseInt(a.class) - parseInt(b.class)
                );

                setClasses(sortedClasses);

            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };

        fetchData();
    }, []);


    // Filter students based on selected year, class, and search
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
        .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically by name


    // Handle individual student selection
    const handleSelectStudent = (id) => {
        setSelectedStudents((prevSelected) =>
            prevSelected.includes(id)
                ? prevSelected.filter((sid) => sid !== id)
                : [...prevSelected, id]
        );
    };

    // Handle "Select All" toggle
    const handleSelectAll = () => {
        if (selectAllChecked) {
            setSelectedStudents([]);
        } else {
            setSelectedStudents(filteredStudents.map((student) => student._id));
        }
        setSelectAllChecked(!selectAllChecked);
    };

    // Sync "Select All" checkbox with individual selections
    useEffect(() => {
        if (filteredStudents.length > 0) {
            setSelectAllChecked(filteredStudents.every((student) => selectedStudents.includes(student._id)));
        } else {
            setSelectAllChecked(false);
        }
    }, [selectedStudents, filteredStudents]);


    const [passToSelectedYear, setPassToSelectedYear] = useState("");
    const [passToSelectedClass, setPassToSelectedClass] = useState("");

    const handlePassStudents = async () => {
        if (!passToSelectedYear || !passToSelectedClass) {
            alert("Please select an academic year and class before proceeding.");
            return;
        }

        if (selectedStudents.length === 0) {
            alert("No students selected to pass.");
            return;
        }

        try {
            const response = await axios.post("http://localhost:3001/pass-students-to", {
                studentIds: selectedStudents,
                newAcademicYear: passToSelectedYear,
                newClass: passToSelectedClass,
            });

            if (response.status === 200) {
                alert("Students updated successfully!");
                setSelectedStudents([]); // Clear selected students
                setPassToSelectedYear(""); // Reset year
                setPassToSelectedClass(""); // Reset class
            } else {
                alert("Failed to update students.");
            }
        } catch (error) {
            console.error("Error passing students:", error);
            alert("An error occurred while updating students.");
        }
    };

    return (
        <div className="Students">
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

                {/* Select All Checkbox */}
                <div className="selectAll">
                    <input type="checkbox" checked={selectAllChecked} onChange={handleSelectAll} />
                    <label>Select All</label>
                </div>

                <button type="button" className=" btn btn-sm border" data-bs-toggle="modal" data-bs-target="#passtoModal"><i class="fa-solid fa-forward me-2 fa-lg"></i>Pass to</button>
            </div>

            {/* Student Cards */}
            <div className="student-grid">
                {filteredStudents.map((student, index) => (
                    <div className="student-card" style={{ animationDelay: `${index * 0.1}s` }}>
                        <div key={student._id} data-bs-toggle="modal" data-bs-target="#studentModal" onClick={() => setSelectedStudent(student)}>
                            <img src={student.image || boy} alt="..." />
                            <strong>{student.name}</strong>
                            <p>Age: {student.age}</p>
                            <p>Class: {student.academicYears.find(y => y.academicYear === selectedYear)?.class || "N/A"}</p>
                            <p>Year: {selectedYear}</p>
                        </div>
                        <input
                            type="checkbox"
                            className="select-checkbox"
                            checked={selectedStudents.includes(student._id)}
                            onChange={(e) => {
                                handleSelectStudent(student._id);
                            }}
                        />
                    </div>

                ))}
            </div>

            {/* Student Modal */}
            <div className="modal fade" id="studentModal" tabIndex="-1" aria-hidden="true">
                <div className="modal-dialog modal-xl">
                    <div className="modal-content">
                        {selectedStudent && (
                            <>
                                <div className="modal-header">
                                    <h5 className="modal-title">{selectedStudent.name}</h5>
                                    <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
                                </div>

                                <div className="modal-body">
                                    <div className="student-details d-flex justify-content-between">
                                        <div>
                                            <p><strong>Name:</strong> {selectedStudent.name}</p>
                                            <p><strong>DOB:</strong> {new Date(selectedStudent.dob).toLocaleDateString()}</p>
                                            <p><strong>Age:</strong> {selectedStudent.age}</p>

                                            {/* Additional Information */}
                                            {selectedStudent.additionalInfo.length > 0 && (
                                                <>
                                                    {selectedStudent.additionalInfo.map((info) => (
                                                        <p key={info._id}>
                                                            <strong>{info.key}:</strong> {info.value}
                                                        </p>
                                                    ))}
                                                </>
                                            )}
                                        </div>

                                        <img src={selectedStudent.image || "default.jpg"} alt={selectedStudent.name} className="student-img" />
                                    </div>

                                    {/* Academic History */}
                                    <table className="table table-striped table-bordered academic-table">
                                        <thead className="bg-thead">
                                            <tr>
                                                <th>Academic Year</th>
                                                <th>Class</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedStudent.academicYears.map((entry) => (
                                                <tr key={entry._id}>
                                                    <td>{entry.academicYear}</td>
                                                    <td>Class {entry.class}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    {/* Additional Information
                                    {selectedStudent.additionalInfo.length > 0 && (
                                        <>
                                            <table className="table table-bordered AdditionalTable">
                                                <tbody>
                                                    {selectedStudent.additionalInfo.map((info) => (
                                                        <tr key={info._id}>
                                                            <td><strong>{info.key}</strong></td>
                                                            <td>{info.value}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </>
                                    )} */}

                                    <div className="modal-footer">
                                        <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">
                                            Close
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Pass to Modal */}
            <div className="modal fade" id="passtoModal" tabIndex="-1" aria-labelledby="passtoModalLabel" aria-hidden="true">
                <div className="modal-dialog modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Pass Students To</h5>
                            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div className="modal-body">
                            <p><strong>Selected Year:</strong> {selectedYear}</p>
                            <p><strong>Selected Class:</strong> {selectedClass}</p>

                            <div className="mb-3">
                                <label htmlFor="newAcademicYear" className="form-label">Select New Academic Year</label>
                                <select id="newAcademicYear" className="form-control" value={passToSelectedYear} onChange={(e) => setPassToSelectedYear(e.target.value)} >
                                    <option value="">Select Year</option>
                                    {academicYears.map((year, index) => (
                                        <option key={index} value={year.year}>{year.year}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="mb-3">
                                <label htmlFor="newClass" className="form-label">Select New Class</label>
                                <select id="newClass" className="form-control" value={passToSelectedClass} onChange={(e) => setPassToSelectedClass(e.target.value)} >
                                    <option value="">Select Class</option>
                                    {classes.map((cls, idx) => (
                                        <option key={idx} value={cls.class}>{cls.class}</option>
                                    ))}
                                </select>
                            </div>

                            {selectedStudents.length > 0 ? (
                                <table className="table table-bordered mt-3">
                                    <thead className="table-dark">
                                        <tr>
                                            <th>Name</th>
                                            <th>Current Academic Year</th>
                                            <th>Current Class</th>
                                            <th>Selected Academic Year</th>
                                            <th>Selected Class</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {students
                                            .filter((student) => selectedStudents.includes(student._id))
                                            .map((student) => {
                                                // Get the latest academic year and class of the student
                                                const latestAcademicRecord = student.academicYears[student.academicYears.length - 1];

                                                return (
                                                    <tr key={student._id}>
                                                        <td>{student.name}</td>
                                                        <td>{latestAcademicRecord?.academicYear || "N/A"}</td>
                                                        <td>{latestAcademicRecord?.class || "N/A"}</td>
                                                        <td>{selectedYear}</td>
                                                        <td>{selectedClass}</td>
                                                    </tr>
                                                );
                                            })}
                                    </tbody>
                                </table>
                            ) : (
                                <p className="text-danger">No students selected.</p>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            <button type="button" className="btn btn-primary" onClick={handlePassStudents}>
                                Pass Students
                            </button>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
