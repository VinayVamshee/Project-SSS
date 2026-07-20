import React, { useEffect, useRef, useState } from "react";
import api, { getStudents, getAcademicYears, getClasses, passStudentsTo, updateAcademicYearStatus, addStudent, dropAcademicYear, getAllMasters, submitTemplateForm, deleteStudent } from '../../API';
import boy from "../Images/bussiness-man.png";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { useReactToPrint } from "react-to-print";
import StudentDataPage from "../StudentDataPage/StudentDataPage";
import IdentityCard from "../IdentityCard/IdentityCard";
import DefaultStudentPDF from "../DefaultStudentPDF/DefaultStudentPDF";
import SearchFilterBar from "../Shared/SearchFilterBar";
import DynamicForm from "../Shared/DynamicForm";
import ConfirmModal from "../Shared/ConfirmModal";
import './Students.css';

export default function Students() {
    const navigate = useNavigate();
    const [canEdit, setCanEdit] = useState(false);
    const [studentInfoTemplate, setStudentInfoTemplate] = useState(null);

    useEffect(() => {
        const fetchTemplate = async () => {
            try {
                const response = await api.get('/api/metadata/templates/student_information_vamshee/form');
                if (response.data.success && response.data.data) {
                    setStudentInfoTemplate(response.data.data);
                }
            } catch (err) {
                console.error("Failed to load student information template:", err);
            }
        };
        fetchTemplate();
    }, []);

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
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null, type: 'primary' });
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

    const getSidebarFormValues = (student) => {
        if (!student) return {};
        const flatValues = { ...student };
        
        // Find enrollment for selected year
        const activeEnrollment = student.academicYears?.find(y => y.academicYear === selectedYear);
        if (activeEnrollment) {
            flatValues.class = activeEnrollment.classId ? { _id: activeEnrollment.classId, name: activeEnrollment.class } : activeEnrollment.class;
            flatValues.section = activeEnrollment.section;
            flatValues.admissionnumber = activeEnrollment.admissionNumber || student.admissionNumber;
            flatValues.rollnumber = activeEnrollment.rollNumber || student.rollNumber;
            flatValues.academicyear = activeEnrollment.academicYearId ? { _id: activeEnrollment.academicYearId, name: activeEnrollment.academicYear } : activeEnrollment.academicYear;
            flatValues.academic_status = activeEnrollment.status || student.academicStatus;
        } else {
            flatValues.admissionnumber = student.admissionNumber || student.AdmissionNo || '';
            flatValues.rollnumber = student.rollNumber || '';
            flatValues.section = student.sectionId || '';
            flatValues.academic_status = student.academicStatus || '';
        }
        
        flatValues.fullname = student.name || '';
        flatValues.profilephoto = student.image || '';
        return flatValues;
    };

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
                        academicYearId: e.academicYear?._id || '',
                        class: e.class || 'N/A',
                        classId: e.classId || '',
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
                             p => p._id.toString() === (df.fieldId?._id || df.fieldId || '').toString()
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
                            <div className="d-flex justify-content-between mb-2">
                                <div>
                                    {isEditMode && canEdit && (
                                        <button 
                                            className="btn btn-sm btn-danger" 
                                            onClick={() => {
                                                setConfirmDialog({
                                                    isOpen: true,
                                                    title: 'Delete Student Profile',
                                                    message: `Are you sure you want to delete ${selectedStudent.name || 'this student'}? This will permanently delete their student record, academic years enrollment history, and assessment marks. This action cannot be undone.`,
                                                    type: 'danger',
                                                    onConfirm: async () => {
                                                        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                                                        try {
                                                            setUploading(true);
                                                            await deleteStudent(selectedStudent._id);
                                                            showMessage('🗑️ Student deleted successfully!');
                                                            setSelectedStudent(null);
                                                            setIsEditMode(false);
                                                            await fetchData();
                                                        } catch (err) {
                                                            showMessage('❌ Failed to delete student: ' + (err.response?.data?.message || err.message));
                                                        } finally {
                                                            setUploading(false);
                                                        }
                                                    }
                                                });
                                            }}
                                        >
                                            <i className="fa-solid fa-trash me-1"></i> Delete Student
                                        </button>
                                    )}
                                </div>
                                <button className="btn btn-sm btn-outline-warning" onClick={() => {
                                    setIsEditMode(!isEditMode);
                                }}
                                    disabled={!canEdit}
                                >
                                    {isEditMode ? "Cancel" : "Edit"}
                                </button>
                            </div>

                            <div className="student-profile-container">
                                {studentInfoTemplate ? (
                                    <DynamicForm
                                        template={studentInfoTemplate}
                                        values={getSidebarFormValues(selectedStudent)}
                                        mode={isEditMode ? "edit" : "view"}
                                        loading={uploading}
                                        onSubmit={async (formData) => {
                                            try {
                                                setUploading(true);
                                                const activeEnrollment = selectedStudent.academicYears?.find(y => y.academicYear === selectedYear);
                                                const payload = {
                                                    ...formData,
                                                    _id: selectedStudent._id,
                                                    studentId: selectedStudent._id,
                                                    enrollmentId: activeEnrollment?.enrollmentId
                                                };

                                                const response = await submitTemplateForm(studentInfoTemplate.template.id, payload);
                                                if (response.status === 200 || response.status === 201) {
                                                    showMessage("Student updated successfully!");
                                                    setIsEditMode(false);
                                                    await fetchData();
                                                    
                                                    // Resolve the updated student from list to maintain state sync
                                                    const updatedListResponse = await getStudents();
                                                    const updated = updatedListResponse.data.students?.find(s => s._id === selectedStudent._id);
                                                    if (updated) {
                                                        const fieldsRes = await api.get("/api/metadata/fields");
                                                        const fields = fieldsRes.data.data || [];
                                                        const legacyStudent = {
                                                            ...updated,
                                                            academicYears: (updated.enrollments || []).map(e => ({
                                                                enrollmentId: e.enrollmentId,
                                                                academicYear: e.academicYear?.name || e.academicYear?.toString() || '',
                                                                academicYearId: e.academicYear?._id || '',
                                                                class: e.class || 'N/A',
                                                                classId: e.classId || '',
                                                                section: e.section || '',
                                                                admissionNumber: e.admissionNumber || '',
                                                                rollNumber: e.rollNumber || '',
                                                                status: e.academicStatus || 'Active',
                                                            })),
                                                            admissionNumber: updated.admissionNumber || '',
                                                            rollNumber: updated.rollNumber || '',
                                                            sectionId: updated.sectionId || '',
                                                            academicStatus: updated.academicStatus || 'Active',
                                                        };
                                                        if (updated.dynamicFields) {
                                                            updated.dynamicFields.forEach(df => {
                                                                const fieldKey = df.fieldId?.key || fields.find(p => p._id.toString() === (df.fieldId?._id || df.fieldId || '').toString())?.key;
                                                                if (fieldKey) {
                                                                    legacyStudent[fieldKey.toLowerCase()] = df.value;
                                                                }
                                                            });
                                                        }
                                                        setSelectedStudent(legacyStudent);
                                                    }
                                                }
                                            } catch (err) {
                                                showMessage("Failed to update student");
                                                console.error(err);
                                            } finally {
                                                setUploading(false);
                                            }
                                        }}
                                    />
                                ) : (
                                    <div className="text-center p-4 text-muted">
                                        <i className="fas fa-spinner fa-spin me-2"></i>Loading template layout...
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="sidebar-footer p-3 border-top bg-light text-end">
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

                <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                    <IdentityCard
                        ref={identityRef}
                        selectedStudents={selectedStudents}
                        students={students}
                        selectedYear={selectedYear}
                        latestMaster={latestMaster}
                    />
                </div>

                <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
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

                <ConfirmModal 
                    isOpen={confirmDialog.isOpen} 
                    title={confirmDialog.title} 
                    message={confirmDialog.message} 
                    onConfirm={confirmDialog.onConfirm} 
                    onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))} 
                    type={confirmDialog.type} 
                />
            </div>

    );
}
