import React, { useEffect, useRef, useState } from "react";
import api, { getStudents, getAcademicYears, getClasses, passStudentsTo, updateAcademicYearStatus, addStudent, dropAcademicYear, getAllMasters, updateStudent } from '../../API';
import boy from "../Images/bussiness-man.png";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { useReactToPrint } from "react-to-print";
import StudentDataPage from "../StudentDataPage/StudentDataPage";
import IdentityCard from "../IdentityCard/IdentityCard";
import DefaultStudentPDF from "../DefaultStudentPDF/DefaultStudentPDF";
import SearchFilterBar from "../Shared/SearchFilterBar";
import './Students.css';
// Helper to safely extract a printable string from dynamic values (primitives or nested objects)
const getSafeStringValue = (val) => {
    if (!val) return '';
    if (typeof val === 'object') {
        return val.label || val.name || val.fieldName || JSON.stringify(val);
    }
    return String(val);
};

// Systematic templates defining sections, icons, and order of fields for student details by school ID
// NOTE: Fields listed here must match the fieldKey values from FieldRegistry (dynamic fields)
//       OR one of these special core-schema keys resolved in the sidebar:
//         admissionNumber, rollNumber, sectionId, academicStatus  (core enrollment schema fields)
const STUDENT_TEMPLATES = {
    // Vamshee Techno School
    '6a496928e7b5f329b94a0775': [
        {
            sectionName: "Academic Enrollment Profile",
            icon: "fa-graduation-cap",
            // Use core-schema keys: admissionNumber, rollNumber, sectionId, academicStatus
            fields: ["admissionNumber", "rollNumber", "sectionId", "academicStatus"]
        },
        {
            sectionName: "Personal Information",
            icon: "fa-user",
            fields: ["fullname", "namehindi", "gender", "dateofbirth", "dobinwords", "bloodgroup", "aadharno"]
        },
        {
            sectionName: "Contact & Family",
            icon: "fa-phone",
            fields: ["fathersname", "mothersname", "mobilenumber", "alternatemobile", "address"]
        },
        {
            sectionName: "Social & Caste Information",
            icon: "fa-users",
            fields: ["category", "caste", "castehindi", "freestudent", "religion", "mothertongue"]
        }
    ],
    // Default template (used for other schools or if not matched)
    'default': [
        {
            sectionName: "Academic Enrollment Profile",
            icon: "fa-graduation-cap",
            fields: ["admissionNumber", "rollNumber", "sectionId", "academicStatus"]
        },
        {
            sectionName: "Personal Details",
            icon: "fa-user",
            fields: ["fullname", "namehindi", "dateofbirth", "dobinwords", "gender", "bloodgroup", "aadharno"]
        },
        {
            sectionName: "Social & Category Details",
            icon: "fa-users",
            fields: ["category", "caste", "castehindi", "freestudent"]
        }
    ]
};

// Core enrollment schema fields that come directly from StudentEnrollment (not dynamicFields)
// These are resolved directly from the student object rather than from FieldRegistry
const CORE_ENROLLMENT_FIELD_LABELS = {
    admissionNumber: { label: 'Admission No', type: 'text' },
    rollNumber: { label: 'Roll Number', type: 'text' },
    sectionId: { label: 'Section', type: 'text' },
    academicStatus: { label: 'Academic Status', type: 'text' },
};

