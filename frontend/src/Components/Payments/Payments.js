import React, { useEffect, useState } from "react";
import { getStudents, getAcademicYears, getClasses, getFees, getFeesByStudent, getClassFees, saveFees, incrementReceipt, getReceiptBook, updateReceiptBook, getAllMasters, getFieldDefinitions, getTemplates, getTemplateForm } from '../../API';
import boy from "../Images/bussiness-man.png";
import { generatePdf } from "../DownloadReceipt/DownloadReceipt";
import SearchFilterBar from "../Shared/SearchFilterBar";

import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";
import './Payments.css';

export default function Payments() {

    const navigate = useNavigate();
    const [canEdit, setCanEdit] = useState(false);
    const [canNoDeleteEdit, setCanNoDeleteEdit] = useState(false);
    const [canDownload, setCanDownload] = useState(false);

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

        if (userType === 'payment-manager' || userType === 'payment' || userType === 'payments') {
            setCanNoDeleteEdit(true);
        }

        if (isDev || userType === 'admin' || userType === 'payment-manager' || userType === 'payment' || userType === 'payments') {
            setCanDownload(true);
        }
    }, [navigate]);

    const [students, setStudents] = useState([]);
    const [feesData, setFeesData] = useState([]);
    const [classFeesData, setClassFeesData] = useState([]);
    const [feeTemplateFields, setFeeTemplateFields] = useState([]);
    const [selectedYear, setSelectedYear] = useState("");
    const [academicYears, setAcademicYears] = useState([]);
    const [selectedClass, setSelectedClass] = useState("");
    const [classes, setClasses] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [personalInfoList, setPersonalInfoList] = useState([]);

    const fetchData = async () => {
        try {
            // Load fee template fields for dynamic total fee resolution
            try {
                const templatesRes = await getTemplates();
                const allTemplates = templatesRes.data?.data || [];
                const feeTemplate = allTemplates.find(t => 
                    t.status === 'active' && 
                    t.purpose === 'fee_structure'
                );
                if (feeTemplate) {
                    const formRes = await getTemplateForm(feeTemplate._id);
                    const fields = formRes.data?.data?.fields || [];
                    setFeeTemplateFields(fields);
                }
            } catch (err) {
                console.error("Failed to load fee template fields in Payments:", err);
            }

            // 1. Get Student definitions fields
            const fieldsRes = await getFieldDefinitions();
            setPersonalInfoList(fieldsRes.data.data || []);

            // 2. Get Students list
            const studentResponse = await getStudents();
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
                        const key = df.fieldId?.fieldKey;
                        if (key) {
                            const lowerKey = key.toLowerCase();
                            if (lowerKey === "admissionno" || lowerKey === "admissionnumber") {
                                legacyStudent.AdmissionNo = df.value;
                                legacyStudent.admissionNo = df.value;
                            } else if (lowerKey === "freestudent" || lowerKey === "freestud") {
                                legacyStudent.FreeStud = df.value;
                                legacyStudent.freeStudent = df.value;
                            } else if (lowerKey === "caste") {
                                legacyStudent.Caste = df.value;
                                legacyStudent.caste = df.value;
                            } else if (lowerKey === "castehindi") {
                                legacyStudent.CasteHindi = df.value;
                                legacyStudent.casteHindi = df.value;
                            } else if (lowerKey === "gender") {
                                legacyStudent.gender = df.value;
                            } else if (lowerKey === "dateofbirth" || lowerKey === "dob") {
                                legacyStudent.dob = df.value;
                            }
                            legacyStudent[lowerKey] = df.value;
                        }
                    });
                }
                return legacyStudent;
            });
            setStudents(mapped);

            // 3. Get Academic Years
            const yearResponse = await getAcademicYears();
            const sortedYears = (yearResponse.data.data || []).sort((a, b) =>
                parseInt(b.year?.split("-")[0] || b.name?.split("-")[0] || 0) - parseInt(a.year?.split("-")[0] || a.name?.split("-")[0] || 0)
            );
            setAcademicYears(sortedYears);

            const selectedYearValue = sortedYears[0]?.year || sortedYears[0]?.name || "";
            setSelectedYear(selectedYearValue);

            // 4. Get Classes
            const classResponse = await getClasses();
            const sortedClasses = classResponse.data.classes.sort((a, b) => Number(a.class) - Number(b.class));
            setClasses(sortedClasses || []);
            if (sortedClasses && sortedClasses.length > 0) {
                setSelectedClass(sortedClasses[0].class);
            }

            // 5. Get Fees (Other Fees)
            const feesResponse = await getFees();
            setFeesData(feesResponse.data || []);

            // 6. Get Class Fees
            const classFeesResponse = await getClassFees();
            const allFees = classFeesResponse.data || [];

            const filteredFees = selectedYearValue
                ? allFees.filter(fee => fee.academicYear?.trim() === selectedYearValue.trim())
                : allFees;
            setClassFeesData(filteredFees);

        } catch (error) {
            console.error("❌ Error fetching data:", error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        const fetchClassFeesForSelectedYear = async () => {
            try {

                const classFeesResponse = await getClassFees();
                const allFees = classFeesResponse.data || [];
                const filteredFees = selectedYear
                    ? allFees.filter(fee => fee.academicYear?.trim() === selectedYear.trim())
                    : allFees;
                setClassFeesData(filteredFees);
            } catch (error) {
                console.error("Error fetching class fees for selected year:", error);
            }
        };
        if (selectedYear) {
            fetchClassFeesForSelectedYear();
        }
    }, [selectedYear]);

    const [selectedStudents, setSelectedStudents] = useState([]);

    const handleStudentCheckboxToggle = (student) => {
        setSelectedStudents(prev => {
            const isSelected = prev.some(s => s._id === student._id);
            if (isSelected) {
                return prev.filter(s => s._id !== student._id);
            } else {
                return [...prev, student];
            }
        });
    };

    const [statusFilter, setStatusFilter] = useState("Active");
    const [selectedField, setSelectedField] = useState("");
    const [searchText, setSearchText] = useState("");
    const [filters, setFilters] = useState([]);
    const [selectAllChecked, setSelectAllChecked] = useState(false);

    const handleSelectAll = () => {
        if (selectAllChecked) {
            setSelectedStudents([]);
        } else {
            setSelectedStudents(filteredStudents);
        }
        setSelectAllChecked(!selectAllChecked);
    };

    // eslint-disable-next-line
    const [receiptSearch, setReceiptSearch] = useState("");
    const [receiptSortOrder, setReceiptSortOrder] = useState("desc"); // "desc" = latest first, "asc" = oldest first

    const normalize = (v) => String(v ?? "").toLowerCase().replace(/\s+/g, "");
    const keyMatch = (book, num, needle) => {
        const combo = `${book}-${num}`;
        return (
            normalize(num).includes(normalize(needle)) ||
            normalize(combo).includes(normalize(needle))
        );
    };

    const getPaymentsFor = (studentId, yearFilter) => {
        const rec = (feesData || []).find((f) => f.studentId === studentId);
        if (!rec) return [];
        const yrs = rec.academicYears || [];
        const pickedYears = yearFilter ? yrs.filter((y) => y.academicYear === yearFilter) : yrs;
        return pickedYears.flatMap((y) => y.payments || []);
    };

    // eslint-disable-next-line
    const [globalSearch, setGlobalSearch] = useState("");

    // Filter students based on selected year, class, and search
    const filteredStudents = students
        .filter((student) => {
            // ✅ Global Search (Name or Admission Number)
            if (globalSearch.trim()) {
                const searchLower = globalSearch.toLowerCase().trim();
                const nameMatch = student.name?.toLowerCase().includes(searchLower);
                const admMatch = student.AdmissionNo?.toLowerCase().includes(searchLower);
                if (!nameMatch && !admMatch) return false;
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
                    (year) => year.academicYear === selectedYear && year.status === statusFilter
                );

            if (!yearAndClassMatch || !statusMatch) return false;

            // ✅ Receipt filter (if user typed receipt number/book in search)
            if (receiptSearch?.trim()) {
                const payments = getPaymentsFor(student._id, selectedYear || null);
                const hasReceipt = payments.some((p) =>
                    keyMatch(p.receiptBookName, p.receiptNumber, receiptSearch)
                );
                if (!hasReceipt) return false;
            }

            // ✅ Extra filters (caste, gender, academic fields, etc.)
            for (const { field, value } of filters) {
                let fieldValue = null;

                if (field.startsWith("Additional - ")) {
                    const key = field.split(" - ")[1];
                    const infoObj = student.additionalInfo?.find((info) => info.key === key);
                    fieldValue = infoObj?.value;

                } else if (field.startsWith("Academic - ")) {
                    const subField = field.split(" - ")[1];
                    const selectedYearObj = student.academicYears?.find(
                        (year) => year.academicYear === selectedYear
                    );
                    fieldValue = selectedYearObj?.[subField];

                } else if (field.startsWith("Receipt - ")) {
                    const payments = getPaymentsFor(student._id, selectedYear || null);

                    if (field === "Receipt - Number") {
                        const found = payments.some((p) =>
                            String(p.receiptNumber).includes(String(value))
                        );
                        if (!found) return false;
                    }

                    if (field === "Receipt - Book+Number") {
                        const found = payments.some((p) =>
                            `${p.receiptBookName}-${p.receiptNumber}`
                                .toLowerCase()
                                .includes(String(value).toLowerCase())
                        );
                        if (!found) return false;
                    }

                    continue; // ✅ skip normal checks for receipt filters
                } else {
                    fieldValue = student[field];
                }

                if (!fieldValue) return false;

                // Date range support
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
                } else if (typeof fieldValue === "string") {
                    // Normal string match
                    const val = value.toLowerCase();
                    const actual = fieldValue.toLowerCase();

                    const exactMatchFields = ["gender", "status", "caste", "religion", "bloodGroup"];
                    const isExactField = field.startsWith("Academic - ")
                        ? exactMatchFields.includes(field.split(" - ")[1])
                        : exactMatchFields.includes(field);

                    if (isExactField ? actual !== val : !actual.includes(val)) return false;
                }
            }

            return true;
        })
        // ✅ Sort by latest/oldest receipt (from feesData → payments)
        .sort((a, b) => {
            const paymentsA = getPaymentsFor(a._id, selectedYear || null);
            const paymentsB = getPaymentsFor(b._id, selectedYear || null);

            const timesA = paymentsA.map((p) => new Date(p.date).getTime()).filter((t) => Number.isFinite(t));
            const timesB = paymentsB.map((p) => new Date(p.date).getTime()).filter((t) => Number.isFinite(t));

            const keyA = timesA.length ? (receiptSortOrder === "asc" ? Math.min(...timesA) : Math.max(...timesA)) : null;
            const keyB = timesB.length ? (receiptSortOrder === "asc" ? Math.min(...timesB) : Math.max(...timesB)) : null;

            // Push students without receipts to bottom
            if (keyA === null && keyB === null) {
                // Final fallback to AdmissionNo for stability
                return (a.AdmissionNo || "").localeCompare(b.AdmissionNo || "", undefined, { numeric: true });
            }
            if (keyA === null) return 1;
            if (keyB === null) return -1;

            if (keyA !== keyB) return receiptSortOrder === "asc" ? keyA - keyB : keyB - keyA;

            // Tie-breaker by receipt number (max/min)
            const numsA = paymentsA.map((p) => Number(p.receiptNumber) || 0);
            const numsB = paymentsB.map((p) => Number(p.receiptNumber) || 0);
            const numA = numsA.length ? (receiptSortOrder === "asc" ? Math.min(...numsA) : Math.max(...numsA)) : 0;
            const numB = numsB.length ? (receiptSortOrder === "asc" ? Math.min(...numsB) : Math.max(...numsB)) : 0;

            if (numA !== numB) return receiptSortOrder === "asc" ? numA - numB : numB - numA;

            // Last fallback
            return (a.AdmissionNo || "").localeCompare(b.AdmissionNo || "", undefined, { numeric: true });
        });


    const handleGeneratePdf = (studentFees, payment, student, selectedYear, paidFees, latestMaster) => {
        if (!studentFees || !student || !selectedYear) {
            console.error("Missing data for PDF:", { studentFees, student, selectedYear });
            return;
        }

        // Find the correct academic year
        const selectedFees = studentFees.academicYears.find(ay => ay.academicYear === selectedYear);
        if (!selectedFees) {
            console.error("No fees data found for the selected year:", selectedYear);
            return;
        }

        // Ensure payment exists
        if (!selectedFees.payments || selectedFees.payments.length === 0) {
            console.error("No payments found for the selected year:", selectedYear);
            return;
        }

        generatePdf(selectedFees, payment, student, selectedYear, paidFees, latestMaster);
    };

    const handleDownloadExcel = (student, feesData, selectedYear) => {
        if (!student || !selectedYear) {
            alert("Missing student or academic year data.");
            return;
        }

        // Find student fees
        const studentFees = feesData.find(fee => fee.studentId === student._id);
        if (!studentFees) {
            alert("No fee records found for this student.");
            return;
        }

        const academicYearFees = studentFees.academicYears.find(year => year.academicYear === selectedYear);
        if (!academicYearFees) {
            alert("No payment history for the selected academic year.");
            return;
        }

        const payments = academicYearFees.payments || [];

        // Header with student details
        const headerData = [
            ["Student Name:", student.name],
            ["Academic Year:", selectedYear],
            ["Total Fees:", academicYearFees.totalFees],
            ["Discount:", academicYearFees.discount],
            ["Is New Student:", academicYearFees.isNewStudent ? "Yes" : "No"],
            [],
            [
                "S.No", "Receipt No.", "Payment Date", "Amount (₹)", "Payment Method", "Payment By",
                "Admission Fees", "Development Fee", "Exam Fee", "Progress Card",
                "Identity Card", "School Diary", "School Activity", "Tuition Fee",
                "Late Fee", "Miscellaneous"
            ]
        ];

        // Prepare payment history with full breakdown
        const paymentHistory = payments.map((payment, index) => [
            index + 1,
            `${payment.receiptBookName} - ${payment.receiptNumber}`,
            new Date(payment.date).toLocaleDateString('en-GB'),
            payment.amount || 0,
            payment.paymentMethod ?? "Unknown",
            payment.paymentBy ?? "Unknown",
            payment.admission_fees || 0,
            payment.development_fee || 0,
            payment.exam_fee || 0,
            payment.progress_card || 0,
            payment.identity_card || 0,
            payment.school_diary || 0,
            payment.school_activity || 0,
            payment.tuition_fee || 0,
            payment.late_fee || 0,
            payment.miscellaneous || 0
        ]);

        // Total paid so far
        const totalPaid = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);

        // Add totals row at the end
        paymentHistory.push(
            [],
            ["", "Total Fees", academicYearFees.totalFees, "", ""],
            ["", "Total Paid", totalPaid, "", ""],
            ["", "Remaining Fees", academicYearFees.totalFees - totalPaid, "", ""]
        );

        // Combine all into final sheet
        const finalSheetData = [...headerData, ...paymentHistory];

        // Create Excel file
        const worksheet = XLSX.utils.aoa_to_sheet(finalSheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Payment History");

        // Download
        const fileName = `${student.name}_Fees_${selectedYear}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    };

    const handleBulkDownload = () => {
        if (!selectedYear || selectedStudents.length === 0) {
            alert("Please select academic year and students.");
            return;
        }

        const allRows = [];

        selectedStudents.forEach((student) => {
            const studentClass = student.academicYears.find(
                (year) => year.academicYear === selectedYear
            )?.class || "N/A";

            const studentFees = feesData.find(fee => fee.studentId === student._id);
            const academicYearFees = studentFees?.academicYears.find(
                year => year.academicYear === selectedYear
            );

            const payments = academicYearFees?.payments || [];

            payments.forEach((payment, index) => {
                allRows.push({
                    "Student Name": student.name,
                    "Admission No": student.AdmissionNo || "",
                    "Class": studentClass,
                    "Receipt No": `${payment.receiptBookName} - ${payment.receiptNumber}`,
                    "Date": new Date(payment.date).toLocaleDateString('en-GB'),
                    "Amount Paid": payment.amount || 0,
                    "Payment Method": payment.paymentMethod || "",
                    "Payment By": payment.paymentBy || "",

                    // Fee breakdown
                    "Tuition Fee": payment.tuition_fee || 0,
                    "Exam Fee": payment.exam_fee || 0,
                    "Development Fee": payment.development_fee || 0,
                    "Admission Fee": payment.admission_fees || 0,
                    "Late Fee": payment.late_fee || 0,
                    "School Activity": payment.school_activity || 0,
                    "School Diary": payment.school_diary || 0,
                    "Identity Card": payment.identity_card || 0,
                    "Progress Card": payment.progress_card || 0,
                    "Miscellaneous": payment.miscellaneous || 0,
                });
            });
        });

        const worksheet = XLSX.utils.json_to_sheet(allRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "All Payments Flat");
        XLSX.writeFile(workbook, `Student_Payments_Flat_${selectedYear}.xlsx`);
    };


    const [paymentData, setPaymentData] = useState({
        academicYear: "",
        totalFees: "",
        discount: "",
        isNewStudent: false,
        payments: []
    });
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);


    const [receiptBook, setReceiptBook] = useState({ bookName: "", currentNumber: 0 });
    const [editReceiptBook, setEditReceiptBook] = useState({ bookName: "", startNumber: 1 });

    const [singlePayment, setSinglePayment] = useState({
        admission_fees: 0,
        development_fee: 0,
        exam_fee: 0,
        progress_card: 0,
        identity_card: 0,
        school_diary: 0,
        school_activity: 0,
        tuition_fee: 0,
        late_fee: 0,
        miscellaneous: 0,
        paymentDate: "",
        paymentMethod: "Cash",
        paymentBy: "",
        amount: 0,
        receiptBookName: receiptBook.bookName,
        receiptNumber: receiptBook.currentNumber
    });


    const handleOpenPaymentModal = async (student) => {
        setSelectedStudent(student);

        const baseValues = {
            paymentDate: new Date().toISOString().split('T')[0],
            paymentMethod: "Cash",
            paymentBy: "",
            amount: 0
        };
        if (feeTemplateFields) {
            feeTemplateFields.forEach(tf => {
                const key = (tf.fieldId?.key || tf.key || '').toLowerCase();
                if (key) {
                    baseValues[key] = "";
                }
            });
        }
        setSinglePayment(baseValues);

        try {
            const receiptRes = await getReceiptBook();
            setReceiptBook(receiptRes.data);
        } catch (err) {
            console.error("Error fetching receipt series", err);
        }


        try {
            const response = await getFeesByStudent(student._id, selectedYear);
            const { discount, isNewStudent } = response.data;

            setPaymentData(prev => ({ ...prev, discount: discount || 0, isNewStudent: isNewStudent ?? false }));
        } catch (error) {
            console.error("Error fetching fee details:", error);
        }
    };


    const submitPayment = async () => {
        if (!selectedStudent || !singlePayment.paymentDate || !singlePayment.paymentBy) {
            alert("Please fill all required fields.");
            return;
        }

        const studentAcademicYear = selectedStudent.academicYears.find(year => year.academicYear === selectedYear);

        const studentClass = studentAcademicYear?.class;
        const classObject = classes.find(cls => cls.class === studentClass);
        const classId = classObject ? classObject._id : null;
        const yearFees = classFeesData.find(fee => fee.academicYear === selectedYear);
        const studentClassFee = yearFees?.classes.find(clsFee =>
            clsFee.class_id?._id?.toString() === classId?.toString()
        );

        if (!studentClassFee) {
            console.error("❌ No fee structure found for this class.");
            alert("Fee structure not found for this student.");
            return;
        }

        let adjustedTotalFees = 0;
        if (feeTemplateFields && feeTemplateFields.length > 0 && studentClassFee.fees && Array.isArray(studentClassFee.fees)) {
            feeTemplateFields.forEach(tf => {
                const tfFieldId = tf.fieldId?._id || tf.fieldId;
                if (!tfFieldId) return;

                const matchingFee = studentClassFee.fees.find(f => {
                    const feeFieldId = f.fieldId?._id || f.fieldId;
                    return feeFieldId && feeFieldId.toString() === tfFieldId.toString();
                });

                if (matchingFee) {
                    const fieldKey = (tf.fieldId?.key || tf.key || '').toLowerCase();
                    if (fieldKey === 'admission_fees' || fieldKey === 'admission_fee') {
                        if (paymentData.isNewStudent) {
                            adjustedTotalFees += Number(matchingFee.amount) || 0;
                        }
                    } else if (fieldKey !== 'total_fees' && fieldKey !== 'total_fee') {
                        adjustedTotalFees += Number(matchingFee.amount) || 0;
                    }
                }
            });
        }
        let calculatedAmount = 0;
        const components = [];
        if (feeTemplateFields && feeTemplateFields.length > 0) {
            feeTemplateFields.forEach(tf => {
                const key = (tf.fieldId?.key || tf.key || '').toLowerCase();
                if (key === 'class' || key === 'academicyear' || key === 'academic_year') return;

                const amountVal = Number(singlePayment[key]) || 0;
                calculatedAmount += amountVal;

                const tfFieldId = tf.fieldId?._id || tf.fieldId;
                if (tfFieldId) {
                    components.push({
                        fieldId: tfFieldId,
                        amount: amountVal
                    });
                }
            });
        }

        const paymentDetails = {
            studentId: selectedStudent._id,
            academicYear: selectedYear,
            totalFees: adjustedTotalFees,
            discount: Number(paymentData.discount) || 0,
            isNewStudent: paymentData.isNewStudent,
            newPayment: {
                amount: calculatedAmount,
                date: singlePayment.paymentDate ? new Date(singlePayment.paymentDate) : new Date(),
                paymentMethod: singlePayment.paymentMethod,
                paymentBy: singlePayment.paymentBy,
                components: components,
                receiptBookName: receiptBook.bookName || "",
                receiptNumber: receiptBook.currentNumber || 0
            }
        };

        try {
            const response = await saveFees(paymentDetails);
            const updatedReceipt = await incrementReceipt();
            setReceiptBook(updatedReceipt.data);

            if (response.status === 200) {
                alert("Payment added successfully!");
                const baseReset = {
                    paymentDate: new Date().toISOString().split('T')[0],
                    paymentMethod: "Cash",
                    paymentBy: "",
                    amount: 0
                };
                if (feeTemplateFields) {
                    feeTemplateFields.forEach(tf => {
                        const key = (tf.fieldId?.key || tf.key || '').toLowerCase();
                        if (key) baseReset[key] = "";
                    });
                }
                setSinglePayment(baseReset);
                setPaymentData(prev => ({ ...prev, discount: "0", isNewStudent: false, academicYear: "", totalFees: "" }));
                fetchData();
            }

        } catch (error) {
            console.error("Error adding payment:", error);
            alert("Failed to add payment.");
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

    return (
        <div className='PaymentsPage'>
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
                {/* Sort by Receipt */}
                <select
                    className="form-select form-select-sm"
                    style={{ width: "140px", borderRadius: '8px', fontWeight: '600' }}
                    value={receiptSortOrder}
                    onChange={(e) => setReceiptSortOrder(e.target.value)}
                >
                    <option value="desc">Latest Receipt</option>
                    <option value="asc">Oldest Receipt</option>
                </select>

                {/* Select All Checkbox */}
                <div className="selectAll d-flex align-items-center me-2">
                    <input type="checkbox" className="form-check-input" id="selectAllCheckbox" checked={selectAllChecked} onChange={handleSelectAll} />
                    <label className="ms-1 small fw-bold text-dark cursor-pointer" htmlFor="selectAllCheckbox">Select All</label>
                </div>

                {/* Action Buttons */}
                <button className="btn btn-sm btn-outline-success fw-bold" onClick={handleBulkDownload} disabled={!canDownload}>
                    <i className="fa-solid fa-file-excel me-1"></i>Download All Fee Sheets
                </button>

            </SearchFilterBar>

            <div className="Payments">

                {filteredStudents.map((element, idx) => {
                    const studentClass = element.academicYears.find(
                        (year) => year.academicYear === selectedYear)?.class || "N/A";

                    // Find student fees data in getFees
                    const studentFees = feesData.find(fee => fee.studentId === element._id);
                    const academicYearFees = studentFees?.academicYears.find(year => year.academicYear === selectedYear);

                    let totalFees = "NA";
                    let paidFees = "NA";
                    let discount = academicYearFees?.discount || 0;
                    const payments = academicYearFees?.payments || [];

                    if (academicYearFees) {
                        // If fees exist in getFees, use that data
                        totalFees = academicYearFees.totalFees - discount;
                        paidFees = academicYearFees.payments.reduce((sum, payment) => sum + payment.amount, 0);
                    } else {
                        // If no fees in getFees, use class-fees structure
                        // Find the class_id corresponding to studentClass
                        const classObj = classes.find(cls => cls.class === studentClass);
                        const classId = classObj ? classObj._id : null;
                        const yearFees = classFeesData.find(fee => fee.academicYear === selectedYear);
                        const classFees = yearFees?.classes.find(clsFee =>
                            (clsFee.class_id?._id || clsFee.class_id)?.toString() === classId?.toString()
                        );
                        if (classFees) {
                            let total = 0;
                            if (feeTemplateFields && feeTemplateFields.length > 0 && classFees.fees && Array.isArray(classFees.fees)) {
                                feeTemplateFields.forEach(tf => {
                                    const tfFieldId = tf.fieldId?._id || tf.fieldId;
                                    if (!tfFieldId) return;

                                    const matchingFee = classFees.fees.find(f => {
                                        const feeFieldId = f.fieldId?._id || f.fieldId;
                                        return feeFieldId && feeFieldId.toString() === tfFieldId.toString();
                                    });

                                    if (matchingFee) {
                                        const fieldKey = (tf.fieldId?.key || tf.key || '').toLowerCase();
                                        if (fieldKey === 'admission_fees' || fieldKey === 'admission_fee') {
                                            if (element.isNewStudent) {
                                                total += Number(matchingFee.amount) || 0;
                                            }
                                        } else if (fieldKey !== 'total_fees' && fieldKey !== 'total_fee') {
                                            total += Number(matchingFee.amount) || 0;
                                        }
                                    }
                                });
                            }
                            totalFees = total - (discount || 0);
                            paidFees = 0;
                        }
                    }

                    return (
                        <div key={element._id}>
                            <div className="Payment student-list" key={idx} style={{ animationDelay: `${idx * 0.05}s` }}>
                                <input
                                    type="checkbox"
                                    className="select-checkbox"
                                    checked={selectedStudents.some(s => s._id === element._id)}
                                    onChange={() => handleStudentCheckboxToggle(element)}
                                />
                                <div className="student-list-view" style={{ flex: 1 }}>
                                    <img src={element.image || boy} alt="..." />
                                    <strong style={{ width: '220px' }}>{element.name}</strong>
                                    <div style={{ width: '120px' }}><label>Class:</label> {studentClass}</div>
                                    
                                    <div className="fees-container" style={{ flex: 1, maxWidth: '280px' }}>
                                        <div className="fees-bar">
                                            <div
                                                className="fees-progress"
                                                style={{ 
                                                    width: totalFees !== "NA" ? `${Math.min((paidFees / totalFees) * 100, 100)}%` : "0%"
                                                }}
                                            />
                                        </div>
                                        <span className="fees-text" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                                            ₹{paidFees} / ₹{totalFees}
                                        </span>
                                    </div>
                                </div>
                                <div className="payment-actions d-flex gap-2">
                                    <button type="button" className="btn btn-paymentHistory btn-sm" onClick={() => handleDownloadExcel(element, feesData, selectedYear)} disabled={!canDownload}> <i className="fa-solid fa-file-arrow-down me-1"></i>Download Sheet </button>
                                    <button className="btn btn-paymentHistory btn-sm" type="button" data-bs-toggle="collapse" data-bs-target={`#HistoryCollapse-${element._id}`} aria-expanded="false" aria-controls={`HistoryCollapse-${element._id}`}><i className="fa-solid fa-clock-rotate-left me-1"></i> History<i className="fa-solid fa-caret-down ms-1"></i></button>
                                    <button type="button" className="btn btn-paymentHistory btn-sm" onClick={() => {
                                        handleOpenPaymentModal(element);
                                        setIsSidebarOpen(true);
                                    }} disabled={!(canEdit || canNoDeleteEdit)}>
                                        <i className="fa-solid fa-credit-card me-1"></i> Add Payment
                                    </button>
                                </div>
                            </div>

                            <div className="collapse mt-2" id={`HistoryCollapse-${element._id}`}>
                                <div className="card card-body" style={{ backgroundColor: 'var(--hover-bg-color)', borderColor: 'var(--border-color)', borderRadius: '12px', padding: '20px' }}>
                                    <h6 style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-color)', marginBottom: '16px' }}>Payment History</h6>
                                    <div className="table-responsive">
                                        <table className="setup-table mt-3" style={{ width: '100%' }}>
                                            <thead>
                                            <tr>
                                                <th>S. No</th>
                                                <th>Receipt No.</th>
                                                <th>Payment From</th>
                                                <th>Payment Method</th>
                                                <th>Payment Date</th>
                                                <th>Amount (₹)</th>
                                                <th>Receipt</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {payments.length > 0 ? (
                                                payments.map((payment, index) => (
                                                    <tr key={index}>
                                                        <td>{index + 1}</td>
                                                        <td>{payment.receiptBookName}  {payment.receiptNumber}</td>
                                                        <td>{payment.paymentBy}</td>

                                                        <td>{payment.paymentMethod}</td>
                                                        <td>{new Date(payment.date).toLocaleDateString('en-GB')}</td>
                                                        <td>₹{payment.amount}</td>
                                                        <td>
                                                            <button
                                                                className="btn btn-sm btn-outline-success"
                                                                disabled={!canEdit}
                                                                onClick={() => handleGeneratePdf(studentFees, payment, element, selectedYear, paidFees, latestMaster)}
                                                            >
                                                                <i className="fa-solid fa-download me-1"></i>Download Receipt
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="6" className="text-center">No payments made yet.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Add Payment Sidebar */}
            <div className={`payment-sidebar-backdrop ${isSidebarOpen ? 'show' : ''}`} onClick={() => setIsSidebarOpen(false)} />
            <div className={`payment-sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-inner d-flex flex-column h-100">
                    {/* Header */}
                    <div className="sidebar-header d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center gap-2">
                            <i className="fa-solid fa-credit-card" style={{ fontSize: '1.1rem', color: 'var(--primary-color, #3b82f6)' }}></i>
                            <h5 className="fw-bold mb-0">Add Payment</h5>
                        </div>
                        <button type="button" className="btn-close" onClick={() => setIsSidebarOpen(false)} />
                    </div>

                    {/* Body */}
                    <div className="sidebar-body flex-grow-1 overflow-auto">
                        {/* Student Info Card */}
                        {selectedStudent && (
                            <div className="payment-student-card mb-4">
                                <div className="d-flex align-items-center gap-3">
                                    <img
                                        src={selectedStudent.image || boy}
                                        alt={selectedStudent.name}
                                        className="payment-student-avatar"
                                    />
                                    <div>
                                        <h6 className="fw-bold mb-1">{selectedStudent.name}</h6>
                                        <span className="badge bg-primary rounded-pill me-1">
                                            {selectedStudent.AdmissionNo || selectedStudent.admissionNo || 'N/A'}
                                        </span>
                                        <span className="text-muted small">
                                            {selectedStudent.academicYears?.find(y => y.academicYear === selectedYear)?.class || ''}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Receipt Info */}
                        <div className="payment-receipt-bar mb-4">
                            <div className="d-flex justify-content-between align-items-center">
                                <div className="d-flex align-items-center gap-2">
                                    <i className="fa-solid fa-receipt" style={{ color: 'var(--primary-color, #3b82f6)' }}></i>
                                    <span className="fw-semibold small">Receipt: <strong>{receiptBook.bookName} - {receiptBook.currentNumber}</strong></span>
                                </div>
                                <button className="btn btn-sm btn-outline-secondary" onClick={() => setEditReceiptBook(receiptBook)} data-bs-toggle="collapse" data-bs-target="#ReceiptCollapseSidebar">
                                    <i className="fa-solid fa-pen-to-square me-1"></i>Edit
                                </button>
                            </div>
                            <div className="collapse mt-3" id="ReceiptCollapseSidebar">
                                <div className="p-3 rounded" style={{ background: 'var(--table-header-bg, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)' }}>
                                    {editReceiptBook && (
                                        <div className="d-flex gap-2 align-items-end">
                                            <div className="flex-grow-1">
                                                <label className="form-label small fw-semibold">Book Name</label>
                                                <input type="text" className="form-control form-control-sm" value={editReceiptBook.bookName} onChange={(e) => setEditReceiptBook({ ...editReceiptBook, bookName: e.target.value })} />
                                            </div>
                                            <div style={{ width: '100px' }}>
                                                <label className="form-label small fw-semibold">Start #</label>
                                                <input type="number" className="form-control form-control-sm" value={editReceiptBook.startNumber} onChange={(e) => setEditReceiptBook({ ...editReceiptBook, startNumber: parseInt(e.target.value) })} />
                                            </div>
                                            <button
                                                className="btn btn-sm btn-primary"
                                                onClick={async () => {
                                                    try {
                                                        const res = await updateReceiptBook(editReceiptBook);
                                                        setReceiptBook(res.data);
                                                        setEditReceiptBook({ bookName: "", startNumber: 1 });
                                                        alert("Receipt series updated.");
                                                    } catch (err) {
                                                        alert("Error updating receipt series.");
                                                    }
                                                }}>
                                                Save
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Fee Component Inputs */}
                        <div className="payment-section-label mb-2">
                            <i className="fa-solid fa-indian-rupee-sign me-2"></i>Fee Components
                        </div>
                        <div className="payment-fields-grid mb-4">
                            {feeTemplateFields && feeTemplateFields.length > 0 ? (
                                feeTemplateFields.map((tf, index) => {
                                    const key = (tf.fieldId?.key || tf.key || '').toLowerCase();
                                    if (key === 'class' || key === 'academicyear' || key === 'academic_year') return null;
                                    return (
                                        <div className="payment-field-item" key={index}>
                                            <label className="form-label small fw-semibold">{tf.fieldId?.label || tf.label}</label>
                                            <div className="input-group">
                                                <span className="input-group-text">₹</span>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    value={singlePayment[key] === undefined || singlePayment[key] === null ? "" : singlePayment[key]}
                                                    onChange={(e) => setSinglePayment({
                                                        ...singlePayment,
                                                        [key]: parseFloat(e.target.value) || 0
                                                    })}
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center text-muted py-3" style={{ gridColumn: '1 / -1' }}>
                                    No active fee template fields found.
                                </div>
                            )}
                        </div>

                        {/* Payment Details Section */}
                        <div className="payment-section-label mb-2">
                            <i className="fa-solid fa-file-invoice me-2"></i>Payment Details
                        </div>
                        <div className="payment-fields-grid mb-4">
                            <div className="payment-field-item">
                                <label className="form-label small fw-semibold">Payment Date</label>
                                <input type="date" className="form-control" value={singlePayment.paymentDate} onChange={(e) => setSinglePayment({ ...singlePayment, paymentDate: e.target.value })} />
                            </div>

                            <div className="payment-field-item">
                                <label className="form-label small fw-semibold">Payment By</label>
                                <input type="text" className="form-control" value={singlePayment.paymentBy} onChange={(e) => setSinglePayment({ ...singlePayment, paymentBy: e.target.value })} placeholder="Payer's name" />
                            </div>

                            <div className="payment-field-item">
                                <label className="form-label small fw-semibold">Payment Method</label>
                                <select className="form-select" value={singlePayment.paymentMethod} onChange={(e) => setSinglePayment({ ...singlePayment, paymentMethod: e.target.value })}>
                                    <option value="Cash">Cash</option>
                                    <option value="UPI">UPI</option>
                                    <option value="Bank Transfer">Bank Transfer</option>
                                    <option value="Card">Card</option>
                                </select>
                            </div>

                            <div className="payment-field-item">
                                <label className="form-label small fw-semibold">Discount</label>
                                <div className="input-group">
                                    <span className="input-group-text">₹</span>
                                    <input type="number" className="form-control" value={paymentData.discount} onChange={(e) => setPaymentData({ ...paymentData, discount: e.target.value })} placeholder="0" />
                                </div>
                            </div>
                        </div>

                        {/* New Student Toggle */}
                        <div className="payment-toggle-card mb-3">
                            <div className="d-flex align-items-center justify-content-between">
                                <div className="d-flex align-items-center gap-2">
                                    <i className="fa-solid fa-user-plus" style={{ color: 'var(--primary-color, #3b82f6)' }}></i>
                                    <span className="fw-semibold small">New Student (Include Admission Fee)</span>
                                </div>
                                <div className="form-check form-switch mb-0">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id="isNewStudentSidebar"
                                        checked={paymentData.isNewStudent}
                                        onChange={(e) => setPaymentData({ ...paymentData, isNewStudent: e.target.checked })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="sidebar-footer d-flex justify-content-between align-items-center">
                        <button type="button" className="btn btn-outline-secondary" onClick={() => setIsSidebarOpen(false)}>
                            <i className="fa-solid fa-xmark me-1"></i>Cancel
                        </button>
                        <button type="button" className="btn btn-primary" onClick={() => { submitPayment(); setIsSidebarOpen(false); }} disabled={!(canEdit || canNoDeleteEdit)}>
                            <i className="fa-solid fa-check me-1"></i>Save Payment
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
