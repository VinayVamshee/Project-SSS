import React, { useEffect, useState } from "react";
import axios from "axios";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from "chart.js";
import { useNavigate } from "react-router-dom";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

export default function OverView() {
    const navigate = useNavigate();

    const [students, setStudents] = useState([]);
    const [classes, setClasses] = useState([]);
    const [academicYears, setAcademicYears] = useState([]);
    const [studentCountPerYear, setStudentCountPerYear] = useState({});
    const [classStudentCount, setClassStudentCount] = useState({});
    const [allPayments, setAllPayments] = useState([]);
    const [totalPaidFees, setTotalPaidFees] = useState(0);
    const [latestYear, setLatestYear] = useState("");
    const [classFeesData, setClassFeesData] = useState([]);
    const [totalFeesAmount, setTotalFeesAmount] = useState(0);

    // Redirect to login if no token
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) navigate("/login");
    }, [navigate]);

    const [activeStudents, setActiveStudents] = useState([]);

    // Fetch all data: students, classes, academic years, fees
    const fetchData = async () => {
        try {
            const studentRes = await axios.get("https://sss-server-eosin.vercel.app/getStudent");
            const studentList = studentRes.data.students || [];
            setStudents(studentList);

            const classRes = await axios.get("https://sss-server-eosin.vercel.app/getClasses");
            const sortedClasses = (classRes.data.classes || []).sort(
                (a, b) => parseInt(a.class) - parseInt(b.class)
            );
            setClasses(sortedClasses);

            const yearRes = await axios.get("https://sss-server-eosin.vercel.app/GetAcademicYear");
            const sortedYears = (yearRes.data.data || []).sort(
                (a, b) => parseInt(a.year.split("-")[0]) - parseInt(b.year.split("-")[0])
            );
            setAcademicYears(sortedYears);

            // Find latest academic year from student data
            const allYears = studentList.flatMap((s) =>
                s.academicYears.map((y) => y.academicYear)
            );
            const sortedAcademicYears = allYears
                .filter(Boolean)
                .sort((a, b) => parseInt(b.split("-")[0]) - parseInt(a.split("-")[0]));
            const latest = sortedAcademicYears[0];
            setLatestYear(latest);

            const activeStudentsInLatestYear = studentList.filter((student) =>
                student.academicYears.some(
                    (year) => year.academicYear === latest && year.status === "Active"
                )
            );
            setActiveStudents(activeStudentsInLatestYear);

            // Count students per class for latestYear only
            // Count students in latestYear where status is Active
            const latestYearCount = {};
            studentList.forEach((student) => {
                const activeYearEntry = student.academicYears.find(
                    (y) => y.academicYear === latest && y.status === "Active"
                );

                if (activeYearEntry) {
                    const cls = activeYearEntry.class;
                    latestYearCount[cls] = (latestYearCount[cls] || 0) + 1;
                }
            });
            setClassStudentCount(latestYearCount);

            // Count students per academic year (for line chart)
            const activeStudentPerYearCount = {};
            studentList.forEach((s) => {
                s.academicYears.forEach((y) => {
                    const year = y.academicYear;
                    const status = y.status;

                    if (year === latest && status === "Active") {
                        activeStudentPerYearCount[year] = (activeStudentPerYearCount[year] || 0) + 1;
                    } else if (year !== latest && status === "Passed") {
                        activeStudentPerYearCount[year] = (activeStudentPerYearCount[year] || 0) + 1;
                    }
                });
            });
            setStudentCountPerYear(activeStudentPerYearCount);

            // Calculate total fees paid only for the latest academic year
            const feesRes = await axios.get("https://sss-server-eosin.vercel.app/getFees");
            setAllPayments(feesRes.data || [])
            const allFees = feesRes.data || [];

            let totalPaid = 0;
            allFees.forEach((fee) => {
                const yearData = fee.academicYears.find((y) => y.academicYear === latest);
                if (yearData && yearData.payments && Array.isArray(yearData.payments)) {
                    totalPaid += yearData.payments.reduce((sum, p) => sum + p.amount, 0);
                }
            });
            setTotalPaidFees(totalPaid);
        } catch (err) {
            console.error("Error fetching data:", err);
        }
    };

    useEffect(() => {
        fetchData();
    }, [navigate]);

    // Fetch class fees
    useEffect(() => {
        const fetchClassFees = async () => {
            try {
                const res = await axios.get("https://sss-server-eosin.vercel.app/class-fees");
                setClassFeesData(res.data || []);
            } catch (err) {
                console.error("Error fetching class fees:", err);
            }
        };
        fetchClassFees();
    }, []);

    const [classWiseFees, setClassWiseFees] = useState({});

    // Calculate total fees to collect for latest academic year
    useEffect(() => {
        if (classes.length === 0 || classFeesData.length === 0 || students.length === 0 || !latestYear)
            return;

        let totalFees = 0;
        const classWiseSummary = {};
        students.forEach(student => {
            const academicYear = student.academicYears.find(
                y => y.academicYear === latestYear && y.status === "Active"
            );

            if (!academicYear) return;

            const studentClassName = academicYear.class;
            const classObj = classes.find(c => c.class === studentClassName);
            const classId = classObj?._id;

            const studentFeeRecord = student.fees?.[0]?.academicYears?.find(
                y => y.academicYear === latestYear
            );

            let studentTotal = 0;

            if (studentFeeRecord && studentFeeRecord.totalFees) {
                studentTotal = studentFeeRecord.totalFees - (studentFeeRecord.discount || 0);
            } else {
                const yearFees = classFeesData.find(fee => fee.academicYear === latestYear);
                const classFees = yearFees?.classes.find(clsFee =>
                    (clsFee.class_id?._id || clsFee.class_id)?.toString() === classId?.toString()
                );

                if (classFees) {
                    let classTotal =
                        (classFees.development_fee || 0) +
                        (classFees.exam_fee || 0) +
                        (classFees.progress_card || 0) +
                        (classFees.identity_card || 0) +
                        (classFees.school_diary || 0) +
                        (classFees.school_activity || 0) +
                        (classFees.tuition_fee || 0) +
                        (classFees.late_fee || 0) +
                        (classFees.miscellaneous || 0);

                    if (student.isNewStudent) {
                        classTotal += (classFees.admission_fees || 0);
                    }

                    studentTotal = classTotal;
                }
            }

            // Add student fee to class-wise total
            if (studentClassName) {
                if (!classWiseSummary[studentClassName]) {
                    classWiseSummary[studentClassName] = { total: 0, paid: 0 };
                }

                classWiseSummary[studentClassName].total += studentTotal;

                // ✅ Corrected paid calculation
                const studentPaymentRecord = allPayments.find(
                    payment => payment.studentId === student._id
                );

                const yearData = studentPaymentRecord?.academicYears.find(
                    y => y.academicYear === latestYear
                );

                const paidAmount = yearData?.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;

                classWiseSummary[studentClassName].paid += paidAmount;
            }



            totalFees += studentTotal;
        });

        setTotalFeesAmount(totalFees);
        setClassWiseFees(classWiseSummary); // 🆕 You need to define this state

    }, [classes, classFeesData, students, latestYear, allPayments]);

    // Prepare chart data
    const buttonColor = getComputedStyle(document.documentElement)
        .getPropertyValue("--button-color")
        .trim();
    const backgroundColor = getComputedStyle(document.documentElement)
        .getPropertyValue("--background-color")
        .trim();

    const BarData = {
        labels: classes.map((cls) => `${cls.class}`),
        datasets: [
            {
                label: "Students per Class",
                data: classes.map((cls) => classStudentCount[cls.class] || 0),
                backgroundColor: buttonColor,
                borderRadius: { topLeft: 50, topRight: 50 },
                borderSkipped: "bottom",
                barThickness: 15,
            },
        ],
    };

    const pieData = {
        labels: ["Amount Paid", "Remaining Amount"],
        datasets: [
            {
                label: "Fee Payment",
                data: [totalPaidFees, totalFeesAmount - totalPaidFees],
                backgroundColor: [buttonColor, backgroundColor],
                hoverOffset: 4,
                cutout: "90%",
                radius: "80%",
            },
        ],
    };

    const lineData = {
        labels: academicYears.map((year) => year.year),
        datasets: [
            {
                label: "Total Students",
                data: academicYears.map((year) => studentCountPerYear[year.year] || 0),
                borderColor: buttonColor,
                tension: 0.4,
                fill: false,
            },
        ],
    };

    const lineOptions = {
        responsive: true,
        plugins: {
            legend: { position: "top" },
            title: { display: true, text: "Total Students per Academic Year" },
        },
        scales: {
            x: { title: { display: true, text: "Academic Year" } },
            y: { beginAtZero: true, title: { display: true, text: "Total Students" } },
        },
    };


    return (
        <div className="OverView">
            <div className="totalCards">
                <div className="totalCard">
                    <i className="fa-solid fa-user fa-xl"></i>
                    <div className="totalValue">
                        <strong>{activeStudents.length}</strong>
                        <p>Total Students</p>
                    </div>
                </div>

                <div className="totalCard">
                    <i className="fa-solid fa-id-badge fa-xl"></i>
                    <div className="totalValue">
                        <strong>10</strong>
                        <p>Total Staff</p>
                    </div>
                </div>

                <div className="totalCard">
                    <i className="fa-solid fa-wallet bg-wallet fa-xl"></i>
                    <div className="totalValue">
                        <strong>{totalPaidFees.toLocaleString("en-IN")}</strong>
                        <p>Fees Collected</p>
                    </div>
                </div>

                <div className="totalCard">
                    <i className="fa-solid fa-wallet bg-wallet fa-xl"></i>
                    <div className="totalValue">
                        <strong>{totalFeesAmount.toLocaleString("en-IN")}</strong>
                        <p>Fees to be Collected</p>
                    </div>
                </div>

                <div className="totalCard">
                    <i className="fa-solid fa-school bg-classes fa-xl"></i>
                    <div className="totalValue">
                        <strong>{classes.length}</strong>
                        <p>Total Classes</p>
                    </div>
                </div>
            </div>

            <div className="ClassStudentsChart">
                <Bar className="BarGraph" data={BarData} />
                <Doughnut className="PieGraph" data={pieData} />
            </div>

            <div className="AcademicYearStudentsChart">
                <Line className="LineGraph" options={lineOptions} data={lineData} />
                <div className="ClassWiseSummary">
                    {Object.keys(classWiseFees).length === 0 ? (
                        <p className="text-muted">No data available for the selected academic year.</p>
                    ) : (
                        <table>
                            <thead >
                                <tr>
                                    <th>Class</th>
                                    <th>Fee Progress</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(classWiseFees).map(([cls, data], idx) => {
                                    const total = data.total;
                                    const paid = data.paid;
                                    const progress = total > 0 ? (paid / total) * 100 : 0;

                                    return (
                                        <tr key={idx}>
                                            <td>{cls}</td>
                                            <td>
                                                <div className="fees-container w-100">
                                                    <div className="fees-bar">
                                                        <div
                                                            className="fees-progress"
                                                            style={{ width: `${progress.toFixed(2)}%` }}
                                                        />
                                                    </div>
                                                    <span className="fees-text" style={{ width: 'fit-content' }}>
                                                        ₹{paid.toLocaleString("en-IN", { minimumFractionDigits: 2 })} / ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>


            </div>
        </div>
    );
}