export default function Students() {

    const navigate = useNavigate();
    const [canEdit, setCanEdit] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userType = localStorage.getItem('userType');
        const isDev = localStorage.getItem('isDev') === 'true';

        if (!token) {
            navigate('/login');
            return;
        }

        if (isDev || userType === 'admin') {
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
    const [activeBatchAction, setActiveBatchAction] = useState(null); // 'promote' or 'drop'
    const [selectedYear, setSelectedYear] = useState("");
    const [academicYears, setAcademicYears] = useState([]);
    const [selectedClass, setSelectedClass] = useState("");
    const [classes, setClasses] = useState([]);
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [selectAllChecked, setSelectAllChecked] = useState(false);
    const [personalInfoList, setpersonalInfoList] = useState([]);

    const fetchPersonalInformationList = async () => {
        try {
            const response = await api.get('/api/metadata/fields');
            setpersonalInfoList(response.data.data || []); // Default to an empty array if no data is returned
        } catch (error) {
            console.error('Error fetching personal information list:', error);
        }
    };

    const fetchData = async (isInitial = false) => {
        try {
            const studentResponse = await getStudents();
            const fieldsRes = await api.get("/api/metadata/fields");
            const fields = fieldsRes.data.data || [];

            const mapped = (studentResponse.data.students || []).map(s => {
                const legacyStudent = {
                    ...s,
                    // Map the full academic history from all enrollments
                    academicYears: (s.enrollments || []).map(e => ({
                        enrollmentId: e.enrollmentId,
                        academicYear: e.academicYear?.name || e.academicYear?.toString() || '',
                        class: e.class || 'N/A',
                        section: e.section || '',
                        admissionNumber: e.admissionNumber || '',
                        rollNumber: e.rollNumber || '',
                        status: e.academicStatus || 'Active',
                    })),
                    // Surface core enrollment fields to top level for sidebar display
                    admissionNumber: s.admissionNumber || '',
                    rollNumber: s.rollNumber || '',
                    sectionId: s.sectionId || '',
                    academicStatus: s.academicStatus || 'Active',
                };

                if (s.dynamicFields && Array.isArray(s.dynamicFields)) {
                    s.dynamicFields.forEach(df => {
                        // Populated FieldRegistry uses .key (not .fieldKey)
                        const fieldKey = df.fieldId?.key;
                        const fallbackField = fields.find(
                            p => p._id === (df.fieldId?._id || df.fieldId)
                        );
                        const key = fieldKey || fallbackField?.key;
                        if (key) {
                            const lowerKey = key.toLowerCase();
                            if (lowerKey === 'admissionno' || lowerKey === 'admissionnumber') {
                                legacyStudent.AdmissionNo = df.value;
                                legacyStudent.admissionNo = df.value;
                            } else if (lowerKey === 'freestudent' || lowerKey === 'freestud') {
                                legacyStudent.FreeStud = df.value;
                                legacyStudent.freeStudent = df.value;
                            } else if (lowerKey === 'caste') {
                                legacyStudent.Caste = df.value;
                                legacyStudent.caste = df.value;
                            } else if (lowerKey === 'castehindi') {
                                legacyStudent.CasteHindi = df.value;
                                legacyStudent.casteHindi = df.value;
                            } else if (lowerKey === 'gender') {
                                legacyStudent.gender = df.value;
                            } else if (lowerKey === 'dateofbirth' || lowerKey === 'dob') {
                                legacyStudent.dob = df.value;
                            }
                            legacyStudent[lowerKey] = df.value;
                        }
                    });
                }

                // Admission number is a CORE schema field (s.admissionNumber).
                // If no dynamic field with key 'admissionno' overwrote the legacy aliases,
                // fall back to the core field so cards display correctly.
                if (!legacyStudent.AdmissionNo && legacyStudent.admissionNumber) {
                    legacyStudent.AdmissionNo = legacyStudent.admissionNumber;
                    legacyStudent.admissionNo = legacyStudent.admissionNumber;
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
            if (isInitial && sortedYears.length > 0) {
                setSelectedYear(sortedYears[0].name || sortedYears[0].year);
            }

            const classResponse = await getClasses();
            const sortedClasses = (classResponse.data.classes || []).sort((a, b) =>
                parseInt(a.class) - parseInt(b.class)
            );

            setClasses(sortedClasses);
            if (isInitial && sortedClasses.length > 0) {
                setSelectedClass(sortedClasses[0].class);
            }

        } catch (error) {
            console.error("Error fetching data:", error);
        }
    };

    useEffect(() => {
        fetchData(true);
        fetchPersonalInformationList();
    }, []);

    const [statusFilter, setStatusFilter] = useState("Active");

    const [filters, setFilters] = useState([]);
    const [selectedField, setSelectedField] = useState('');
    const [searchText, setSearchText] = useState('');
    // eslint-disable-next-line
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
                currentAcademicYear: selectedYear,
                newAcademicYear: passToSelectedYear,
                newClass: passToSelectedClass,
            });

            if (response.status === 200) {
                showMessage("✅ Students updated successfully!");
                setSelectedStudents([]);

                // Automatically update page filters to the new class and year
                setSelectedYear(passToSelectedYear);
                setSelectedClass(passToSelectedClass);

                setPassToSelectedYear("");
                setPassToSelectedClass("");

                // Close the sidebar
                setActiveBatchAction(null);

                // Refresh the list with the new filters
                fetchData();
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

            // Automatically update page filters to the new class and year
            setSelectedYear(passToSelectedYear);
            setSelectedClass(passToSelectedClass);

            setPassToSelectedYear("");
            setPassToSelectedClass("");

            // Close the sidebar
            setActiveBatchAction(null);

            // Refresh the list with the new filters
            fetchData();
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
                setActiveBatchAction(null);
                fetchData();
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
                {/* Select All Toggle Switch */}
                <div className="form-check form-switch selectAll d-flex align-items-center me-3" style={{ gap: '8px', paddingLeft: '2.5em' }}>
                    <input
                        type="checkbox"
                        className="form-check-input cursor-pointer"
                        role="switch"
                        id="selectAllCheckbox"
                        checked={selectAllChecked}
                        onChange={handleSelectAll}
                        style={{ height: '18px', width: '36px', margin: 0 }}
                    />
                    <label
                        className="form-check-label small fw-bold cursor-pointer mb-0"
                        htmlFor="selectAllCheckbox"
                        style={{ color: 'var(--text-color)', userSelect: 'none' }}
                    >
                        Select All
                    </label>
                </div>

                {/* Actions Dropdown */}
                <div className="dropdown">
                    <button className="btn btn-sm btn-outline-primary dropdown-toggle fw-bold" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                        Actions
                    </button>
                    <ul className="dropdown-menu">
                        <li>
                            <button className="dropdown-item" onClick={() => {
                                if (selectedStudents.length === 0) {
                                    showMessage("Please select one or more students first.");
                                    return;
                                }
                                setActiveBatchAction('promote');
                            }}>
                                <i className="fa-solid fa-forward me-2 fa-sm"></i>Pass Students
                            </button>
                        </li>
                        <li>
                            <button className="dropdown-item" onClick={() => {
                                if (selectedStudents.length === 0) {
                                    showMessage("Please select one or more students first.");
                                    return;
                                }
                                setActiveBatchAction('drop');
                            }}>
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
                            <div className="student-card" key={index} style={{ animationDelay: `${index * 0.05}s` }}>
                                <div className="student-info" key={student._id} onClick={() => setSelectedStudent(student)}>
                                    <img src={student.image || boy} alt="..." />
                                    <strong>{student.name}</strong>
                                    <p className="admission-no">Admission No: {student.AdmissionNo || student.admissionNo || "N/A"}</p>
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
                            <div className="student-list" key={index} style={{ animationDelay: `${index * 0.05}s` }}>
                                <input
                                    type="checkbox"
                                    className="select-checkbox"
                                    checked={selectedStudents.includes(student._id)}
                                    onChange={(e) => {
                                        handleSelectStudent(student._id);
                                    }}
                                />
                                <div className="student-list-view" key={student._id} onClick={() => setSelectedStudent(student)}>
                                    <img src={student.image || boy} alt="..." />
                                    <strong style={{ width: '220px' }}>{student.name}</strong>
                                    <div style={{ width: '200px' }}><label>Admission No:</label> {student.AdmissionNo || student.admissionNo || "N/A"}</div>
                                    <div style={{ width: '120px' }}><label>Age:</label> {calculateAge(student.dob)}</div>
                                    <div style={{ width: '120px' }}><label>Class:</label> {student.academicYears.find(y => y.academicYear === selectedYear)?.class || "N/A"}</div>
                                    <div>Year: {selectedYear}</div>
                                </div>
                            </div>
                        ))}
                    </div>
            }

            {/* Slide-out Student Sidebar */}
            <div className={`student-sidebar-backdrop ${selectedStudent ? 'show' : ''}`} onClick={() => { if (!uploading) setSelectedStudent(null); }} />
            <div className={`student-sidebar ${selectedStudent ? 'open' : ''}`}>
                {selectedStudent && (
                    <div className="sidebar-inner d-flex flex-column h-100">
                        <div className="sidebar-header d-flex justify-content-between align-items-center p-3 border-bottom bg-light">
                            <h5 className="fw-bold mb-0 text-slate-800"><i className="fas fa-user-circle text-primary me-2"></i>Student Details</h5>
                            <button type="button" className="btn-close" onClick={() => { setIsEditMode(false); setSelectedStudent(null); }} />
                        </div>

                        <div className="sidebar-body flex-grow-1 p-3 overflow-auto">
                            <div className="d-flex justify-content-end mb-2">
                                <button className="btn btn-sm btn-outline-warning" onClick={() => {
                                    setIsEditMode(!isEditMode);
                                    setEditStudentData({ ...selectedStudent });
                                }}
                                    disabled={!canEdit}
                                >
                                    {isEditMode ? "Cancel" : "Edit"}
                                </button>
                            </div>

                            <div className="student-profile-container">
                                <div className="student-profile-header d-flex justify-content-between align-items-center mb-3 p-3 rounded border">
                                    <div className="d-flex flex-column gap-1">
                                        <span className="small text-muted text-uppercase fw-bold">Student Profile</span>
                                        {isEditMode ? (
                                            <div className="mb-2">
                                                <label className="small text-muted fw-semibold d-block mb-1">Full Name</label>
                                                <input className="form-control form-control-sm" value={editStudentData.name || ''} onChange={(e) => setEditStudentData(prev => ({ ...prev, name: e.target.value }))} />
                                            </div>
                                        ) : (
                                            <h3 className="fw-bold mb-0">{selectedStudent.name}</h3>
                                        )}
                                        <div className="d-flex align-items-center gap-2 mt-1">
                                            <span className="badge bg-primary px-2 py-1 small rounded-pill">
                                                ID: {selectedStudent.AdmissionNo || selectedStudent.admissionNo || 'N/A'}
                                            </span>
                                            {selectedStudent.dob && (
                                                <span className="text-secondary small fw-semibold">
                                                    {calculateAge(selectedStudent.dob)} Years Old
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="d-flex flex-column align-items-end gap-1">
                                        <img
                                            src={isEditMode ? editStudentData.image || boy : selectedStudent.image || boy}
                                            alt={selectedStudent.name}
                                            className="student-avatar-img"
                                            style={{ width: '80px', height: '80px' }}
                                        />
                                        {isEditMode && (
                                            <input
                                                type="file"
                                                className="form-control form-control-sm"
                                                id="imageUpload"
                                                accept="image/*"
                                                style={{ maxWidth: '120px', fontSize: '10px' }}
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
                                            />
                                        )}
                                    </div>
                                </div>

                                {(() => {
                                    const currentSchoolId = localStorage.getItem('schoolId') || '';
                                    const activeTemplate = STUDENT_TEMPLATES[currentSchoolId] || STUDENT_TEMPLATES['default'];

                                    return activeTemplate.map((section, sIdx) => {
                                        // Build a unified list of field descriptors for this section:
                                        //   1) Core enrollment fields (admissionNumber, rollNumber, etc.)
                                        //   2) Dynamic FieldRegistry fields (matched by info.key)
                                        const sectionItems = [];

                                        section.fields.forEach(fKey => {
                                            const lowerFKey = fKey.toLowerCase();

                                            // Check if it's a core enrollment schema field
                                            if (CORE_ENROLLMENT_FIELD_LABELS[fKey]) {
                                                sectionItems.push({
                                                    type: 'core',
                                                    fieldKey: fKey,
                                                    label: CORE_ENROLLMENT_FIELD_LABELS[fKey].label,
                                                    fieldType: CORE_ENROLLMENT_FIELD_LABELS[fKey].type,
                                                });
                                                return;
                                            }

                                            // Otherwise look it up in FieldRegistry (match by .key lowercase)
                                            const info = personalInfoList.find(p =>
                                                (p.key || '').toLowerCase() === lowerFKey ||
                                                (p.fieldKey || '').toLowerCase() === lowerFKey
                                            );
                                            if (info) {
                                                sectionItems.push({
                                                    type: 'dynamic',
                                                    fieldKey: info.key || info.fieldKey,
                                                    label: info.label || info.fieldName || fKey,
                                                    fieldType: info.type || info.fieldType || 'text',
                                                    options: info.options || [],
                                                    _id: info._id,
                                                });
                                            }
                                        });

                                        if (sectionItems.length === 0) return null;

                                        return (
                                            <div className="student-attribute-grid p-3 rounded border mb-3" key={sIdx}>
                                                <h6 className="fw-bold mb-3 border-bottom pb-2">
                                                    <i className={`fas ${section.icon} text-primary me-2`}></i>{section.sectionName}
                                                </h6>
                                                <div className="row g-3">
                                                    {sectionItems.map((item, idx) => {
                                                        const { fieldKey, label, fieldType } = item;
                                                        const lowerKey = fieldKey.toLowerCase();

                                                        // Resolve display value
                                                        let displayValue = '';
                                                        if (item.type === 'core') {
                                                            // Core enrollment fields sit directly on the student object
                                                            displayValue = selectedStudent[fieldKey] || '';
                                                        } else {
                                                            // Dynamic fields: the student object has them flattened with lowerKey
                                                            displayValue = selectedStudent[lowerKey] ?? selectedStudent[fieldKey] ?? '';
                                                            // Legacy aliases
                                                            if (!displayValue && lowerKey === 'freestudent') displayValue = selectedStudent.FreeStud || '';
                                                            if (!displayValue && lowerKey === 'caste') displayValue = selectedStudent.Caste || '';
                                                            if (!displayValue && lowerKey === 'castehindi') displayValue = selectedStudent.CasteHindi || '';
                                                        }

                                                        if (fieldType === 'date' && displayValue) {
                                                            try { displayValue = new Date(displayValue).toLocaleDateString(); } catch (e) { }
                                                        }
                                                        displayValue = getSafeStringValue(displayValue);

                                                        // Edit mode: resolve edit value — only when editStudentData is set
                                                        // (editStudentData is null until the user clicks "Edit", so we must guard here)
                                                        const editValue = (isEditMode && editStudentData)
                                                            ? (item.type === 'core'
                                                                ? getSafeStringValue(editStudentData[fieldKey])
                                                                : getSafeStringValue(
                                                                    lowerKey === 'freestudent' ? editStudentData.FreeStud :
                                                                    lowerKey === 'caste' ? editStudentData.Caste :
                                                                    lowerKey === 'castehindi' ? editStudentData.CasteHindi :
                                                                    (editStudentData[lowerKey] ?? editStudentData[fieldKey])
                                                                ))
                                                            : '';

                                                        const handleEditChange = (val) => {
                                                            setEditStudentData(prev => {
                                                                const updated = { ...prev };
                                                                if (item.type === 'core') {
                                                                    updated[fieldKey] = val;
                                                                } else if (lowerKey === 'freestudent') {
                                                                    updated.FreeStud = val;
                                                                    updated.freeStudent = val;
                                                                } else if (lowerKey === 'caste') {
                                                                    updated.Caste = val;
                                                                    updated.caste = val;
                                                                } else if (lowerKey === 'castehindi') {
                                                                    updated.CasteHindi = val;
                                                                    updated.casteHindi = val;
                                                                } else {
                                                                    updated[lowerKey] = val;
                                                                    updated[fieldKey] = val;
                                                                }
                                                                return updated;
                                                            });
                                                        };

                                                        return (
                                                            <div className="col-md-6 border-bottom pb-2" key={item._id || `core-${fieldKey}-${idx}`}>
                                                                <div className="d-flex flex-column gap-1">
                                                                    <span className="small text-muted fw-bold">{label}</span>
                                                                    <div className="text-start">
                                                                        {isEditMode && item.type !== 'core' ? (
                                                                            fieldType === 'select' ? (
                                                                                <select
                                                                                    className="form-select form-select-sm"
                                                                                    value={editValue}
                                                                                    onChange={e => handleEditChange(e.target.value)}
                                                                                >
                                                                                    <option value="">Select</option>
                                                                                    {(item.options || []).map((opt, oIdx) => (
                                                                                        <option key={oIdx} value={opt}>{opt}</option>
                                                                                    ))}
                                                                                </select>
                                                                            ) : (
                                                                                <input
                                                                                    type={fieldType === 'number' ? 'number' : fieldType === 'date' ? 'date' : 'text'}
                                                                                    className="form-control form-control-sm"
                                                                                    value={editValue}
                                                                                    onChange={e => handleEditChange(e.target.value)}
                                                                                />
                                                                            )
                                                                        ) : (
                                                                            <span className="fw-semibold">{displayValue || '—'}</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}


                                {/* Remaining Fields not explicitly defined in the template sections */}
                                {(() => {
                                    const currentSchoolId = localStorage.getItem('schoolId') || '';
                                    const activeTemplate = STUDENT_TEMPLATES[currentSchoolId] || STUDENT_TEMPLATES['default'];
                                    const claimedKeys = activeTemplate.flatMap(s => s.fields).map(k => k.toLowerCase());
                                    const remainingFields = personalInfoList.filter(info => {
                                        const key = (info.key || info.fieldKey || '').toLowerCase();
                                        return !!key && !claimedKeys.includes(key);
                                    }).sort((a, b) => (a.sno || 99) - (b.sno || 99));

                                    if (remainingFields.length === 0) return null;

                                    return (
                                        <div className="student-attribute-grid p-3 rounded border mb-3">
                                            <h6 className="fw-bold mb-3 border-bottom pb-2">
                                                <i className="fas fa-info-circle text-primary me-2"></i>Additional Information
                                            </h6>
                                            <div className="row g-3">
                                                {remainingFields.map((info, idx) => {
                                                    const key = info.key || info.fieldKey || '';
                                                    const lowerKey = key.toLowerCase();
                                                    const label = info.label || info.fieldName || key;
                                                    const fieldType = info.type || info.fieldType || 'text';

                                                    let displayValue = selectedStudent[lowerKey] ?? selectedStudent[key] ?? '';
                                                    if (!displayValue && lowerKey === 'freestudent') displayValue = selectedStudent.FreeStud || '';
                                                    if (!displayValue && lowerKey === 'caste') displayValue = selectedStudent.Caste || '';
                                                    if (!displayValue && lowerKey === 'castehindi') displayValue = selectedStudent.CasteHindi || '';

                                                    if (fieldType === 'date' && displayValue) {
                                                        try { displayValue = new Date(displayValue).toLocaleDateString(); } catch (e) { }
                                                    }
                                                    displayValue = getSafeStringValue(displayValue);

                                                    return (
                                                        <div className="col-md-6 border-bottom pb-2" key={info._id || idx}>
                                                            <div className="d-flex flex-column gap-1">
                                                                <span className="small text-muted fw-bold">{label}</span>
                                                                <div className="text-start">
                                                                    {isEditMode && editStudentData ? (
                                                                        fieldType === 'select' ? (
                                                                            <select
                                                                                className="form-select form-select-sm"
                                                                                value={getSafeStringValue(
                                                                                    lowerKey === 'freestudent' ? editStudentData.FreeStud :
                                                                                    lowerKey === 'caste' ? editStudentData.Caste :
                                                                                    lowerKey === 'castehindi' ? editStudentData.CasteHindi :
                                                                                    (editStudentData[lowerKey] ?? editStudentData[key])
                                                                                )}
                                                                                onChange={(e) => {
                                                                                    const val = e.target.value;
                                                                                    setEditStudentData(prev => {
                                                                                        const updated = { ...prev };
                                                                                        if (lowerKey === 'freestudent') { updated.FreeStud = val; updated.freeStudent = val; }
                                                                                        else if (lowerKey === 'caste') { updated.Caste = val; updated.caste = val; }
                                                                                        else if (lowerKey === 'castehindi') { updated.CasteHindi = val; updated.casteHindi = val; }
                                                                                        else { updated[lowerKey] = val; updated[key] = val; }
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
                                                                                type={fieldType === 'number' ? 'number' : fieldType === 'date' ? 'date' : 'text'}
                                                                                className="form-control form-control-sm"
                                                                                value={getSafeStringValue(
                                                                                    lowerKey === 'freestudent' ? editStudentData.FreeStud :
                                                                                    lowerKey === 'caste' ? editStudentData.Caste :
                                                                                    lowerKey === 'castehindi' ? editStudentData.CasteHindi :
                                                                                    (editStudentData[lowerKey] ?? editStudentData[key])
                                                                                )}
                                                                                onChange={(e) => {
                                                                                    const val = e.target.value;
                                                                                    setEditStudentData(prev => {
                                                                                        const updated = { ...prev };
                                                                                        if (lowerKey === 'freestudent') { updated.FreeStud = val; updated.freeStudent = val; }
                                                                                        else if (lowerKey === 'caste') { updated.Caste = val; updated.caste = val; }
                                                                                        else if (lowerKey === 'castehindi') { updated.CasteHindi = val; updated.casteHindi = val; }
                                                                                        else { updated[lowerKey] = val; updated[key] = val; }
                                                                                        return updated;
                                                                                    });
                                                                                }}
                                                                            />
                                                                        )
                                                                    ) : (
                                                                        <span className="fw-semibold">{displayValue || '—'}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })()}

                            </div>
                        </div>

                        <div className="sidebar-footer p-3 border-top bg-light text-end">
                            {isEditMode ? (
                                <button
                                    className="btn btn-success me-2"
                                    disabled={uploading}
                                    onClick={async () => {
                                        try {
                                            setUploading(true);
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
                                                        const field = personalInfoList.find(p => p._id === (df.fieldId?._id || df.fieldId));
                                                        const key = df.fieldId?.fieldKey || field?.fieldKey;
                                                        if (key) {
                                                            const lowerKey = key.toLowerCase();
                                                            if (lowerKey === 'admissionno' || lowerKey === 'admissionnumber') {
                                                                updatedStudent.AdmissionNo = df.value;
                                                                updatedStudent.admissionNo = df.value;
                                                            } else if (lowerKey === 'freestudent' || lowerKey === 'freestud') {
                                                                updatedStudent.FreeStud = df.value;
                                                                updatedStudent.freeStudent = df.value;
                                                            } else if (lowerKey === 'caste') {
                                                                updatedStudent.Caste = df.value;
                                                                updatedStudent.caste = df.value;
                                                            } else if (lowerKey === 'castehindi') {
                                                                updatedStudent.CasteHindi = df.value;
                                                                updatedStudent.casteHindi = df.value;
                                                            } else if (lowerKey === 'gender') {
                                                                updatedStudent.gender = df.value;
                                                            } else if (lowerKey === 'dateofbirth' || lowerKey === 'dob') {
                                                                updatedStudent.dob = df.value;
                                                            }
                                                            updatedStudent[lowerKey] = df.value;
                                                        }
                                                    });
                                                }
                                                setSelectedStudent(updatedStudent);
                                                const updatedList = students.map(s => s._id === selectedStudent._id ? updatedStudent : s);
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
                            ) : null}
                            <button type="button" className="btn btn-secondary" onClick={() => { setIsEditMode(false); setSelectedStudent(null); }}>
                                Close
                            </button>
                        </div>
                    </div>
                )}
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

            {/* Batch Actions Sidebar */}
            <div className={`student-sidebar-backdrop ${activeBatchAction ? 'show' : ''}`} onClick={() => { if (!uploading) setActiveBatchAction(null); }} />
            <div className={`student-sidebar ${activeBatchAction ? 'open' : ''}`} style={{ width: '520px' }}>
                <div className="student-sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-color)' }}>
                        {activeBatchAction === 'promote' ? (isReAdmissionMode ? 'Batch Re-Admission' : 'Batch Promotion') : 'Batch Status Update'}
                    </h3>
                    <button 
                        className="btn-close-sidebar" 
                        onClick={() => setActiveBatchAction(null)} 
                        disabled={uploading}
                        style={{ background: 'none', border: 'none', color: 'var(--text-color)', fontSize: '1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}
                    >
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>
                
                <div className="student-sidebar-body" style={{ padding: '24px', overflowY: 'auto', height: 'calc(100% - 70px)' }}>
                    {activeBatchAction === 'promote' ? (() => {
                        const selectedStudentClasses = students
                            .filter(s => selectedStudents.includes(s._id))
                            .map(s => s.academicYears[s.academicYears.length - 1]?.class || "N/A");
                        const uniqueClasses = Array.from(new Set(selectedStudentClasses));
                        const isSameClass = uniqueClasses.length <= 1;

                        return (
                            <div className="batch-action-form">
                                <div className="batch-context-info" style={{ backgroundColor: 'var(--hover-bg-color)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ color: 'var(--text-color)', opacity: 0.7, fontSize: '0.9rem' }}>Current Academic Year:</span>
                                        <span style={{ fontWeight: 'bold', color: 'var(--text-color)', fontSize: '0.9rem' }}>{selectedYear || 'N/A'}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-color)', opacity: 0.7, fontSize: '0.9rem' }}>Current Class:</span>
                                        <span style={{ fontWeight: 'bold', color: 'var(--text-color)', fontSize: '0.9rem' }}>{selectedClass || 'N/A'}</span>
                                    </div>
                                </div>

                                {!isSameClass && (
                                    <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '14px', marginBottom: '20px', color: '#ef4444', fontSize: '0.85rem', lineHeight: '1.4' }}>
                                        <strong>⚠️ Promotion Blocked:</strong> Selected students belong to different classes ({uniqueClasses.join(", ")}). Batch promotion is only possible for students of the same class.
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-color)', marginBottom: '8px' }}>Target Year *</label>
                                        <select 
                                            value={passToSelectedYear} 
                                            onChange={(e) => setPassToSelectedYear(e.target.value)} 
                                            style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', backgroundColor: 'var(--card-bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)', fontSize: '0.9rem', outline: 'none' }}
                                        >
                                            <option value="">Select Year</option>
                                            {academicYears.map((year, index) => (
                                                <option key={index} value={year.name || year.year}>{year.name || year.year}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-color)', marginBottom: '8px' }}>Target Class *</label>
                                        <select 
                                            value={passToSelectedClass} 
                                            onChange={(e) => setPassToSelectedClass(e.target.value)} 
                                            style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', backgroundColor: 'var(--card-bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)', fontSize: '0.9rem', outline: 'none' }}
                                        >
                                            <option value="">Select Class</option>
                                            {classes.map((cls, idx) => (
                                                <option key={idx} value={cls.class}>{cls.class}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="selected-students-preview" style={{ marginBottom: '24px' }}>
                                    <h5 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-color)', marginBottom: '12px' }}>Selected Students ({selectedStudents.length})</h5>
                                    <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--hover-bg-color)' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-color)' }}>
                                            <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--card-bg-color)', zIndex: 1 }}>
                                                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                                                    <th style={{ padding: '10px 14px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-color)', opacity: 0.7 }}>Student Name</th>
                                                    <th style={{ padding: '10px 14px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-color)', opacity: 0.7, textAlign: 'right' }}>Current Class</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {students
                                                    .filter(s => selectedStudents.includes(s._id))
                                                    .map(s => {
                                                        const latestRec = s.academicYears[s.academicYears.length - 1];
                                                        return (
                                                            <tr key={s._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                                <td style={{ padding: '10px 14px', fontSize: '0.85rem' }}>{s.name}</td>
                                                                <td style={{ padding: '10px 14px', fontSize: '0.85rem', textAlign: 'right', color: 'var(--text-color)', opacity: 0.7 }}>{latestRec?.class || "N/A"}</td>
                                                            </tr>
                                                        );
                                                    })
                                                }
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="sidebar-footer-actions" style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
                                    <button 
                                        className="btn btn-secondary w-50" 
                                        onClick={() => setActiveBatchAction(null)} 
                                        disabled={uploading}
                                        style={{ padding: '10px', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 600 }}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        className="btn btn-primary w-50" 
                                        disabled={!canEdit || uploading || !passToSelectedYear || !passToSelectedClass || !isSameClass}
                                        onClick={async () => {
                                            setUploading(true);
                                            try {
                                                if (isReAdmissionMode) {
                                                    await handleReAdmission();
                                                } else {
                                                    await handlePassStudents();
                                                }
                                            } catch (err) {
                                                console.error(err);
                                            } finally {
                                                setUploading(false);
                                            }
                                        }}
                                        style={{ padding: '10px', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 600 }}
                                    >
                                        {uploading ? 'Processing...' : (isReAdmissionMode ? 'Confirm Re-Admission' : 'Confirm Promotion')}
                                    </button>
                                </div>
                            </div>
                        );
                    })() : activeBatchAction === 'drop' ? (
                        <div className="batch-action-form">
                            <div className="batch-context-info" style={{ backgroundColor: 'var(--hover-bg-color)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-color)', opacity: 0.7, fontSize: '0.9rem' }}>Current Academic Year:</span>
                                    <span style={{ fontWeight: 'bold', color: 'var(--text-color)', fontSize: '0.9rem' }}>{selectedYear || 'N/A'}</span>
                                </div>
                            </div>

                            <div className="mb-4">
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-color)', marginBottom: '8px' }}>Select Drop Status *</label>
                                <select 
                                    className="form-select" 
                                    value={dropStatus} 
                                    onChange={(e) => setDropStatus(e.target.value)} 
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', backgroundColor: 'var(--card-bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)', fontSize: '0.9rem', outline: 'none' }}
                                >
                                    <option value="">Select Status</option>
                                    <option value="Dropped">Dropped</option>
                                    <option value="TC-Issued">TC-Issued</option>
                                    <option value="Failed">Failed</option>
                                </select>
                            </div>

                            <div className="selected-students-preview" style={{ marginBottom: '24px' }}>
                                <h5 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-color)', marginBottom: '12px' }}>Selected Students ({selectedStudents.length})</h5>
                                <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--hover-bg-color)' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-color)' }}>
                                        <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--card-bg-color)', zIndex: 1 }}>
                                            <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                                                <th style={{ padding: '10px 14px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-color)', opacity: 0.7 }}>Student Name</th>
                                                <th style={{ padding: '10px 14px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-color)', opacity: 0.7, textAlign: 'right' }}>Class</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {students
                                                .filter(s => selectedStudents.includes(s._id))
                                                .map(s => {
                                                    const rec = s.academicYears.find(y => y.academicYear === selectedYear);
                                                    return (
                                                        <tr key={s._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                            <td style={{ padding: '10px 14px', fontSize: '0.85rem' }}>{s.name}</td>
                                                            <td style={{ padding: '10px 14px', fontSize: '0.85rem', textAlign: 'right', color: 'var(--text-color)', opacity: 0.7 }}>{rec?.class || "N/A"}</td>
                                                        </tr>
                                                    );
                                                })
                                            }
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="sidebar-footer-actions" style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
                                <button 
                                    className="btn btn-secondary w-50" 
                                    onClick={() => setActiveBatchAction(null)} 
                                    disabled={uploading}
                                    style={{ padding: '10px', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 600 }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    className="btn btn-danger w-50" 
                                    disabled={!canEdit || uploading || !dropStatus}
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
                                    style={{ padding: '10px', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 600 }}
                                >
                                    {uploading ? 'Processing...' : 'Apply Status Update'}
                                </button>
                            </div>
                        </div>
                    ) : null}
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
