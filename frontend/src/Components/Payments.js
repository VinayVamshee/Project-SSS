import React, { useEffect, useState } from "react";
import axios from "axios";
import boy from "./Images/bussiness-man.png";
import { generatePdf } from "./DownloadReceipt";
import * as XLSX from "xlsx";


export default function Payments() {
    const [students, setStudents] = useState([]);
    const [feesData, setFeesData] = useState([]);
    const [classFeesData, setClassFeesData] = useState([]);
    const [selectedYear, setSelectedYear] = useState("");
    const [academicYears, setAcademicYears] = useState([]);
    const [selectedClass, setSelectedClass] = useState("");
    const [classes, setClasses] = useState([]);
    const [searchStudent, setSearchStudent] = useState("");

    const [selectedStudent, setSelectedStudent] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const studentResponse = await axios.get("http://localhost:3001/getStudent");
                setStudents(studentResponse.data.students || []);

                const yearResponse = await axios.get("http://localhost:3001/GetAcademicYear");
                const sortedYears = (yearResponse.data.data || []).sort((a, b) =>
                    parseInt(b.year.split("-")[0]) - parseInt(a.year.split("-")[0])
                );

                setAcademicYears(sortedYears);
                if (sortedYears.length > 0) {
                    setSelectedYear(sortedYears[0].year);
                }

                const classResponse = await axios.get("http://localhost:3001/getClasses");
                setClasses(classResponse.data.classes || []);

                // Fetch fees data for students
                const feesResponse = await axios.get("http://localhost:3001/getFees");
                setFeesData(feesResponse.data || []);

                // Fetch fee structure for all classes
                const classFeesResponse = await axios.get("http://localhost:3001/class-fees");
                setClassFeesData(classFeesResponse.data || []);

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

    const handleGeneratePdf = (studentFees, payment, student, selectedYear) => {
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

        generatePdf(selectedFees, payment, student, selectedYear);
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

        // Create header information
        const headerData = [
            ["Student Name:", student.name],
            ["Academic Year:", selectedYear],
            ["Total Fees:", academicYearFees.totalFees],
            ["Discount:", academicYearFees.discount],
            ["Is New Student:", academicYearFees.isNewStudent ? "Yes" : "No"],
            [],
            ["S.No", "Payment Date", "Amount (₹)", "Payment Method", "Payment By"]
        ];

        // Prepare payment history data
        const paymentHistory = payments.map((payment, index) => [
            index + 1,
            new Date(payment.date).toLocaleDateString('en-GB'),
            payment.amount,
            payment.paymentMethod ?? "Unknown", // If missing, show "Unknown"
            payment.paymentBy ?? "Unknown" // If missing, show "Unknown"
        ]);

        // Add total and remaining fees rows
        paymentHistory.push(
            ["", "Total Fees", academicYearFees.totalFees, "", ""],
            ["", "Remaining Fees", academicYearFees.totalFees - payments.reduce((sum, payment) => sum + payment.amount, 0), "", ""]
        );

        // Combine header and data
        const finalSheetData = [...headerData, ...paymentHistory];

        // Create worksheet and workbook
        const worksheet = XLSX.utils.aoa_to_sheet(finalSheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Payment History");

        // Generate and download the Excel file
        const fileName = `${student.name}_Fees_${selectedYear}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    };

    const [paymentAmount, setPaymentAmount] = useState("");
    const [paymentDate, setPaymentDate] = useState("");
    const [paymentBy, setPaymentBy] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("Cash");
    const [isNewStudent, setIsNewStudent] = useState(false);
    const [discount, setDiscount] = useState("");

    const handleOpenPaymentModal = async (student) => {
        setSelectedStudent(student);
        setPaymentAmount("");
        setPaymentDate("");
        setPaymentBy("");
        setPaymentMethod("Cash");

        try {
            const response = await axios.get(
                `http://localhost:3001/getFees?studentId=${student._id}&academicYear=${selectedYear}`
            );
            const { discount, isNewStudent } = response.data;

            setDiscount(discount || 0);
            setIsNewStudent(isNewStudent ?? false);
        } catch (error) {
            console.error("Error fetching fee details:", error);
        }
    };


    const submitPayment = async () => {
        if (!selectedStudent || !paymentAmount || !paymentDate || !paymentBy) {
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
        const schoolFees = Number(studentClassFee.school_fees) || 0;
        const tuitionFees = Number(studentClassFee.tuition_fees) || 0;

        let adjustedTotalFees = schoolFees + tuitionFees;
        if (isNewStudent) {
            adjustedTotalFees += admissionFees;
        }

        const paymentData = {
            studentId: selectedStudent._id,
            academicYear: selectedYear,
            totalFees: adjustedTotalFees,
            discount: Number(discount) || 0, 
            isNewStudent: isNewStudent,
            newPayment: {
                amount: Number(paymentAmount), 
                date: paymentDate ? new Date(paymentDate) : new Date(),
                paymentMethod: paymentMethod,
                paymentBy: paymentBy
            }
        };

        try {
            const response = await axios.post("http://localhost:3001/saveFees", paymentData);

            if (response.status === 200) {
                alert("Payment added successfully!");
                setPaymentAmount("");
                setPaymentDate("");
                setPaymentBy("");
                setPaymentMethod("Cash");
                setDiscount('0');
                window.location.reload();
            }
        } catch (error) {
            console.error("Error adding payment:", error);
            alert("Failed to add payment.");
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
                <button className="btn btn-save"><i class="fa-solid fa-money-check-dollar fa-lg me-2"></i>Fee Structure</button>
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
                            totalFees = (element.isNewStudent
                                ? classFees.admission_fees + classFees.school_fees + classFees.tuition_fees
                                : classFees.school_fees + classFees.tuition_fees
                            ) - discount;
                            paidFees = 0; // No payment made yet
                        }
                    }

                    return (
                        <div key={element._id}>

                            <div className="Payment" key={idx}>
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
                                <button className="btn btn-paymentHistory" type="button" data-bs-toggle="collapse" data-bs-target={`#collapseExample-${element._id}`} aria-expanded="false" aria-controls={`collapseExample-${element._id}`}><i className="fa-solid fa-clock-rotate-left me-1"></i> History<i className="fa-solid fa-caret-down ms-2"></i></button>
                                <button type="button" className="btn btn-paymentHistory" data-bs-toggle="modal" data-bs-target="#addPaymentModal" onClick={() => handleOpenPaymentModal(element)}>
                                <i class="fa-solid fa-credit-card me-1"></i> Add Payment
                                </button>

                            </div>


                            <div className="collapse mt-2" id={`collapseExample-${element._id}`}>
                                <div className="card card-body">
                                    <h6 style={{ textAlign: 'center' }}>Payment History</h6>
                                    <table className="table table-bordered mt-3">
                                        <thead>
                                            <tr>
                                                <th>S. No</th>
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
                                                        <td>{payment.paymentBy}</td>
                                                        <td>{payment.paymentMethod}</td>
                                                        <td>{new Date(payment.date).toLocaleDateString('en-GB')}</td>
                                                        <td>₹{payment.amount}</td>
                                                        <td>
                                                            <button
                                                                className="btn btn-sm btn-outline-success"
                                                                onClick={() => handleGeneratePdf(studentFees, payment, element, selectedYear)}
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
                <div className="modal-dialog">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title" id="addPaymentModalLabel">Add Payment for {selectedStudent?.name}</h5>
                            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div className="modal-body">
                            <div className="mb-3">
                                <label className="form-label">Payment Amount</label>
                                <input type="number" className="form-control" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="Enter amount" />
                            </div>

                            <div className="mb-3">
                                <label className="form-label">Payment Date</label>
                                <input type="date" className="form-control" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                            </div>

                            <div className="mb-3">
                                <label className="form-label">Payment By</label>
                                <input type="text" className="form-control" value={paymentBy} onChange={(e) => setPaymentBy(e.target.value)} placeholder="Enter payer's name" />
                            </div>

                            <div className="mb-3">
                                <label className="form-label">Payment Method</label>
                                <select className="form-select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                                    <option value="Cash">Cash</option>
                                    <option value="UPI">UPI</option>
                                    <option value="Bank Transfer">Bank Transfer</option>
                                    <option value="Card">Card</option>
                                </select>
                            </div>
                            <div className="form-check mb-3">
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    id="isNewStudent"
                                    checked={isNewStudent}
                                    onChange={(e) => setIsNewStudent(e.target.checked)}
                                />
                                <label className="form-check-label" htmlFor="isNewStudent">Is New Student</label>
                            </div>

                            <div className="mb-3">
                                <label className="form-label">One Time Discount</label>
                                <input type="number" className="form-control" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="Enter discount amount" />
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
