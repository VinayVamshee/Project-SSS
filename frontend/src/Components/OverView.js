import React, { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend as RechartsLegend,
    ResponsiveContainer
} from "recharts";
import "./OverView.css";

const customClassOrder = [
    "Pre-Nursery",
    "Nursery",
    "KG-1",
    "KG-2",
    "Class-1", "Class-2", "Class-3", "Class-4", "Class-5",
    "Class-6", "Class-7", "Class-8", "Class-9", "Class-10",
    "Class-11", "Class-12"
];

export default function OverView() {
    const navigate = useNavigate();

    // ==========================================
    // DATA & CALCULATION STATES
    // ==========================================
    const [students, setStudents] = useState([]);
    const [classes, setClasses] = useState([]);
    const [academicYears, setAcademicYears] = useState([]);
    const [allPayments, setAllPayments] = useState([]);
    const [classFeesData, setClassFeesData] = useState([]);

    // The currently active academic year selection
    const [selectedYear, setSelectedYear] = useState("");

    // Calculated states depending on selected year
    const [activeStudents, setActiveStudents] = useState([]);
    const [classStudentCount, setClassStudentCount] = useState({});
    const [studentCountPerYear, setStudentCountPerYear] = useState({});
    const [totalPaidFees, setTotalPaidFees] = useState(0);
    const [totalFeesAmount, setTotalFeesAmount] = useState(0);
    const [totalDiscountAmount, setTotalDiscountAmount] = useState(0);
    const [payableAfterDiscount, setPayableAfterDiscount] = useState(0);
    const [classWiseSummaryData, setClassWiseSummaryData] = useState({});

    // Auth verification
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) navigate("/login");
    }, [navigate]);

    // Fetch primary metadata (students, classes, academic years, fees, class fees)
    const loadInitialData = useCallback(async () => {
        try {
            const [studentRes, classRes, yearRes, feesRes, classFeesRes] = await Promise.all([
                axios.get("https://sss-server-eosin.vercel.app/getStudent"),
                axios.get("https://sss-server-eosin.vercel.app/getClasses"),
                axios.get("https://sss-server-eosin.vercel.app/GetAcademicYear"),
                axios.get("https://sss-server-eosin.vercel.app/getFees"),
                axios.get("https://sss-server-eosin.vercel.app/class-fees")
            ]);

            const studentList = studentRes.data.students || [];
            setStudents(studentList);

            const sortedClasses = (classRes.data.classes || []).sort((a, b) => {
                const indexA = customClassOrder.indexOf(a.class);
                const indexB = customClassOrder.indexOf(b.class);
                return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
            });
            setClasses(sortedClasses);

            const sortedYears = (yearRes.data.data || []).sort(
                (a, b) => parseInt(a.year.split("-")[0]) - parseInt(b.year.split("-")[0])
            );
            setAcademicYears(sortedYears);

            setAllPayments(feesRes.data || []);
            setClassFeesData(classFeesRes.data || []);

            // Set initial selected year to the latest academic year based on student entries
            const allYears = studentList.flatMap((s) => s.academicYears.map((y) => y.academicYear));
            const sortedAcademicYears = allYears
                .filter(Boolean)
                .sort((a, b) => parseInt(b.split("-")[0]) - parseInt(a.split("-")[0]));

            const latest = sortedAcademicYears[0] || (sortedYears[sortedYears.length - 1]?.year || "");
            setSelectedYear(latest);
        } catch (err) {
            console.error("Error loading initial dashboard data:", err);
        }
    }, []);

    useEffect(() => {
        loadInitialData();
    }, [loadInitialData]);

    // ==========================================
    // RE-CALCULATE METRICS WHEN SELECTED YEAR CHANGES
    // ==========================================
    useEffect(() => {
        if (!selectedYear || students.length === 0) return;

        // 1. Calculate active students in selected year
        const activeInSelected = students.filter((student) =>
            student.academicYears.some((year) => year.academicYear === selectedYear && year.status === "Active")
        );
        setActiveStudents(activeInSelected);

        // 2. Count active students per class in selected year
        const classCount = {};
        students.forEach((student) => {
            const activeYearEntry = student.academicYears.find(
                (y) => y.academicYear === selectedYear && y.status === "Active"
            );
            if (activeYearEntry) {
                const cls = activeYearEntry.class;
                classCount[cls] = (classCount[cls] || 0) + 1;
            }
        });
        setClassStudentCount(classCount);

        // 3. Count active students per academic year (line chart history)
        const activeStudentPerYearCount = {};
        students.forEach((s) => {
            s.academicYears.forEach((y) => {
                const year = y.academicYear;
                const status = y.status;
                if (year === selectedYear && status === "Active") {
                    activeStudentPerYearCount[year] = (activeStudentPerYearCount[year] || 0) + 1;
                } else if (year !== selectedYear && status === "Passed") {
                    activeStudentPerYearCount[year] = (activeStudentPerYearCount[year] || 0) + 1;
                }
            });
        });
        setStudentCountPerYear(activeStudentPerYearCount);

        // 4. Calculate total fees paid for selected year
        let totalPaid = 0;
        allPayments.forEach((fee) => {
            const yearData = fee.academicYears.find((y) => y.academicYear === selectedYear);
            if (yearData && yearData.payments && Array.isArray(yearData.payments)) {
                totalPaid += yearData.payments.reduce((sum, p) => sum + p.amount, 0);
            }
        });
        setTotalPaidFees(totalPaid);

        // 5. Calculate school financial parameters (totals, concessions, net targets)
        if (classes.length > 0 && classFeesData.length > 0) {
            let totalFees = 0;
            let totalDiscount = 0;
            let totalPayableAfterDiscount = 0;
            const classWiseSummary = {};

            students.forEach(student => {
                const academicYear = student.academicYears.find(
                    y => y.academicYear === selectedYear && y.status === "Active"
                );
                if (!academicYear) return;

                const studentClassName = academicYear.class;
                const classObj = classes.find(c => c.class === studentClassName);
                const classId = classObj?._id;

                const studentPaymentRecord = allPayments.find(payment => payment.studentId === student._id);

                let fullFee = 0;
                let discount = 0;
                let paidAmount = 0;

                if (studentPaymentRecord) {
                    const yearData = studentPaymentRecord.academicYears.find(y => y.academicYear === selectedYear);
                    if (yearData) {
                        fullFee = yearData.totalFees || 0;
                        discount = yearData.discount || 0;
                        paidAmount = yearData.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
                    }
                }

                if (fullFee === 0) {
                    const yearFees = classFeesData.find(fee => fee.academicYear === selectedYear);
                    const classFees = yearFees?.classes.find(clsFee =>
                        (clsFee.class_id?._id || clsFee.class_id)?.toString() === classId?.toString()
                    );
                    if (classFees) {
                        fullFee =
                            (classFees.admission_fees || 0) * (student.isNewStudent ? 1 : 0) +
                            (classFees.development_fee || 0) +
                            (classFees.exam_fee || 0) +
                            (classFees.progress_card || 0) +
                            (classFees.identity_card || 0) +
                            (classFees.school_diary || 0) +
                            (classFees.school_activity || 0) +
                            (classFees.tuition_fee || 0) +
                            (classFees.late_fee || 0) +
                            (classFees.miscellaneous || 0);
                    }
                }

                const payableAfterDiscountVal = fullFee - discount;
                totalFees += fullFee;
                totalDiscount += discount;
                totalPayableAfterDiscount += payableAfterDiscountVal;

                if (studentClassName) {
                    if (!classWiseSummary[studentClassName]) {
                        classWiseSummary[studentClassName] = { total: 0, paid: 0 };
                    }
                    classWiseSummary[studentClassName].total += payableAfterDiscountVal;
                    classWiseSummary[studentClassName].paid += paidAmount;
                }
            });

            setTotalFeesAmount(totalFees);
            setTotalDiscountAmount(totalDiscount);
            setPayableAfterDiscount(totalPayableAfterDiscount);
            setClassWiseSummaryData(classWiseSummary);
        }

    }, [selectedYear, students, classes, classFeesData, allPayments]);

    // ==========================================
    // RECHARTS DATA FORMATTING
    // ==========================================
    const barChartData = useMemo(() => {
        return classes.map((cls) => ({
            class: cls.class,
            students: classStudentCount[cls.class] || 0
        }));
    }, [classes, classStudentCount]);

    const donutChartData = useMemo(() => {
        const remaining = payableAfterDiscount - totalPaidFees;
        return [
            { name: "Fees Collected", value: totalPaidFees, color: "#10b981" },
            { name: "Pending Balance", value: remaining > 0 ? remaining : 0, color: "#f43f5e" }
        ];
    }, [totalPaidFees, payableAfterDiscount]);

    const lineChartData = useMemo(() => {
        return academicYears.map((year) => ({
            year: year.year,
            students: studentCountPerYear[year.year] || 0
        }));
    }, [academicYears, studentCountPerYear]);

    return (
        <div className="OverView ov-animate-fade">

            {/* Header / Interactive Academic Session Selector */}
            <div className="ov-header-compact">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="ov-dropdown-label" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>Academic Session:</span>
                    <select
                        className="ov-session-select"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                    >
                        <option value="">-- Choose Academic Year --</option>
                        {academicYears.map((y) => (
                            <option key={y._id} value={y.year}>{y.year}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Core School Stats Metric Cards */}
            <div className="ov-stats-grid">
                <div className="ov-stat-card">
                    <div className="ov-icon-wrapper students"><i className="fa-solid fa-graduation-cap"></i></div>
                    <div className="ov-stat-info">
                        <strong>{activeStudents.length}</strong>
                        <span>Active Students</span>
                    </div>
                </div>

                <div className="ov-stat-card">
                    <div className="ov-icon-wrapper staff"><i className="fa-solid fa-user-tie"></i></div>
                    <div className="ov-stat-info">
                        <strong>10</strong>
                        <span>Total Staff</span>
                    </div>
                </div>

                <div className="ov-stat-card">
                    <div className="ov-icon-wrapper collected"><i className="fa-solid fa-indian-rupee-sign"></i></div>
                    <div className="ov-stat-info">
                        <strong>₹{totalPaidFees.toLocaleString("en-IN")}</strong>
                        <span>Collected Fees</span>
                    </div>
                </div>

                <div className="ov-stat-card">
                    <div className="ov-icon-wrapper concession"><i className="fa-solid fa-tags"></i></div>
                    <div className="ov-stat-info">
                        <strong>₹{totalDiscountAmount.toLocaleString("en-IN")}</strong>
                        <span>Concessions Granted</span>
                    </div>
                </div>

                <div className="ov-stat-card">
                    <div className="ov-icon-wrapper payable"><i className="fa-solid fa-calculator"></i></div>
                    <div className="ov-stat-info">
                        <strong>₹{payableAfterDiscount.toLocaleString("en-IN")}</strong>
                        <span>Payable Balance</span>
                    </div>
                </div>

                <div className="ov-stat-card">
                    <div className="ov-icon-wrapper total-fees"><i className="fa-solid fa-receipt"></i></div>
                    <div className="ov-stat-info">
                        <strong>₹{totalFeesAmount.toLocaleString("en-IN")}</strong>
                        <span>Total Gross Target</span>
                    </div>
                </div>
            </div>

            {/* Charts Row using Recharts */}
            <div className="ov-charts-grid">
                <div className="ov-chart-card">
                    <h4>Enrollment Distribution per Class</h4>
                    <div className="ov-chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="class" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                                <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" />
                                <RechartsTooltip contentStyle={{ fontSize: '11px', borderRadius: '6px' }} />
                                <Bar dataKey="students" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={14} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="ov-chart-card">
                    <h4>Collection Progress Distribution</h4>
                    <div className="ov-chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={donutChartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius="65%"
                                    outerRadius="85%"
                                    paddingAngle={3}
                                    dataKey="value"
                                >
                                    {donutChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <RechartsTooltip formatter={(value) => `₹${value.toLocaleString("en-IN")}`} contentStyle={{ fontSize: '11px', borderRadius: '6px' }} />
                                <RechartsLegend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '11px', marginTop: '10px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="ov-charts-grid">
                <div className="ov-chart-card">
                    <h4>Enrollment Growth History</h4>
                    <div className="ov-chart-container" style={{ minHeight: '180px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="year" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                                <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                                <RechartsTooltip contentStyle={{ fontSize: '11px', borderRadius: '6px' }} />
                                <Line type="monotone" dataKey="students" stroke="#8b5cf6" strokeWidth={2.5} activeDot={{ r: 6 }} dot={{ r: 3 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Class wise detailed metrics */}
                <div className="ov-table-card">
                    <h4>Class-wise Fee Collection Progress</h4>
                    <div className="ov-table-wrapper">
                        <table className="ov-table">
                            <thead>
                                <tr>
                                    <th>Class</th>
                                    <th>Progress & Collection Target</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.keys(classWiseSummaryData).length === 0 ? (
                                    <tr>
                                        <td colSpan="2" style={{ textAlign: 'center', color: '#64748b' }}>No data loaded</td>
                                    </tr>
                                ) : (
                                    Object.entries(classWiseSummaryData).sort(([classA], [classB]) => {
                                        const indexA = customClassOrder.indexOf(classA);
                                        const indexB = customClassOrder.indexOf(classB);
                                        return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
                                    }).map(([cls, data], idx) => {
                                        const total = data.total;
                                        const paid = data.paid;
                                        const progress = total > 0 ? (paid / total) * 100 : 0;

                                        return (
                                            <tr key={idx}>
                                                <td style={{ fontWeight: 600 }}>{cls}</td>
                                                <td>
                                                    <div className="ov-progress-container">
                                                        <div className="ov-progress-bar-bg">
                                                            <div className="ov-progress-fill" style={{ width: `${progress}%`, backgroundColor: progress >= 100 ? '#10b981' : '#3b82f6' }}></div>
                                                        </div>
                                                        <span className="ov-progress-text">
                                                            ₹{paid.toLocaleString("en-IN")} / ₹{total.toLocaleString("en-IN")}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

        </div>
    );
}
