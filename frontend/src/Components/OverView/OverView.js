import React, { useEffect, useState, useMemo, useCallback } from "react";
import { getStudents, getClasses, getAcademicYears, getFees, getClassFees } from "../../API";
import { useNavigate } from "react-router-dom";
import {
    BarChart,
    Bar,
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
    "Class-11", "Class-12", "Grade-1", "Grade-2", "Grade-3"
];

export default function OverView() {
    const navigate = useNavigate();

    const activeTheme = localStorage.getItem("theme") || "light";

    const themeColors = useMemo(() => {
        const colors = {
            light: { success: '#10b981', warning: '#f59e0b', neutral: '#cbd5e1', primary: '#3b82f6', secondary: '#8b5cf6' },
            dark: { success: '#1dd1a1', warning: '#ff9f43', neutral: '#614242', primary: '#D84224', secondary: '#9b5cf6' },
            'midnight-red': { success: '#34d399', warning: '#f54040', neutral: '#4a1f1f', primary: '#D91E36', secondary: '#A0153E' },
            Ocean: { success: '#00e676', warning: '#ffb300', neutral: '#cbd5e1', primary: '#4A90E2', secondary: '#1565C0' },
            'Deep Ocean': { success: '#81c995', warning: '#f28b82', neutral: '#0e4c82', primary: '#1B6FA8', secondary: '#3EA6FF' },
            Earth: { success: '#8d6e63', warning: '#d7ccc8', neutral: '#bcaaa4', primary: '#AB886D', secondary: '#332720' },
            'Charcoal Cyan': { success: '#4caf50', warning: '#ff5252', neutral: '#444b5d', primary: '#00BCD4', secondary: '#0097A7' },
            'Dracula Midnight': { success: '#50fa7b', warning: '#ff5555', neutral: '#6272a4', primary: '#BD93F9', secondary: '#FF79C6' }
        };
        return colors[activeTheme] || colors.light;
    }, [activeTheme]);

    const COLORS = useMemo(() => {
        return [themeColors.primary, themeColors.secondary, themeColors.success, themeColors.warning, "#ec4899", "#374151"];
    }, [themeColors]);

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
    const [totalPaidFees, setTotalPaidFees] = useState(0);
    const [totalFeesAmount, setTotalFeesAmount] = useState(0);
    const [totalDiscountAmount, setTotalDiscountAmount] = useState(0);
    const [payableAfterDiscount, setPayableAfterDiscount] = useState(0);
    const [classWiseSummaryData, setClassWiseSummaryData] = useState({});
    const [paymentMethodData, setPaymentMethodData] = useState([]);

    // Auth verification
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) navigate("/login");
    }, [navigate]);

    // Fetch primary metadata
    const loadInitialData = useCallback(async () => {
        try {
            const [studentRes, classRes, yearRes, feesRes, classFeesRes] = await Promise.all([
                getStudents(),
                getClasses(),
                getAcademicYears(),
                getFees(),
                getClassFees()
            ]);

            // Map enrollments to academicYears for legacy calculations compatibility
            const studentList = (studentRes.data.students || []).map(s => ({
                ...s,
                academicYears: (s.enrollments || []).map(e => ({
                    academicYear: e.academicYear?.name || e.academicYear?.toString() || "",
                    class: e.class,
                    status: e.status
                }))
            }));
            setStudents(studentList);

            const sortedClasses = (classRes.data.classes || []).sort((a, b) => {
                const indexA = customClassOrder.indexOf(a.class);
                const indexB = customClassOrder.indexOf(b.class);
                return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
            });
            setClasses(sortedClasses);

            const sortedYears = (yearRes.data.data || []).sort((a, b) => {
                const yearA = a.name || a.year || "";
                const yearB = b.name || b.year || "";
                return parseInt(yearA.split("-")[0] || 0) - parseInt(yearB.split("-")[0] || 0);
            });
            setAcademicYears(sortedYears);

            setAllPayments(feesRes.data || []);
            setClassFeesData(classFeesRes.data || []);

            // Auto select latest year
            const allYears = studentList.flatMap((s) => s.academicYears.map((y) => y.academicYear));
            const sortedAcademicYears = allYears
                .filter(Boolean)
                .sort((a, b) => parseInt(b.split("-")[0]) - parseInt(a.split("-")[0]));

            const latest = sortedAcademicYears[0] || (sortedYears[sortedYears.length - 1]?.name || sortedYears[sortedYears.length - 1]?.year || "");
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

        // 3. Calculate total fees paid and payment method share
        let totalPaid = 0;
        const methodCounts = {};

        allPayments.forEach((fee) => {
            const yearData = fee.academicYears?.find((y) => y.academicYear === selectedYear);
            if (yearData && yearData.payments && Array.isArray(yearData.payments)) {
                yearData.payments.forEach(p => {
                    totalPaid += p.amount;
                    const method = p.paymentMethod || "Unknown";
                    methodCounts[method] = (methodCounts[method] || 0) + p.amount;
                });
            }
        });
        setTotalPaidFees(totalPaid);

        // Map payment methods for recharts
        const methodsArray = Object.entries(methodCounts).map(([name, value]) => ({
            name,
            value
        }));
        setPaymentMethodData(methodsArray);

        // 4. Calculate school financial parameters
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
                    const yearData = studentPaymentRecord.academicYears?.find(y => y.academicYear === selectedYear);
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
                            (classFees.development_fee || classFees.development_fees || 0) +
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
        })).filter(item => item.students > 0);
    }, [classes, classStudentCount]);

    const donutChartData = useMemo(() => {
        const remaining = payableAfterDiscount - totalPaidFees;
        return [
            { name: "Collected", value: totalPaidFees, color: themeColors.success },
            { name: "Discount", value: totalDiscountAmount, color: themeColors.warning },
            { name: "Pending", value: remaining > 0 ? remaining : 0, color: themeColors.neutral }
        ];
    }, [totalPaidFees, totalDiscountAmount, payableAfterDiscount, themeColors]);

    // Additional insight calculations
    const collectionPercentage = useMemo(() => {
        if (payableAfterDiscount === 0) return 0;
        return Math.round((totalPaidFees / payableAfterDiscount) * 100);
    }, [totalPaidFees, payableAfterDiscount]);

    const averageRevenue = useMemo(() => {
        if (activeStudents.length === 0) return 0;
        return Math.round(payableAfterDiscount / activeStudents.length);
    }, [payableAfterDiscount, activeStudents]);

    const discountRatio = useMemo(() => {
        if (totalFeesAmount === 0) return 0;
        return Math.round((totalDiscountAmount / totalFeesAmount) * 100);
    }, [totalDiscountAmount, totalFeesAmount]);

    return (
        <div className="OverView ov-animate-fade">
            {/* Top Bar with Title and Actions */}
            <div className="ov-dashboard-titlebar">
                <div className="ov-actions-group">
                    <div className="ov-academic-selector">
                        <i className="fa-regular fa-calendar-days me-2"></i>
                        <select
                            className="ov-session-select"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                        >
                            <option value="">-- Select Year --</option>
                            {academicYears.map((y) => (
                                <option key={y._id} value={y.name || y.year}>{y.name || y.year}</option>
                            ))}
                        </select>
                    </div>

                </div>
            </div>

            {/* Metrics Grid */}
            <div className="ov-stats-grid">
                <div className="ov-stat-card gradient-blue">
                    <div className="ov-card-header-flex">
                        <span>Total Active Students</span>
                        <div className="ov-icon-circle"><i className="fa-solid fa-user-graduate"></i></div>
                    </div>
                    <div className="ov-metric-big">{activeStudents.length}</div>
                    <div className="ov-metric-trend">
                        <i className="fa-solid fa-chart-line me-1"></i> Class distribution active
                    </div>
                </div>

                <div className="ov-stat-card gradient-emerald">
                    <div className="ov-card-header-flex">
                        <span>Total Collection Rate</span>
                        <div className="ov-icon-circle"><i className="fa-solid fa-wallet"></i></div>
                    </div>
                    <div className="ov-metric-big">{collectionPercentage}%</div>
                    <div className="ov-metric-trend">
                        <span>₹{totalPaidFees.toLocaleString("en-IN")} received</span>
                    </div>
                </div>

                <div className="ov-stat-card gradient-purple">
                    <div className="ov-card-header-flex">
                        <span>Avg Revenue / Pupil</span>
                        <div className="ov-icon-circle"><i className="fa-solid fa-calculator"></i></div>
                    </div>
                    <div className="ov-metric-big">₹{averageRevenue.toLocaleString("en-IN")}</div>
                    <div className="ov-metric-trend">
                        <span>Based on Net Target</span>
                    </div>
                </div>

                <div className="ov-stat-card gradient-orange">
                    <div className="ov-card-header-flex">
                        <span>Concessions Granted</span>
                        <div className="ov-icon-circle"><i className="fa-solid fa-tags"></i></div>
                    </div>
                    <div className="ov-metric-big">{discountRatio}%</div>
                    <div className="ov-metric-trend">
                        <span>₹{totalDiscountAmount.toLocaleString("en-IN")} total discounts</span>
                    </div>
                </div>
            </div>

            {/* Financial Status Summary cards */}
            <div className="ov-ledger-summary-row">
                <div className="ov-ledger-metric">
                    <span className="label text-muted">Gross Target</span>
                    <span className="value">₹{totalFeesAmount.toLocaleString("en-IN")}</span>
                </div>
                <div className="ov-divider-dashed"></div>
                <div className="ov-ledger-metric">
                    <span className="label text-warning">Discounts Given</span>
                    <span className="value text-warning">- ₹{totalDiscountAmount.toLocaleString("en-IN")}</span>
                </div>
                <div className="ov-divider-dashed"></div>
                <div className="ov-ledger-metric">
                    <span className="label text-primary">Net Target</span>
                    <span className="value text-primary">₹{payableAfterDiscount.toLocaleString("en-IN")}</span>
                </div>
                <div className="ov-divider-dashed"></div>
                <div className="ov-ledger-metric">
                    <span className="label text-success">Total Received</span>
                    <span className="value text-success">₹{totalPaidFees.toLocaleString("en-IN")}</span>
                </div>
                <div className="ov-divider-dashed"></div>
                <div className="ov-ledger-metric">
                    <span className="label text-danger">Pending Balance</span>
                    <span className="value text-danger">₹{Math.max(0, payableAfterDiscount - totalPaidFees).toLocaleString("en-IN")}</span>
                </div>
            </div>

            {/* Charts Row */}
            <div className="ov-charts-grid">
                <div className="ov-chart-card">
                    <div className="ov-chart-header">
                        <h4>Class Enrollment Spread</h4>
                        <span className="badge-info">{barChartData.length} active classes</span>
                    </div>
                    <div className="ov-chart-container">
                        {barChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={barChartData} margin={{ top: 15, right: 10, left: -20, bottom: 5 }}>
                                    <defs>
                                        <linearGradient id="barColor" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={themeColors.primary} stopOpacity={0.9}/>
                                            <stop offset="100%" stopColor={themeColors.secondary} stopOpacity={0.6}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="class" tick={{ fontSize: 10 }} />
                                    <YAxis tick={{ fontSize: 10 }} />
                                    <RechartsTooltip cursor={{ fill: 'var(--button-hover, rgba(59, 130, 246, 0.05))' }} />
                                    <Bar dataKey="students" fill="url(#barColor)" radius={[4, 4, 0, 0]} barSize={18} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="ov-no-data">
                                <i className="fa-solid fa-folder-open fa-2x mb-2 text-muted"></i>
                                <p>No class enrollments in {selectedYear}</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="ov-chart-card">
                    <div className="ov-chart-header">
                        <h4>Receipt Progress</h4>
                        <span className="badge-success">{collectionPercentage}% collected</span>
                    </div>
                    <div className="ov-chart-container position-relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={donutChartData}
                                    cx="50%"
                                    cy="48%"
                                    innerRadius="65%"
                                    outerRadius="85%"
                                    paddingAngle={4}
                                    dataKey="value"
                                >
                                    {donutChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <RechartsTooltip formatter={(value) => `₹${value.toLocaleString("en-IN")}`} contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                                <RechartsLegend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '11px', marginTop: '5px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="ov-pie-center-label">
                            <span className="percentage">{collectionPercentage}%</span>
                            <span className="label">Received</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Second Row of Charts & Tables */}
            <div className="ov-charts-grid">
                <div className="ov-chart-card">
                    <div className="ov-chart-header">
                        <h4>Payment Methods Breakdown</h4>
                        <span className="badge-info">Method by revenue share</span>
                    </div>
                    <div className="ov-chart-container">
                        {paymentMethodData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={paymentMethodData}
                                        cx="50%"
                                        cy="48%"
                                        outerRadius="80%"
                                        dataKey="value"
                                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                        labelLine={true}
                                    >
                                        {paymentMethodData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip formatter={(value) => `₹${value.toLocaleString("en-IN")}`} contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="ov-no-data">
                                <i className="fa-solid fa-receipt fa-2x mb-2 text-muted"></i>
                                <p>No transaction history recorded yet</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Class wise detailed table */}
                <div className="ov-table-card">
                    <div className="ov-chart-header">
                        <h4>Class-wise billing progress</h4>
                    </div>
                    <div className="ov-table-wrapper">
                        <table className="ov-table">
                            <thead>
                                <tr>
                                    <th>Class Name</th>
                                    <th>Collection Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.keys(classWiseSummaryData).length === 0 ? (
                                    <tr>
                                        <td colSpan="2" style={{ textAlign: 'center', color: '#64748b', fontSize: '0.85rem', padding: '20px' }}>No billing data loaded</td>
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
                                                <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>{cls}</td>
                                                <td>
                                                    <div className="ov-progress-container">
                                                        <div className="ov-progress-bar-bg">
                                                            <div className="ov-progress-fill" style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: progress >= 100 ? '#10b981' : '#3b82f6' }}></div>
                                                        </div>
                                                        <span className="ov-progress-text">
                                                            ₹{paid.toLocaleString("en-IN")} / ₹{total.toLocaleString("en-IN")} ({Math.round(progress)}%)
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
