import React, { useEffect, useRef, useState } from "react";
import api, { getStudents, getAcademicYears, getClasses, passStudentsTo, updateAcademicYearStatus, addStudent, dropAcademicYear, getAllMasters, updateStudent, getFieldDefinitions } from '../../API';
import boy from "../Images/bussiness-man.png";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { useReactToPrint } from "react-to-print";
import StudentDataPage from "../StudentDataPage/StudentDataPage";
import IdentityCard from "../IdentityCard/IdentityCard";
import DefaultStudentPDF from "../DefaultStudentPDF/DefaultStudentPDF";
import SearchFilterBar from "../Shared/SearchFilterBar";
import './Students.css';



export default function Students() {

    const navigate = useNavigate();
    const [canEdit, setCanEdit] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userType = localStorage.getItem('userType');

        if (!token || !userType) {
            navigate('/login');
            return;
        }

        if (userType === 'admin') {
            setCanEdit(true);
        }
    }, [navigate]);

    const [message, setMessage] = useState("");
    const showMessage = (msg) => {
        setMessage(msg);
        setTimeout(() => setMessage(""), 5000);
    };

    const [uploading, setUploading] = useState(false);

    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [selectedYear, setSelectedYear] = useState("");
    const [academicYears, setAcademicYears] = useState([]);
    const [selectedClass, setSelectedClass] = useState("");
    const [classes, setClasses] = useState([]);
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [selectAllChecked, setSelectAllChecked] = useState(false);
    const [personalInfoList, setpersonalInfoList] = useState([]);

    const fetchPersonalInformationList = async () => {
        try {
            const response = await api.get('/GetPersonalInformationList');
            setpersonalInfoList(response.data.data || []); // Default to an empty array if no data is returned
        } catch (error) {
            console.error('Error fetching personal information list:', error);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const studentResponse = await getStudents();
                const fieldsRes = await api.get("/GetPersonalInformationList");
                const fields = fieldsRes.data.data || [];

                const mapped = (studentResponse.data.students || []).map(s => {
                    const legacyStudent = {
                        ...s,
                        academicYears: (s.enrollments || []).map(e => ({
                            academicYear: e.academicYear?.name || e.academicYear?.toString() || "",
                            class: e.class,
                            status: e.status
                        }))
                    };

                    if (s.dynamicFields && Array.isArray(s.dynamicFields)) {
                        s.dynamicFields.forEach(df => {

                            const field = fields.find(
                                p => p._id === (df.fieldId?._id || df.fieldId)
                            );

                            const key = df.fieldId?.fieldKey || field?.fieldKey;

                            if (key) {
                                if (key === "admissionNo")
                                    legacyStudent.AdmissionNo = df.value;
                                else if (key === "freeStudent")
                                    legacyStudent.FreeStud = df.value;
                                else if (key === "caste")
                                    legacyStudent.Caste = df.value;
                                else if (key === "casteHindi")
                                    legacyStudent.CasteHindi = df.value;
                                else
                                    legacyStudent[key] = df.value;
                            }
                        });
                    }
                    return legacyStudent;
                });
                setStudents(mapped);

                const yearResponse = await getAcademicYears();
                const sortedYears = (yearResponse.data.data || []).sort((a, b) => {
                    const yearA = a.name || a.year || "";
                    const yearB = b.name || b.year || "";
                    return parseInt(yearB.split("-")[0] || 0) - parseInt(yearA.split("-")[0] || 0);
                });

                setAcademicYears(sortedYears);
                if (sortedYears.length > 0) {
                    setSelectedYear(sortedYears[0].name || sortedYears[0].year);
                }

                const classResponse = await getClasses();
                const sortedClasses = (classResponse.data.classes || []).sort((a, b) =>
                    parseInt(a.class) - parseInt(b.class)
                );

                setClasses(sortedClasses);
                if (sortedClasses.length > 0) {
                    setSelectedClass(sortedClasses[0].class);
                }

            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };

        fetchData();
        fetchPersonalInformationList();
    }, []);

    const [statusFilter, setStatusFilter] = useState("Active");

    const [filters, setFilters] = useState([]);
    const [selectedField, setSelectedField] = useState('');
    const [searchText, setSearchText] = useState('');
    const [globalSearch, setGlobalSearch] = useState('');

    // Final Filtered Students
    const filteredStudents = students.filter((student) => {
        // ✅ Real-time global search bar filter
        if (globalSearch.trim()) {
            const query = globalSearch.toLowerCase().trim();
            const matchesName = student.name?.toLowerCase().includes(query);
            const matchesAdmission = (student.AdmissionNo || '')?.toLowerCase().includes(query);
            const matchesClass = student.academicYears?.some(
                ay => ay.academicYear === selectedYear && (ay.class || '').toLowerCase().includes(query)
            );
            if (!matchesName && !matchesAdmission && !matchesClass) {
                return false;
            }
        }

        // ✅ Year + Class match in the same academicYear object
        const yearAndClassMatch =
            (selectedYear === "" && selectedClass === "") ||
            student.academicYears?.some(
                (year) =>
                    (selectedYear === "" || year.academicYear === selectedYear) &&
                    (selectedClass === "" || String(year.class) === String(selectedClass))
            );

        // ✅ Status match in selectedYear only
        const statusMatch =
            statusFilter === "" ||
            student.academicYears?.some(
                (year) =>
                    year.academicYear === selectedYear && year.status === statusFilter
            );

        if (!yearAndClassMatch || !statusMatch) return false;

        // ✅ Extra filters (like caste, gender, etc.)
        for (const { field, value } of filters) {
            let fieldValue = null;

            if (field.startsWith("Additional - ")) {
                const key = field.split(" - ")[1];
                const infoObj = student.additionalInfo?.find(
                    (info) => info.key === key
                );
                fieldValue = infoObj?.value;

            } else if (field.startsWith("Academic - ")) {
                const subField = field.split(" - ")[1];

                const selectedYearObj = student.academicYears?.find(
                    (year) => year.academicYear === selectedYear
                );
                fieldValue = selectedYearObj?.[subField];

            } else {
                fieldValue = student[field];
            }

            if (!fieldValue) return false;

            // Handle date range
            if (typeof value === "string" && value.includes(" to ")) {
                const [fromStr, toStr] = value.split(" to ");
                const fromDate = new Date(fromStr);
                const toDate = new Date(toStr);
                const actualDate = new Date(fieldValue);

                if (
                    isNaN(fromDate.getTime()) ||
                    isNaN(toDate.getTime()) ||
                    isNaN(actualDate.getTime()) ||
                    actualDate < fromDate ||
                    actualDate > toDate
                ) {
                    return false;
                }
            } else {
                // Normal string match
                if (typeof fieldValue === "string") {
                    const val = value.toLowerCase();
                    const actual = fieldValue.toLowerCase();

                    // Use exact match for known discrete fields
                    const exactMatchFields = ["gender", "status", "caste", "religion", "bloodGroup"];

                    const isExactField = field.startsWith("Academic - ")
                        ? exactMatchFields.includes(field.split(" - ")[1])
                        : exactMatchFields.includes(field);

                    if (isExactField) {
                        if (actual !== val) return false;
                    } else {
                        if (!actual.includes(val)) return false;
                    }
                }
            }
        }

        return true;
    }).sort((a, b) => (a.AdmissionNo || "").localeCompare(b.AdmissionNo || "", undefined, { numeric: true }));

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
            showMessage("Please select an academic year and class before proceeding.");
            return;
        }

        if (selectedStudents.length === 0) {
            showMessage("No students selected to pass.");
            return;
        }

        setUploading(true); // Start loading

        try {
            const response = await passStudentsTo({
                studentIds: selectedStudents,
                newAcademicYear: passToSelectedYear,
                newClass: passToSelectedClass,
            });

            if (response.status === 200) {
                showMessage("✅ Students updated successfully!");
                setSelectedStudents([]);
                setPassToSelectedYear("");
                setPassToSelectedClass("");
            } else {
                showMessage("❌ Failed to update students.");
            }
        } catch (error) {
            console.error("Error passing students:", error);
            showMessage("⚠️ An error occurred while updating students.");
        } finally {
            setUploading(false); // Stop loading
        }
    };

    const [isReAdmissionMode, setIsReAdmissionMode] = useState(false);

    useEffect(() => {
        const specialClasses = ["Nursery", "Class-1"];
        setIsReAdmissionMode(specialClasses.includes(passToSelectedClass));
    }, [passToSelectedClass]);

    const handleReAdmission = async () => {
        if (!passToSelectedYear || !passToSelectedClass) {
            showMessage("Please select an academic year and class before proceeding.");
            return;
        }

        if (selectedStudents.length === 0) {
            showMessage("No students selected for re-admission.");
            return;
        }

        setUploading(true); // Start loading

        try {
            const reAdmissionList = students.filter(student =>
                selectedStudents.includes(student._id)
            );

            for (const student of reAdmissionList) {
                // Step 1: Mark current academic year as "Passed"
                await updateAcademicYearStatus(student._id, { status: "Passed" });

                // Step 2: Prepare new student data
                const newStudent = {
                    ...student,
                    AdmissionNo: "Re-Admission",
                    previousStudentId: student._id,
                    oldAdmissionNo: student.AdmissionNo,
                    academicYears: [
                        {
                            academicYear: passToSelectedYear,
                            class: passToSelectedClass,
                            status: "Active"
                        }
                    ]
                };

                delete newStudent._id;
                delete newStudent.createdAt;
                delete newStudent.updatedAt;
                delete newStudent.__v;

                await addStudent(newStudent);
            }

            showMessage("✅ Re-admission completed successfully!");
            setSelectedStudents([]);
            setPassToSelectedYear("");
            setPassToSelectedClass("");
            document.getElementById("passtoModal").click();

        } catch (error) {
            console.error("Re-admission error:", error);
            showMessage("❌ An error occurred during re-admission.");
        } finally {
            setUploading(false); // End loading
        }
    };

    const [dropStatus, setDropStatus] = useState("");

    const handleDropStudents = async () => {
        if (selectedStudents.length === 0 || !selectedYear || !dropStatus) {
            showMessage("Please select students, academic year, and drop status.");
            return;
        }

        setUploading(true); // Start loading

        try {
            const response = await dropAcademicYear({
                studentIds: selectedStudents,
                academicYear: selectedYear,
                status: dropStatus
            });

            if (response.status === 200) {
                showMessage(`✅ Students marked as ${dropStatus} successfully.`);
                setDropStatus("");
                setSelectedStudents([]);
            } else {
                showMessage("Failed to update students.");
            }
        } catch (error) {
            console.error("❌ Error updating student status:", error);
            showMessage("An error occurred while updating students.");
        } finally {
            setUploading(false); // End loading
        }
    };

    const calculateAge = (dob) => {
        const birthDate = new Date(dob);
        const currentDate = new Date();
        let age = currentDate.getFullYear() - birthDate.getFullYear();
        const month = currentDate.getMonth();
        const day = currentDate.getDate();

        // Adjust if birthday hasn't occurred this year
        if (month < birthDate.getMonth() || (month === birthDate.getMonth() && day < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const [isGrid, setIsGrid] = useState(true);
    useEffect(() => {
        const savedView = localStorage.getItem('isGrid');
        if (savedView !== null) {
            setIsGrid(savedView === 'true');
        }
    }, []);

    const toggleButton = (button) => {
        const newValue = button === 'Grid';
        setIsGrid(newValue);
        localStorage.setItem('isGrid', newValue);
    };

    const [isEditMode, setIsEditMode] = useState(false);
    const [editStudentData, setEditStudentData] = useState(null);

    const uploadToImgBB = async (file) => {
        const formData = new FormData();
        formData.append("key", "8451f34223c6e62555eec9187d855f8f");
        formData.append("image", file);

        try {
            const res = await fetch("https://api.imgbb.com/1/upload", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();

            if (data.success && (data.data.display_url || data.data.url)) {
                return data.data.display_url || data.data.url;
            } else {
                console.error("❌ Upload failed response:", data);
                throw new Error("Image upload failed");
            }
        } catch (error) {
            console.error("❌ Error uploading image:", error);
            throw new Error("Image upload error");
        }
    };

    // eslint-disable-next-line
    const [latestId, setLatestId] = useState(null);
    const [latestMaster, setLatestMaster] = useState([]);

    useEffect(() => {
        getAllMasters()
            .then(res => {
                setLatestMaster(res.data);
            })
            .catch(err => console.error('Error fetching all masters:', err.message));
    }, [latestId]);

    const [selectedFields, setSelectedFields] = useState(["name", "dob", "academicYear", "class"]);
    const printRef = useRef(null);
    const identityRef = useRef(null);
    const defaultPDF = useRef(null);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: "Student_Data",
    });

    const handleIdentityPrint = useReactToPrint({
        contentRef: identityRef,
        documentTitle: "Identity_Cards",
    });

    const handleDeafultPDFPrint = useReactToPrint({
        contentRef: defaultPDF,
        documentTitle: "Student_Data",
    });

    const toggleField = (field) => {
        setSelectedFields((prev) =>
            prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
        );
    };

    const handleDownloadExcel = () => {
        const selectedData = students
            .filter((student) => selectedStudents.includes(student._id)).sort((a, b) => (a.AdmissionNo || "").localeCompare(b.AdmissionNo || "", undefined, { numeric: true }))
            .map((student) => {
                const row = {};

                const yearEntry = student.academicYears.find((y) => y.academicYear === selectedYear);

                selectedFields.forEach((field) => {
                    if (["academicYear", "class", "status"].includes(field)) {
                        if (field === "academicYear") row["Academic Year"] = yearEntry?.academicYear || "N/A";
                        if (field === "class") row["Class"] = yearEntry?.class || "N/A";
                        if (field === "status") row["Status"] = yearEntry?.status || "Active"; // fallback to Active
                    } else if (field.startsWith("additional_")) {
                        const key = field.replace("additional_", "");
                        const info = student.additionalInfo?.find((i) => i.key === key);
                        row[key] = info?.value || "";
                    } else {
                        row[field] = student[field] || "";
                    }
                });

                return row;
            });

        if (selectedData.length === 0) {
            showMessage("Please select at least one student.");
            return;
        }

        const worksheet = XLSX.utils.json_to_sheet(selectedData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
        XLSX.writeFile(workbook, "Student_Data.xlsx");
    };

    const handleDownloadSummaryExcel = () => {
        if (!students.length || !selectedYear) return;

        // Only include students active in the selected year
        const activeStudents = students.filter(s =>
            s.academicYears.some(y => y.academicYear === selectedYear && y.status === "Active")
        );

        // Debug: log students with missing/invalid gender or category
        activeStudents.forEach(s => {
            if (!["Male", "Female"].includes(s.gender)) {
                console.log("Invalid gender:", s.name, s.gender);
            }
            if (!["SC", "ST", "OBC", "General"].includes(s.category)) {
                console.log("Invalid category:", s.name, s.category);
            }
        });

        // Unique classes for selected year
        const classList = Array.from(
            new Set(
                activeStudents.flatMap(s =>
                    s.academicYears
                        .filter(y => y.academicYear === selectedYear && y.status === "Active")
                        .map(y => y.class)
                )
            )
        ).sort();

        const categories = ["SC", "ST", "OBC", "General", "Other"]; // Added Other for unexpected categories
        const summaryData = [];

        classList.forEach(cls => {
            const row = { Class: cls };

            categories.forEach(cat => {
                const males = activeStudents.filter(
                    s =>
                        s.gender === "Male" &&
                        (cat === "Other" ? !["SC", "ST", "OBC", "General"].includes(s.category) : s.category === cat) &&
                        s.academicYears.some(y => y.academicYear === selectedYear && y.class === cls && y.status === "Active")
                ).length;

                const females = activeStudents.filter(
                    s =>
                        s.gender === "Female" &&
                        (cat === "Other" ? !["SC", "ST", "OBC", "General"].includes(s.category) : s.category === cat) &&
                        s.academicYears.some(y => y.academicYear === selectedYear && y.class === cls && y.status === "Active")
                ).length;

                row[`${cat} M`] = males;
                row[`${cat} F`] = females;
                row[`${cat} Total`] = males + females;
            });

            // Total per class
            row["Total M"] = categories.reduce((sum, c) => sum + row[`${c} M`], 0);
            row["Total F"] = categories.reduce((sum, c) => sum + row[`${c} F`], 0);
            row["Total"] = row["Total M"] + row["Total F"];

            summaryData.push(row);
        });

        // Grand Total
        const grandTotal = { Class: "Grand Total" };
        categories.forEach(c => {
            grandTotal[`${c} M`] = summaryData.reduce((sum, r) => sum + r[`${c} M`], 0);
            grandTotal[`${c} F`] = summaryData.reduce((sum, r) => sum + r[`${c} F`], 0);
            grandTotal[`${c} Total`] = summaryData.reduce((sum, r) => sum + r[`${c} Total`], 0);
        });
        grandTotal["Total M"] = summaryData.reduce((sum, r) => sum + r["Total M"], 0);
        grandTotal["Total F"] = summaryData.reduce((sum, r) => sum + r["Total F"], 0);
        grandTotal["Total"] = summaryData.reduce((sum, r) => sum + r["Total"], 0);

        summaryData.push(grandTotal);

        // Create worksheet
        const worksheet = XLSX.utils.json_to_sheet(summaryData, { origin: 1 });

        // Add top header row
        XLSX.utils.sheet_add_aoa(worksheet, [[`Student Summary: ${selectedYear}`]], { origin: "A1" });

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Student Summary");
        XLSX.writeFile(workbook, `Student_Summary_${selectedYear}.xlsx`);
    };

    // Get previous student object from already fetched students
    const previousStudentData = students.find(
        stu => stu._id === selectedStudent?.previousStudentId
    );

    const predefinedOptions = {
        gender: ["Male", "Female"],
        category: ["General", "OBC", "SC", "ST", "EWS"],
        bloodGroup: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"],
        FreeStud: ["Yes", "No"],
        "Academic - status": ["Active", "Inactive"], // You can update this as per your actual statuses
    };

    return (
        <div className="Students">
            <SearchFilterBar
                selectedYear={selectedYear}
                setSelectedYear={setSelectedYear}
                selectedClass={selectedClass}
                setSelectedClass={setSelectedClass}
                classes={classes}
                academicYears={academicYears}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                personalInfoList={personalInfoList}
                selectedField={selectedField}
                setSelectedField={setSelectedField}
                searchText={searchText}
                setSearchText={setSearchText}
                filters={filters}
                setFilters={setFilters}
                filteredCount={filteredStudents.length}
            >
                {/* Select All Checkbox */}
                <div className="selectAll d-flex align-items-center me-2">
                    <input type="checkbox" className="form-check-input" id="selectAllCheckbox" checked={selectAllChecked} onChange={handleSelectAll} />
                    <label className="ms-1 small fw-bold text-dark cursor-pointer" htmlFor="selectAllCheckbox">Select All</label>
                </div>

                {/* Actions Dropdown */}
                <div className="dropdown">
                    <button className="btn btn-sm btn-outline-primary dropdown-toggle fw-bold" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                        Actions
                    </button>
                    <ul className="dropdown-menu">
                        <li>
                            <button className="dropdown-item" data-bs-toggle="modal" data-bs-target="#passtoModal">
                                <i className="fa-solid fa-forward me-2 fa-sm"></i>Pass Students
                            </button>
                        </li>
                        <li>
                            <button className="dropdown-item" data-bs-toggle="modal" data-bs-target="#dropStudentModal">
                                <i className="fa-solid fa-user-xmark me-2 fa-sm"></i>Drop Student
                            </button>
                        </li>
                        <li>
                            <button className="dropdown-item" onClick={handleIdentityPrint}>
                                <i className="fa-regular fa-id-card me-1"></i> Create ID Card
                            </button>
                        </li>
                    </ul>
                </div>

                {/* View Dropdown */}
                <div className="dropdown">
                    <button className="btn btn-sm btn-outline-secondary dropdown-toggle fw-bold" type="button" id="viewToggleDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                        <i className="fa-solid fa-eye me-1"></i>View
                    </button>
                    <ul className="dropdown-menu" aria-labelledby="viewToggleDropdown">
                        <li>
                            <button className="dropdown-item" onClick={() => toggleButton('Grid')}>
                                <i className="fa-solid fa-table-columns me-2 fa-sm"></i>Grid
                            </button>
                        </li>
                        <li>
                            <button className="dropdown-item" onClick={() => toggleButton('list')}>
                                <i className="fa-solid fa-list me-2 fa-sm"></i>List
                            </button>
                        </li>
                    </ul>
                </div>

                {/* Download Button */}
                <button type="button" className="btn btn-sm btn-outline-success fw-bold" data-bs-toggle="modal" data-bs-target="#downloadDataModal">
                    <i className="fa-solid fa-download me-1 fa-sm"></i>Download Sheets
                </button>
            </SearchFilterBar>

            <div className="d-flex">
                {filters.map((f, idx) => (
                    <span
                        key={idx}
                        className="badge bg-warning text-dark d-flex align-items-center me-2"
                        style={{ padding: '7px 10px', borderRadius: '10px', fontWeight: 'bold', width: 'fit-content' }}
                    >
                        {f.field}: {f.value}
                        <button
                            type="button"
                            className="btn-close btn-close-sm ms-2"
                            onClick={() =>
                                setFilters(filters.filter((_, i) => i !== idx))
                            }
                        />
                    </span>
                ))}
            </div>

            {/* Student Cards */}
            {
                isGrid ?
                    <div className="student-grid">
                        {filteredStudents.map((student, index) => (
                            <div className="student-card" key={index} style={{ animationDelay: `${index * 0.1}s` }}>
                                <div className="student-info" key={student._id} data-bs-toggle="modal" data-bs-target="#studentModal" onClick={() => setSelectedStudent(student)}>
                                    <img src={student.image || boy} alt="..." />
                                    <strong>{student.name}</strong>
                                    <p>Age: {calculateAge(student.dob)}</p>
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
                    :
                    <div className="students-list">
                        {filteredStudents.map((student, index) => (
                            <div className="student-list" style={{ animationDelay: `${index * 0.1}s` }}>
                                <input
                                    type="checkbox"
                                    className="select-checkbox"
                                    checked={selectedStudents.includes(student._id)}
                                    onChange={(e) => {
                                        handleSelectStudent(student._id);
                                    }}
                                />
                                <div className="student-list-view" key={student._id} data-bs-toggle="modal" data-bs-target="#studentModal" onClick={() => setSelectedStudent(student)}>
                                    <img src={student.image || boy} alt="..." />
                                    <strong>{student.name}</strong>
                                    <div style={{ width: '200px' }}><label>Admission No:</label> {student.AdmissionNo}</div>
                                    <div><label>Age:</label> {calculateAge(student.dob)}</div>
                                    <div style={{ width: '100px' }}><label>Class:</label> {student.academicYears.find(y => y.academicYear === selectedYear)?.class || "N/A"}</div>
                                    <div>Year: {selectedYear}</div>
                                </div>
                            </div>
                        ))}
                    </div>
            }

            {/* Student Modal */}
            <div className="modal fade" id="studentModal" tabIndex="-1" aria-hidden="true">
                <div className="modal-dialog modal-xl modal-dialog-scrollable">
                    <div className="modal-content">
                        {selectedStudent && (
                            <>
                                <div className="modal-header">
                                    <h5 className="modal-title">{selectedStudent.name}</h5>
                                    <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
                                </div>

                                <div className="modal-body">
                                    <div className="w-100 d-flex justify-content-end">
                                        <button className="btn btn-sm btn-warning mb-2" onClick={() => {
                                            setIsEditMode(!isEditMode);
                                            setEditStudentData({ ...selectedStudent });
                                        }}
                                            disabled={!canEdit}
                                        >
                                            {isEditMode ? "Cancel" : "Edit"}
                                        </button>
                                    </div>
                                    <div className="student-profile-container">
                                        {/* Top Banner Row */}
                                        <div className="student-profile-header d-flex justify-content-between align-items-center mb-4 p-4 rounded-3 bg-light border">
                                            <div className="d-flex flex-column gap-1">
                                                <span className="small text-muted text-uppercase fw-bold tracking-wider">Student Profile</span>
                                                {isEditMode ? (
                                                    <div className="mb-2">
                                                        <label className="small text-muted fw-semibold d-block mb-1">Full Name</label>
                                                        <input className="form-control" value={editStudentData.name || ''} onChange={(e) => setEditStudentData(prev => ({ ...prev, name: e.target.value }))} />
                                                    </div>
                                                ) : (
                                                    <h2 className="fw-extrabold mb-0 text-slate-900" style={{ fontSize: '2rem', letterSpacing: '-0.03em' }}>{selectedStudent.name}</h2>
                                                )}

                                                <div className="d-flex align-items-center gap-3 mt-1">
                                                    <span className="badge bg-primary px-3 py-2 fs-6 rounded-pill">
                                                        <i className="fas fa-id-badge me-1"></i>
                                                        {selectedStudent.AdmissionNo || 'No Admission No'}
                                                    </span>
                                                    {selectedStudent.dob && (
                                                        <span className="text-secondary fw-semibold">
                                                            <i className="fas fa-birthday-cake me-1 text-danger"></i>
                                                            {calculateAge(selectedStudent.dob)} Years Old
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Profile image container on the right of header */}
                                            <div className="d-flex flex-column align-items-end gap-2">
                                                <img
                                                    src={isEditMode ? editStudentData.image || "default.jpg" : selectedStudent.image || "default.jpg"}
                                                    alt={selectedStudent.name}
                                                    className="student-avatar-img"
                                                />
                                                {isEditMode && (
                                                    <input
                                                        type="file"
                                                        className="form-control form-control-sm"
                                                        id="imageUpload"
                                                        accept="image/*"
                                                        onChange={async (e) => {
                                                            const file = e.target.files[0];
                                                            if (file) {
                                                                try {
                                                                    const imageUrl = await uploadToImgBB(file);
                                                                    setEditStudentData((prev) => ({ ...prev, image: imageUrl }));
                                                                } catch (err) {
                                                                    showMessage("Image upload failed");
                                                                    console.error(err);
                                                                }
                                                            }
                                                        }}
                                                        required
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        {/* Attribute Information Grid */}
                                        <div className="student-attribute-grid p-4 rounded-3 border">
                                            <h5 className="fw-bold mb-3 border-bottom pb-2 text-slate-800">
                                                <i className="fas fa-info-circle text-primary me-2"></i>Registration Details
                                            </h5>
                                            <div className="row g-0 border-top border-start">
                                                {personalInfoList
                                                    .filter(f => f.fieldKey !== 'admissionNo') // Exclude admissionNo as it is in header
                                                    .sort((a, b) => (a.sno || 99) - (b.sno || 99))
                                                    .map((info, idx) => {
                                                        const key = info.fieldKey;
                                                        const label = info.fieldName;

                                                        // Resolve display value from flat fields
                                                        let displayValue = '';
                                                        if (key === 'freeStudent') displayValue = selectedStudent.FreeStud;
                                                        else if (key === 'caste') displayValue = selectedStudent.Caste;
                                                        else if (key === 'casteHindi') displayValue = selectedStudent.CasteHindi;
                                                        else displayValue = selectedStudent[key];

                                                        if (!displayValue && selectedStudent.additionalInfo) {
                                                            displayValue = selectedStudent.additionalInfo.find(i => i.key === label)?.value || '';
                                                        }

                                                        // Date formatting for UI display
                                                        if (info.fieldType === 'date' && displayValue) {
                                                            try {
                                                                displayValue = new Date(displayValue).toLocaleDateString();
                                                            } catch (e) { }
                                                        }

                                                        return (
                                                            <div className="col-md-6 p-3 border-end border-bottom student-grid-cell" key={info._id || idx}>
                                                                <span className="student-grid-label">{label}</span>
                                                                <div className="student-grid-val-wrapper mt-1">
                                                                    {isEditMode ? (
                                                                        info.fieldType === 'select' ? (
                                                                            <select
                                                                                className="form-select form-select-sm"
                                                                                value={
                                                                                    key === 'freeStudent' ? (editStudentData.FreeStud || '') :
                                                                                        key === 'caste' ? (editStudentData.Caste || '') :
                                                                                            key === 'casteHindi' ? (editStudentData.CasteHindi || '') :
                                                                                                (editStudentData[key] || '')
                                                                                }
                                                                                onChange={(e) => {
                                                                                    const val = e.target.value;
                                                                                    setEditStudentData(prev => {
                                                                                        const updated = { ...prev };
                                                                                        if (key === 'freeStudent') updated.FreeStud = val;
                                                                                        else if (key === 'caste') updated.Caste = val;
                                                                                        else if (key === 'casteHindi') updated.CasteHindi = val;
                                                                                        else updated[key] = val;
                                                                                        return updated;
                                                                                    });
                                                                                }}
                                                                            >
                                                                                <option value="">Select</option>
                                                                                {(info.options || []).map((opt, oIdx) => (
                                                                                    <option key={oIdx} value={opt}>{opt}</option>
                                                                                ))}
                                                                            </select>
                                                                        ) : (
                                                                            <input
                                                                                type={info.fieldType === 'number' ? 'number' : info.fieldType === 'date' ? 'date' : 'text'}
                                                                                className="form-control form-control-sm"
                                                                                value={
                                                                                    key === 'freeStudent' ? (editStudentData.FreeStud || '') :
                                                                                        key === 'caste' ? (editStudentData.Caste || '') :
                                                                                            key === 'casteHindi' ? (editStudentData.CasteHindi || '') :
                                                                                                (editStudentData[key] || '')
                                                                                }
                                                                                onChange={(e) => {
                                                                                    const val = e.target.value;
                                                                                    setEditStudentData(prev => {
                                                                                        const updated = { ...prev };
                                                                                        if (key === 'freeStudent') updated.FreeStud = val;
                                                                                        else if (key === 'caste') updated.Caste = val;
                                                                                        else if (key === 'casteHindi') updated.CasteHindi = val;
                                                                                        else updated[key] = val;
                                                                                        return updated;
                                                                                    });
                                                                                }}
                                                                            />
                                                                        )
                                                                    ) : (
                                                                        <span className="student-grid-value">{displayValue || '—'}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        </div>
                                    </div>
                                           {/* Unified Academic & Enrollment History Section */}
                                 <div className="student-history-container mt-4 p-4 rounded-3 border">
                                     <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                                         <h5 className="fw-bold mb-0 text-slate-800">
                                             <i className="fas fa-history text-success me-2"></i>Academic & Enrollment History
                                         </h5>
                                         {selectedStudent?.previousStudentId && previousStudentData && (
                                             <button
                                                 className="btn btn-xs btn-premium btn-premium-primary"
                                                 data-bs-dismiss="modal"
                                                 data-bs-toggle="modal"
                                                 data-bs-target="#previousStudentModal"
                                             >
                                                 <i className="fas fa-external-link-alt me-1"></i>View Full Readmission Profile
                                             </button>
                                         )}
                                     </div>

                                     <div className="row g-3">
                                         {selectedStudent.academicYears.map((entry, index) => {
                                             let badgeColor = "bg-secondary text-white";
                                             switch (entry.status) {
                                                 case "Active":
                                                     badgeColor = "bg-success text-white";
                                                     break;
                                                 case "Passed":
                                                     badgeColor = "bg-primary text-white";
                                                     break;
                                                 case "Dropped":
                                                     badgeColor = "bg-danger text-white";
                                                     break;
                                                 case "TC-Issued":
                                                     badgeColor = "bg-warning text-dark";
                                                     break;
                                                 case "Failed":
                                                     badgeColor = "bg-danger text-white";
                                                     break;
                                                 default:
                                                     badgeColor = "bg-secondary text-white";
                                             }

                                             return (
                                                 <div key={index} className="col-sm-6 col-md-4 col-lg-3">
                                                     <div className="academic-session-card p-3 rounded-3 border d-flex flex-column gap-2 bg-light">
                                                         <span className="small text-muted fw-bold font-monospace"><i className="far fa-calendar-alt me-1"></i>{entry.academicYear}</span>
                                                         <div className="d-flex justify-content-between align-items-center mt-1">
                                                             <span className="fw-extrabold text-slate-900 fs-5">{entry.class}</span>
                                                             <span className={`badge ${badgeColor} px-2 py-1 small rounded-pill`}>{entry.status || "N/A"}</span>
                                                         </div>
                                                     </div>
                                                 </div>
                                             );
                                         })}
                                     </div>
                                 </div>
                                </div>

                                <div className="modal-footer">
                                    {isEditMode && (
                                        <button
                                            className="btn btn-success"
                                            disabled={uploading}
                                            onClick={async () => {
                                                try {
                                                    setUploading(true);

                                                    // Pack flat fields back to EAV dynamicFields
                                                    const dynamicFields = personalInfoList.map(field => {
                                                        let val = '';
                                                        const key = field.fieldKey;
                                                        if (key === 'admissionNo') {
                                                            val = editStudentData.AdmissionNo;
                                                        } else if (key === 'freeStudent') {
                                                            val = editStudentData.FreeStud;
                                                        } else if (key === 'caste') {
                                                            val = editStudentData.Caste;
                                                        } else if (key === 'casteHindi') {
                                                            val = editStudentData.CasteHindi;
                                                        } else {
                                                            // Fallback to additionalInfo array or flat fieldKey property
                                                            const addInfoObj = editStudentData.additionalInfo?.find(i => i.key === field.fieldName);
                                                            val = addInfoObj ? addInfoObj.value : editStudentData[key];
                                                        }
                                                        return { fieldId: field._id, value: val !== undefined && val !== null ? String(val) : '' };
                                                    });

                                                    const payload = {
                                                        name: editStudentData.name,
                                                        image: editStudentData.image,
                                                        academicYearId: editStudentData.academicYearId,
                                                        dynamicFields
                                                    };

                                                    const response = await updateStudent(selectedStudent._id, payload);
                                                    if (response.status === 200) {
                                                        showMessage("Student updated successfully!");
                                                        setIsEditMode(false);

                                                        // Map response data back to flat format for local state
                                                        const updatedStudent = {
                                                            ...response.data.data,
                                                            academicYears: (response.data.data.enrollments || []).map(e => ({
                                                                academicYear: e.academicYear?.name || e.academicYear?.toString() || "",
                                                                class: e.class,
                                                                status: e.status
                                                            }))
                                                        };
                                                        if (response.data.data.dynamicFields) {
                                                            response.data.data.dynamicFields.forEach(df => {
                                                                const field = personalInfoList.find(
                                                                    p => p._id === (df.fieldId?._id || df.fieldId)
                                                                );

                                                                const key = df.fieldId?.fieldKey || field?.fieldKey;
                                                                if (key) {
                                                                    if (key === 'admissionNo') updatedStudent.AdmissionNo = df.value;
                                                                    else if (key === 'freeStudent') updatedStudent.FreeStud = df.value;
                                                                    else if (key === 'caste') updatedStudent.Caste = df.value;
                                                                    else if (key === 'casteHindi') updatedStudent.CasteHindi = df.value;
                                                                    else updatedStudent[key] = df.value;
                                                                }
                                                            });
                                                        }

                                                        setSelectedStudent(updatedStudent);
                                                        const updatedList = students.map(s =>
                                                            s._id === selectedStudent._id ? updatedStudent : s
                                                        );
                                                        setStudents(updatedList);
                                                    }
                                                } catch (err) {
                                                    showMessage("Failed to update student");
                                                    console.error(err);
                                                } finally {
                                                    setUploading(false);
                                                }
                                            }}
                                        >
                                            {uploading ? "Editing..." : "Save Changes"}
                                        </button>
                                    )}

                                    <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">
                                        Close
                                    </button>
                                </div>


                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Previous Student Modal */}
            <div
                className="modal fade"
                id="previousStudentModal"
                tabIndex="-1"
                aria-labelledby="previousStudentModalLabel"
                aria-hidden="true"
            >
                <div className="modal-dialog modal-xl modal-dialog-scrollable">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title" id="previousStudentModalLabel">
                                {previousStudentData?.name || "Previous Student Information"}
                            </h5>
                            <button
                                type="button"
                                className="btn-close"
                                data-bs-dismiss="modal"
                                aria-label="Close"
                            ></button>
                        </div>

                        <div className="modal-body">
                            <div className="student-details d-flex justify-content-between align-items-start">
                                {/* Left: Details */}
                                <div className="w-75">
                                    <div className="row mb-2">
                                        <div className="col-md-6 p-2">
                                            <strong>Name:</strong> {previousStudentData?.name}
                                        </div>
                                        <div className="col-md-6 p-2">
                                            <strong>Name (Hindi):</strong> {previousStudentData?.nameHindi}
                                        </div>
                                    </div>

                                    <div className="row mb-2">
                                        <div className="col-md-6 p-2">
                                            <strong>DOB:</strong>{" "}
                                            {previousStudentData?.dob
                                                ? new Date(previousStudentData.dob).toLocaleDateString()
                                                : "N/A"}
                                        </div>
                                        <div className="col-md-6 p-2">
                                            <strong>DOB in Words:</strong> {previousStudentData?.dobInWords}
                                        </div>
                                    </div>

                                    <div className="row mb-2">
                                        <div className="col-md-6 p-2">
                                            <strong>Age:</strong>{" "}
                                            {previousStudentData?.dob
                                                ? calculateAge(previousStudentData?.dob)
                                                : "N/A"}
                                        </div>
                                        <div className="col-md-6 p-2">
                                            <strong>Gender:</strong> {previousStudentData?.gender}
                                        </div>
                                    </div>

                                    <div className="row mb-2">
                                        <div className="col-md-6 p-2">
                                            <strong>Aadhar No:</strong> {previousStudentData?.aadharNo}
                                        </div>
                                        <div className="col-md-6 p-2">
                                            <strong>Blood Group:</strong> {previousStudentData?.bloodGroup}
                                        </div>
                                    </div>

                                    <div className="row mb-2">
                                        <div className="col-md-6 p-2">
                                            <strong>Category:</strong> {previousStudentData?.category}
                                        </div>
                                        <div className="col-md-6 p-2">
                                            <strong>Admission No:</strong> {previousStudentData?.AdmissionNo}
                                        </div>
                                    </div>

                                    <div className="row mb-2">
                                        <div className="col-md-6 p-2">
                                            <strong>Caste:</strong> {previousStudentData?.Caste}
                                        </div>
                                        <div className="col-md-6 p-2">
                                            <strong>Caste (Hindi):</strong> {previousStudentData?.CasteHindi}
                                        </div>
                                    </div>

                                    <div className="row mb-2">
                                        <div className="col-md-6 p-2">
                                            <strong>Free Student:</strong> {previousStudentData?.FreeStud}
                                        </div>
                                    </div>

                                    {previousStudentData?.additionalInfo?.length > 0 && (
                                        <>
                                            <hr />
                                            <div className="row">
                                                {previousStudentData.additionalInfo.map((info, index) => (
                                                    <div className="col-md-6 mb-2 p-2" key={index}>
                                                        <strong>{info.key}:</strong> {info.value}
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Right: Image */}
                                <div className="ms-3">
                                    <img
                                        src={previousStudentData?.image || "default.jpg"}
                                        alt={previousStudentData?.name}
                                        className="student-img mb-2"
                                        style={{ width: "150px", height: "150px", objectFit: "cover", borderRadius: "5px" }}
                                    />
                                </div>
                            </div>

                            <hr />
                            <h6 className="mt-3">Academic History</h6>
                            <div className="table-responsive">
                                <table className="table table-bordered table-sm">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Academic Year</th>
                                            <th>Class</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previousStudentData?.academicYears?.length > 0 ? (
                                            previousStudentData.academicYears.map((entry, idx) => (
                                                <tr key={idx}>
                                                    <td>{entry.academicYear}</td>
                                                    <td>{entry.class}</td>
                                                    <td>{entry.status}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="3" className="text-center">
                                                    No academic history available.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pass to Modal */}
            <div className="modal fade" id="passtoModal" tabIndex="-1" aria-labelledby="passtoModalLabel" aria-hidden="true">
                <div className="modal-dialog modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">
                                {isReAdmissionMode ? "Re-Admission Students" : "Pass Students To"}
                            </h5>
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
                                        <option key={index} value={year.name || year.year}>{year.name || year.year}</option>
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
                                                        <td>{passToSelectedYear}</td>
                                                        <td>{passToSelectedClass}</td>
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
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={async () => {
                                    setUploading(true);
                                    const selectedStudentData = students.filter((student) =>
                                        selectedStudents.includes(student._id)
                                    );

                                    try {
                                        if (isReAdmissionMode) {
                                            await handleReAdmission(selectedStudentData);
                                        } else {
                                            await handlePassStudents();
                                        }
                                    } catch (err) {
                                        console.error(err);
                                    } finally {
                                        setUploading(false);
                                    }
                                }}
                                disabled={!canEdit || uploading}
                            >
                                {uploading
                                    ? isReAdmissionMode
                                        ? "Re-Admitting..."
                                        : "Passing..."
                                    : isReAdmissionMode
                                        ? "Re-Admission Students"
                                        : "Pass Students"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Drop Student Modal */}
            <div className="modal fade" id="dropStudentModal" tabIndex="-1" aria-labelledby="dropStudentModalLabel" aria-hidden="true">
                <div className="modal-dialog modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Drop Students from Academic Year</h5>
                            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div className="modal-body">
                            <p><strong>Academic Year to Drop:</strong> {selectedYear}</p>
                            <div className="mb-3">
                                <label htmlFor="dropStatus" className="form-label">Select Drop Status</label>
                                <select
                                    id="dropStatus"
                                    className="form-control"
                                    value={dropStatus}
                                    onChange={(e) => setDropStatus(e.target.value)}
                                >
                                    <option value="">Select Status</option>
                                    <option value="Dropped">Dropped</option>
                                    <option value="TC-Issued">TC-Issued</option>
                                    <option value="Failed">Failed</option>
                                </select>
                            </div>


                            {selectedStudents.length > 0 ? (
                                <table className="table table-bordered mt-3">
                                    <thead className="table-dark">
                                        <tr>
                                            <th>Name</th>
                                            <th>Academic Year</th>
                                            <th>Class</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {students
                                            .filter(student => selectedStudents.includes(student._id))
                                            .map(student => {
                                                const academicRecord = student.academicYears.find(y => y.academicYear === selectedYear);

                                                return (
                                                    <tr key={student._id}>
                                                        <td>{student.name}</td>
                                                        <td>{academicRecord?.academicYear || "N/A"}</td>
                                                        <td>{academicRecord?.class || "N/A"}</td>
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
                            <button
                                type="button"
                                className="btn btn-danger"
                                onClick={async () => {
                                    setUploading(true);
                                    try {
                                        await handleDropStudents();
                                    } catch (err) {
                                        console.error(err);
                                    } finally {
                                        setUploading(false);
                                    }
                                }}
                                disabled={!canEdit || uploading}
                            >
                                {uploading ? "Dropping..." : "Drop Selected Students"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Download Data */}
            <div className="modal fade" id="downloadDataModal" tabIndex="-1" aria-hidden="true">
                <div className="modal-dialog modal-lg modal-dialog-scrollable">
                    <div className="modal-content">
                        <div className="modal-header bg-primary text-white">
                            <h5 className="modal-title">Select Fields to Download</h5>
                            <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>

                        <div className="modal-body">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h6 className="m-0">Choose Fields</h6>
                                <button
                                    className="btn btn-sm btn-outline-primary"
                                    onClick={() => {
                                        const allKeys = [
                                            "name", "nameHindi", "dob", "dobInWords", "gender", "aadharNo",
                                            "bloodGroup", "category", "AdmissionNo", "Caste", "CasteHindi",
                                            "FreeStud", "academicYear", "class",
                                            ...Array.from(
                                                new Set(
                                                    students.flatMap((s) => s.additionalInfo || []).map((info) => `additional_${info.key}`)
                                                )
                                            ),
                                        ];
                                        const allSelected = allKeys.every((key) => selectedFields.includes(key));
                                        if (allSelected) {
                                            setSelectedFields([]);
                                        } else {
                                            setSelectedFields(allKeys);
                                        }
                                    }}
                                >
                                    {selectedFields.length ===
                                        (14 +
                                            Array.from(
                                                new Set(
                                                    students.flatMap((s) => s.additionalInfo || []).map((info) => info.key)
                                                )
                                            ).length)
                                        ? "Deselect All"
                                        : "Select All"}
                                </button>
                            </div>

                            {/* Default Fields */}
                            <div className="border rounded p-3 mb-3">
                                <h6 className="text-primary">Basic Student Fields</h6>
                                <div className="row">
                                    {[
                                        { key: "name", label: "Name" },
                                        { key: "nameHindi", label: "Name (Hindi)" },
                                        { key: "dob", label: "Date of Birth" },
                                        { key: "dobInWords", label: "DOB in Words" },
                                        { key: "gender", label: "Gender" },
                                        { key: "aadharNo", label: "Aadhar No" },
                                        { key: "bloodGroup", label: "Blood Group" },
                                        { key: "category", label: "Category" },
                                        { key: "AdmissionNo", label: "Admission No" },
                                        { key: "Caste", label: "Caste" },
                                        { key: "CasteHindi", label: "Caste (Hindi)" },
                                        { key: "FreeStud", label: "Free Student" },
                                        { key: "academicYear", label: "Academic Year" },
                                        { key: "class", label: "Class" },
                                        { key: "status", label: "Status" }
                                    ].map((field, index) => (
                                        <div className="col-md-4 col-sm-6 mb-2" key={index}>
                                            <div className="form-check">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    id={`field-${field.key}`}
                                                    checked={selectedFields.includes(field.key)}
                                                    onChange={() => toggleField(field.key)}
                                                />
                                                <label className="form-check-label" htmlFor={`field-${field.key}`}>
                                                    {field.label}
                                                </label>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Additional Info Fields */}
                            <div className="border rounded p-3">
                                <h6 className="text-primary">Additional Info Fields</h6>
                                <div className="row">
                                    {Array.from(
                                        new Set(
                                            students
                                                .flatMap((s) => s.additionalInfo || [])
                                                .map((info) => info.key)
                                        )
                                    ).map((key, index) => (
                                        <div className="col-md-4 col-sm-6 mb-2" key={`add-${index}`}>
                                            <div className="form-check">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    id={`field-additional-${key}`}
                                                    checked={selectedFields.includes(`additional_${key}`)}
                                                    onChange={() => toggleField(`additional_${key}`)}
                                                />
                                                <label className="form-check-label" htmlFor={`field-additional-${key}`}>
                                                    {key}
                                                </label>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-success" onClick={handleDownloadExcel} data-bs-dismiss="modal" disabled={!canEdit}>
                                Download Excel
                            </button>
                            <button className="btn btn-success" onClick={handleDownloadSummaryExcel}>
                                Download Student Summary
                            </button>
                            <button className="btn btn-primary" onClick={handlePrint} disabled={!canEdit}>
                                Download PDF
                            </button>
                            <button
                                className="btn btn-info"
                                onClick={() => {
                                    // Send all possible fields (basic + additional)
                                    const allFields = [
                                        "name",
                                        "nameHindi",
                                        "dob",
                                        "dobInWords",
                                        "gender",
                                        "aadharNo",
                                        "bloodGroup",
                                        "category",
                                        "AdmissionNo",
                                        "Caste",
                                        "CasteHindi",
                                        "FreeStud",
                                        "academicYear",
                                        "class",
                                        "status",
                                        "ADate",
                                        "AClass",
                                        "StudentID",
                                        "fatherName",
                                        "motherName",
                                        "fatherPhone",
                                        "address",
                                        "RollNo",
                                        "permanentAddress",
                                        "admissionDate",
                                        // Add all additionalInfo keys dynamically
                                        ...Array.from(
                                            new Set(
                                                students.flatMap((s) => s.additionalInfo || []).map((info) => `additional_${info.key}`)
                                            )
                                        )
                                    ];

                                    // Set selected fields to everything
                                    setSelectedFields(allFields);

                                    // Trigger print using the default PDF ref
                                    setTimeout(() => {
                                        handleDeafultPDFPrint();
                                    }, 100);
                                }}
                                disabled={!canEdit}
                            >
                                Download Default PDF
                            </button>

                            <button className="btn btn-secondary" data-bs-dismiss="modal">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: "none" }}>
                <StudentDataPage
                    ref={printRef}
                    selectedStudents={selectedStudents}
                    selectedFields={selectedFields}
                    students={students}
                    selectedYear={selectedYear}
                    latestMaster={latestMaster}
                />
            </div>

            <div style={{ display: 'none' }}>
                <IdentityCard
                    ref={identityRef}
                    selectedStudents={selectedStudents}
                    students={students}
                    selectedYear={selectedYear}
                    latestMaster={latestMaster}
                />
            </div>

            <div style={{ display: "none" }}>
                <DefaultStudentPDF
                    ref={defaultPDF}
                    selectedStudents={selectedStudents} // already filtered
                    students={students}
                    selectedYear={selectedYear}
                    latestMaster={latestMaster}
                />
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