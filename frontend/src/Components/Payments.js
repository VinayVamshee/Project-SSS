import React, { useEffect, useState } from "react";
import axios from "axios";
import boy from "./Images/bussiness-man.png";
import { generatePdf } from "./DownloadReceipt";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";


export default function Payments() {

    const navigate = useNavigate();
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
        }
    }, [navigate]);    

    const [students, setStudents] = useState([]);
    const [feesData, setFeesData] = useState([]);
    const [classFeesData, setClassFeesData] = useState([]);
    const [selectedYear, setSelectedYear] = useState("");
    const [academicYears, setAcademicYears] = useState([]);
    const [selectedClass, setSelectedClass] = useState("");
    const [classes, setClasses] = useState([]);
    const [searchStudent, setSearchStudent] = useState("");

    const [selectedStudent, setSelectedStudent] = useState(null);

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


            // Fetch fees data for students
            const feesResponse = await axios.get("https://sss-server-eosin.vercel.app/getFees");
            setFeesData(feesResponse.data || []);

            // Fetch fee structure for all classes
            const classFeesResponse = await axios.get("https://sss-server-eosin.vercel.app/class-fees");
            setClassFeesData(classFeesResponse.data || []);

        } catch (error) {
            console.error("Error fetching data:", error);
        }
    };


    useEffect(() => {
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

    const handleGeneratePdf = (studentFees, payment, student, selectedYear, paidFees) => {
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

        generatePdf(selectedFees, payment, student, selectedYear, paidFees);
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
                "S.No","Receipt No.", "Payment Date", "Amount (₹)", "Payment Method", "Payment By",
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

    const [paymentData, setPaymentData] = useState({
        academicYear: "",
        totalFees: "",
        discount: "",
        isNewStudent: false,
        payments: []
    });

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

        // Reset payment details using setSinglePayment
        setSinglePayment({
            admission_fees: null,
            development_fee: null,
            exam_fee: null,
            progress_card: null,
            identity_card: null,
            school_diary: null,
            school_activity: null,
            tuition_fee: null,
            late_fee: null,
            miscellaneous: null,
            paymentDate: null,
            paymentMethod: "Cash",
            paymentBy: null,
            amount: null
        });

        try {
            const receiptRes = await axios.get("https://sss-server-eosin.vercel.app/receiptBook");
            setReceiptBook(receiptRes.data);
        } catch (err) {
            console.error("Error fetching receipt series", err);
        }


        try {
            const response = await axios.get(
                `https://sss-server-eosin.vercel.app/getFees?studentId=${student._id}&academicYear=${selectedYear}`
            );
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
        const studentClassFee = classFeesData.find(fee => fee.class_id === classId);

        if (!studentClassFee) {
            console.error("❌ No fee structure found for this class.");
            alert("Fee structure not found for this student.");
            return;
        }

        const admissionFees = Number(studentClassFee.admission_fees) || 0;
        const developmentFee = Number(studentClassFee.development_fee) || 0;
        const examFee = Number(studentClassFee.exam_fee) || 0;
        const progressCard = Number(studentClassFee.progress_card) || 0;
        const identityCard = Number(studentClassFee.identity_card) || 0;
        const schoolDiary = Number(studentClassFee.school_diary) || 0;
        const schoolActivity = Number(studentClassFee.school_activity) || 0;
        const tuitionFee = Number(studentClassFee.tuition_fee) || 0;
        const lateFee = Number(studentClassFee.late_fee) || 0;
        const miscellaneous = Number(studentClassFee.miscellaneous) || 0;

        let adjustedTotalFees = developmentFee + examFee + progressCard + identityCard + schoolDiary + schoolActivity + tuitionFee + lateFee + miscellaneous;
        if (paymentData.isNewStudent) {
            adjustedTotalFees += admissionFees;
        }
        const paymentDetails = {
            studentId: selectedStudent._id,
            academicYear: selectedYear,
            totalFees: adjustedTotalFees,
            discount: Number(paymentData.discount) || 0,
            isNewStudent: paymentData.isNewStudent,

            // Payment Info
            newPayment: {
                amount: Number((singlePayment.admission_fees || 0) + (singlePayment.development_fee || 0) + (singlePayment.exam_fee || 0) + (singlePayment.progress_card || 0) + (singlePayment.identity_card || 0) + (singlePayment.school_diary || 0) + (singlePayment.school_activity || 0) + (singlePayment.tuition_fee || 0) + (singlePayment.late_fee || 0) + (singlePayment.miscellaneous || 0)),
                date: singlePayment.paymentDate ? new Date(singlePayment.paymentDate) : new Date(),
                paymentMethod: singlePayment.paymentMethod,
                paymentBy: singlePayment.paymentBy,
                admission_fees: Number(singlePayment.admission_fees) || 0,
                development_fee: Number(singlePayment.development_fee) || 0,
                exam_fee: Number(singlePayment.exam_fee) || 0,
                progress_card: Number(singlePayment.progress_card) || 0,
                identity_card: Number(singlePayment.identity_card) || 0,
                school_diary: Number(singlePayment.school_diary) || 0,
                school_activity: Number(singlePayment.school_activity) || 0,
                tuition_fee: Number(singlePayment.tuition_fee) || 0,
                late_fee: Number(singlePayment.late_fee) || 0,
                miscellaneous: Number(singlePayment.miscellaneous) || 0,
                receiptBookName: receiptBook.bookName || "",
                receiptNumber: receiptBook.currentNumber || 0
            }
        };

        try {
            const response = await axios.post("https://sss-server-eosin.vercel.app/saveFees", paymentDetails);
            const updatedReceipt = await axios.patch("https://sss-server-eosin.vercel.app/incrementReceipt");
            setReceiptBook(updatedReceipt.data);

            if (response.status === 200) {
                alert("Payment added successfully!");
                setSinglePayment({ paymentAmount: "", paymentDate: "", paymentBy: "", paymentMethod: "Cash", admission_fees: "", development_fee: "", exam_fee: "", progress_card: "", identity_card: "", school_diary: "", school_activity: "", tuition_fee: "", late_fee: "", miscellaneous: "" });
                setPaymentData(prev => ({ ...prev, discount: "0", isNewStudent: false, academicYear: "", totalFees: "" }));
                fetchData();
            }

        } catch (error) {
            console.error("Error adding payment:", error);
            alert("Failed to add payment.");
        }
    };

    const [classFees, setClassFees] = useState({
        class_id: '',
        admission_fees: '',
        development_fee: '',
        exam_fee: '',
        progress_card: '',
        identity_card: '',
        school_diary: '',
        school_activity: '',
        tuition_fee: '',
    });

    const handleSubmitClassFees = async () => {
        try {
            await axios.post('https://sss-server-eosin.vercel.app/class-fees', classFees);
            alert('Fee Strucutre Updated');
            window.location.reload();
        } catch (error) {
            console.error("Error saving class fees", error);
        }
    };

    return (
        <div className='PaymentsPage'>
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
                <button className="btn btn-save" type="button" data-bs-toggle="collapse" data-bs-target="#collapseFeeStructure" aria-expanded="false" aria-controls="collapseFeeStructure"><i className="fa-solid fa-money-check-dollar fa-lg me-2"></i>Fee Structure</button>
            </div>

            <div className="collapse" id="collapseFeeStructure">
                <div className="card card-body">
                    <table className="table table-bordered">
                        <thead>
                            <tr>
                                <th>Class</th>
                                <th>Admission Fees</th>
                                <th>Development Fee</th>
                                <th>Exam Fee</th>
                                <th>Progress Card</th>
                                <th>Identity Card</th>
                                <th>School Diary</th>
                                <th>School Activity</th>
                                <th>Tuition Fee</th>
                                <th>Total Fees</th>
                            </tr>

                        </thead>
                        <tbody>
                            {classFeesData
                                .filter((fee) => fee.class_id) // Ensure class_id exists
                                .sort((a, b) => {
                                    const classA = classes.find(cls => cls._id === a.class_id)?.class || "0";
                                    const classB = classes.find(cls => cls._id === b.class_id)?.class || "0";
                                    return Number(classA) - Number(classB);
                                })
                                .map((fee) => {
                                    const className = classes.find(cls => cls._id === fee.class_id)?.class || "Deleted Class";

                                    return (
                                        <tr key={fee._id}>
                                            <td>{className}</td>
                                            <td>{fee.admission_fees || 0}</td>
                                            <td>{fee.development_fee || 0}</td>
                                            <td>{fee.exam_fee || 0}</td>
                                            <td>{fee.progress_card || 0}</td>
                                            <td>{fee.identity_card || 0}</td>
                                            <td>{fee.school_diary || 0}</td>
                                            <td>{fee.school_activity || 0}</td>
                                            <td>{fee.tuition_fee || 0}</td>
                                            <td>{(fee.admission_fees || 0) + (fee.development_fee || 0) + (fee.exam_fee || 0) + (fee.progress_card || 0) + (fee.identity_card || 0) + (fee.school_diary || 0) + (fee.school_activity || 0) + (fee.tuition_fee || 0) + (fee.late_fee || 0) + (fee.miscellaneous || 0)}</td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>

                    <button type="button" className="btn btn-outline-success" data-bs-toggle="modal" data-bs-target="#AddClassFees">
                        Add/Edit Fee Strucutre
                    </button>


                    <div className="modal fade" id="AddClassFees" tabIndex="-1" aria-labelledby="AddClassFeesLabel" aria-hidden="true">
                        <div className="modal-dialog modal-lg">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title" id="AddClassFeesLabel">Manage Class Fees</h5>
                                    <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                </div>

                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label className="form-label">Select Class</label>
                                        <select className="form-control" name="class_id" value={classFees.class_id} onChange={(e) => setClassFees({ ...classFees, class_id: e.target.value })} >
                                            <option value="">Select a class</option>
                                            {classes.map((cls) => (
                                                <option key={cls._id} value={cls._id}>{cls.class}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">Admission Fees</label>
                                        <input type="number" className="form-control" name="admission_fees" value={classFees.admission_fees} onChange={(e) => setClassFees({ ...classFees, admission_fees: e.target.value })} />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">Development Fee</label>
                                        <input type="number" className="form-control" name="development_fee" value={classFees.development_fee} onChange={(e) => setClassFees({ ...classFees, development_fee: e.target.value })} />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">Exam Fee</label>
                                        <input type="number" className="form-control" name="exam_fee" value={classFees.exam_fee} onChange={(e) => setClassFees({ ...classFees, exam_fee: e.target.value })} />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">Progress Card</label>
                                        <input type="number" className="form-control" name="progress_card" value={classFees.progress_card} onChange={(e) => setClassFees({ ...classFees, progress_card: e.target.value })} />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">Identity Card</label>
                                        <input type="number" className="form-control" name="identity_card" value={classFees.identity_card} onChange={(e) => setClassFees({ ...classFees, identity_card: e.target.value })} />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">School Diary</label>
                                        <input type="number" className="form-control" name="school_diary" value={classFees.school_diary} onChange={(e) => setClassFees({ ...classFees, school_diary: e.target.value })} />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">School Activity</label>
                                        <input type="number" className="form-control" name="school_activity" value={classFees.school_activity} onChange={(e) => setClassFees({ ...classFees, school_activity: e.target.value })} />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">Tuition Fee</label>
                                        <input type="number" className="form-control" name="tuition_fee" value={classFees.tuition_fee} onChange={(e) => setClassFees({ ...classFees, tuition_fee: e.target.value })} />
                                    </div>

                                </div>

                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                    <button type="button" className="btn btn-primary" onClick={handleSubmitClassFees}>Save Changes</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

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
                        const classFees = classFeesData.find(fee => fee.class_id === classId);

                        if (classFees) {
                            let total = (classFees.development_fee || 0) + (classFees.exam_fee || 0) + (classFees.progress_card || 0) + (classFees.identity_card || 0) + (classFees.school_diary || 0) + (classFees.school_activity || 0) + (classFees.tuition_fee || 0) + (classFees.late_fee || 0) + (classFees.miscellaneous || 0);
                            if (element.isNewStudent) {
                                total += (classFees.admission_fees || 0);
                            }
                            totalFees = total - (discount || 0);
                            paidFees = 0;
                        }
                    }

                    return (
                        <div key={element._id}>

                            <div className="Payment" key={idx} style={{ animationDelay: `${idx * 0.15}s` }}>
                                <div className="Name">
                                    <img src={element.image || boy} alt="..." />
                                    <strong>{element.name}</strong>
                                </div>
                                <div className="class">
                                    <strong>Class:</strong> {studentClass}
                                </div>
                                <div className="fees-container">
                                    <div className="fees-bar">
                                        <div
                                            className="fees-progress"
                                            style={{ width: totalFees !== "NA" ? `${(paidFees / totalFees) * 100}%` : "0%" }}
                                        />
                                    </div>
                                    <span className="fees-text">
                                        ₹{paidFees} / ₹{totalFees}
                                    </span>
                                </div>
                                <button type="button" className="btn btn-paymentHistory" onClick={() => handleDownloadExcel(element, feesData, selectedYear)} > <i className="fa-solid fa-file-arrow-down me-2"></i>Download History </button>
                                <button className="btn btn-paymentHistory" type="button" data-bs-toggle="collapse" data-bs-target={`#HistoryCollapse-${element._id}`} aria-expanded="false" aria-controls={`HistoryCollapse-${element._id}`}><i className="fa-solid fa-clock-rotate-left me-1"></i> History<i className="fa-solid fa-caret-down ms-2"></i></button>
                                <button type="button" className="btn btn-paymentHistory" data-bs-toggle="modal" data-bs-target="#addPaymentModal" onClick={() => handleOpenPaymentModal(element)}>
                                    <i className="fa-solid fa-credit-card me-1"></i> Add Payment
                                </button>

                            </div>


                            <div className="collapse mt-2" id={`HistoryCollapse-${element._id}`}>
                                <div className="card card-body">
                                    <h6 style={{ textAlign: 'center' }}>Payment History</h6>
                                    <table className="table table-bordered mt-3">
                                        <thead className="table-dark">
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
                                                                onClick={() => handleGeneratePdf(studentFees, payment, element, selectedYear, paidFees)}
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
                    );
                })}
            </div>

            {/* Add Payment */}
            <div className="modal fade" id="addPaymentModal" tabIndex="-1" aria-labelledby="addPaymentModalLabel" aria-hidden="true">
                <div className="modal-dialog modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title" id="addPaymentModalLabel">Add Payment for {selectedStudent?.name}</h5>
                            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div className="modal-body">

                            <div className="alert alert-info d-flex justify-content-between align-items-center">
                                <span>Current Receipt: <strong>{receiptBook.bookName} - {receiptBook.currentNumber}</strong></span>
                                <button className="btn btn-sm btn-save" data-bs-toggle="collapse" data-bs-target="#ReceiptCollapse" aria-expanded="false" aria-controls="ReceiptCollapse" onClick={() => setEditReceiptBook(receiptBook)}>Edit</button>
                            </div>

                            <div className="collapse my-3" id="ReceiptCollapse">
                                <div className="card card-body">
                                    {editReceiptBook && (
                                        <div className="mb-3 d-flex gap-2 align-items-end">
                                            <div>
                                                <label className="form-label">New Book Name</label>
                                                <input type="text" className="form-control" value={editReceiptBook.bookName} onChange={(e) => setEditReceiptBook({ ...editReceiptBook, bookName: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="form-label">Start Number</label>
                                                <input type="number" className="form-control" value={editReceiptBook.startNumber} onChange={(e) => setEditReceiptBook({ ...editReceiptBook, startNumber: parseInt(e.target.value) })} />
                                            </div>
                                            <button
                                                className="btn btn-save"
                                                onClick={async () => {
                                                    try {
                                                        const res = await axios.post("https://sss-server-eosin.vercel.app/updateReceiptBook", editReceiptBook);
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

                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Admission Fees</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={singlePayment.admission_fees}
                                        onChange={(e) => setSinglePayment({ ...singlePayment, admission_fees: parseFloat(e.target.value) })}
                                        placeholder="Enter admission fees"
                                    />
                                </div>

                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Development Fee</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={singlePayment.development_fee}
                                        onChange={(e) => setSinglePayment({ ...singlePayment, development_fee: parseFloat(e.target.value) })}
                                        placeholder="Enter development fee"
                                    />
                                </div>

                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Exam Fee</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={singlePayment.exam_fee}
                                        onChange={(e) => setSinglePayment({ ...singlePayment, exam_fee: parseFloat(e.target.value) })}
                                        placeholder="Enter exam fee"
                                    />
                                </div>

                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Progress Card</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={singlePayment.progress_card}
                                        onChange={(e) => setSinglePayment({ ...singlePayment, progress_card: parseFloat(e.target.value) })}
                                        placeholder="Enter progress card fee"
                                    />
                                </div>

                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Identity Card</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={singlePayment.identity_card}
                                        onChange={(e) => setSinglePayment({ ...singlePayment, identity_card: parseFloat(e.target.value) })}
                                        placeholder="Enter identity card fee"
                                    />
                                </div>

                                <div className="col-md-6 mb-3">
                                    <label className="form-label">School Diary</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={singlePayment.school_diary}
                                        onChange={(e) => setSinglePayment({ ...singlePayment, school_diary: parseFloat(e.target.value) })}
                                        placeholder="Enter school diary fee"
                                    />
                                </div>

                                <div className="col-md-6 mb-3">
                                    <label className="form-label">School Activity</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={singlePayment.school_activity}
                                        onChange={(e) => setSinglePayment({ ...singlePayment, school_activity: parseFloat(e.target.value) })}
                                        placeholder="Enter school activity fee"
                                    />
                                </div>

                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Tuition Fee</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={singlePayment.tuition_fee}
                                        onChange={(e) => setSinglePayment({ ...singlePayment, tuition_fee: parseFloat(e.target.value) })}
                                        placeholder="Enter tuition fee"
                                    />
                                </div>

                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Late Fee</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={singlePayment.late_fee}
                                        onChange={(e) => setSinglePayment({ ...singlePayment, late_fee: parseFloat(e.target.value) })}
                                        placeholder="Enter late fee"
                                    />
                                </div>

                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Miscellaneous</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={singlePayment.miscellaneous}
                                        onChange={(e) => setSinglePayment({ ...singlePayment, miscellaneous: parseFloat(e.target.value) })}
                                        placeholder="Enter miscellaneous fees"
                                    />
                                </div>

                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Payment Date</label>
                                    <input type="date" className="form-control" value={singlePayment.paymentDate} onChange={(e) => setSinglePayment({ ...singlePayment, paymentDate: e.target.value })} />
                                </div>

                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Payment By</label>
                                    <input type="text" className="form-control" value={singlePayment.paymentBy} onChange={(e) => setSinglePayment({ ...singlePayment, paymentBy: e.target.value })} placeholder="Enter payer's name" />
                                </div>

                                <div className="col-md-6 mb-3">
                                    <label className="form-label">Payment Method</label>
                                    <select className="form-select" value={singlePayment.paymentMethod} onChange={(e) => setSinglePayment({ ...singlePayment, paymentMethod: e.target.value })}>
                                        <option value="Cash">Cash</option>
                                        <option value="UPI">UPI</option>
                                        <option value="Bank Transfer">Bank Transfer</option>
                                        <option value="Card">Card</option>
                                    </select>
                                </div>

                                <div className="col-md-6 mb-3 mt-4">
                                    <input
                                        type="checkbox"
                                        className="form-check-input me-2"
                                        id="isNewStudent"
                                        checked={paymentData.isNewStudent}
                                        onChange={(e) => setPaymentData({ ...paymentData, isNewStudent: e.target.checked })}
                                    />
                                    <label className="form-check-label" htmlFor="isNewStudent">Is New Student</label>
                                </div>

                                <div className="col-md-6 mb-3">
                                    <label className="form-label">One Time Discount</label>
                                    <input type="number" className="form-control" value={paymentData.discount} onChange={(e) => setPaymentData({ ...paymentData, discount: e.target.value })} placeholder="Enter discount amount" />
                                </div>
                            </div>
                        </div>


                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            <button type="button" className="btn btn-primary" onClick={submitPayment}>Save Payment</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
