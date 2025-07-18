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

    const customClassOrder = [
        "Pre-Nursery",
        "Nursery",
        "KG-1",
        "KG-2",
        "Class-1", "Class-2", "Class-3", "Class-4", "Class-5",
        "Class-6", "Class-7", "Class-8", "Class-9", "Class-10",
        "Class-11", "Class-12"
    ];

    // Fetch all data: students, classes, academic years, fees
    const fetchData = async () => {
        try {
            const studentRes = await axios.get("https://sss-server-eosin.vercel.app/getStudent");
            const studentList = studentRes.data.students || [];
            setStudents(studentList);

            const classRes = await axios.get("https://sss-server-eosin.vercel.app/getClasses");
            const customOrder = [
                "Pre-Nursery",
                "Nursery",
                "KG-1",
                "KG-2",
                "Class-1", "Class-2", "Class-3", "Class-4", "Class-5",
                "Class-6", "Class-7", "Class-8", "Class-9", "Class-10",
                "Class-11", "Class-12"
            ];

            const sortedClasses = (classRes.data.classes || []).sort((a, b) => {
                const indexA = customOrder.indexOf(a.class);
                const indexB = customOrder.indexOf(b.class);

                return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
            });

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


    const [totalDiscountAmount, setTotalDiscountAmount] = useState(0);
    const [payableAfterDiscount, setPayableAfterDiscount] = useState(0);
    const [classWiseFees, setClassWiseFees] = useState({});

    // Calculate total fees to collect for latest academic year
    useEffect(() => {
    if (
        classes.length === 0 ||
        classFeesData.length === 0 ||
        students.length === 0 ||
        !latestYear
    ) {
        return;
    }

    let totalFees = 0;
    let totalDiscount = 0;
    let totalPayableAfterDiscount = 0;

    const classWiseSummary = {};

    students.forEach(student => {
        const academicYear = student.academicYears.find(
            y => y.academicYear === latestYear && y.status === "Active"
        );

        if (!academicYear) return;

        const studentClassName = academicYear.class;
        const classObj = classes.find(c => c.class === studentClassName);
        const classId = classObj?._id;

        const studentPaymentRecord = allPayments.find(
            payment => payment.studentId === student._id
        );

        let fullFee = 0;
        let discount = 0;
        let paidAmount = 0;

        if (studentPaymentRecord) {
            const yearData = studentPaymentRecord.academicYears.find(
                y => y.academicYear === latestYear
            );

            if (yearData) {
                fullFee = yearData.totalFees || 0;
                discount = yearData.discount || 0;
                paidAmount = yearData.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
            }
        }

        // ❗ If no payment record or no yearData, fallback to class fee calculation
        if (fullFee === 0) {
            const yearFees = classFeesData.find(fee => fee.academicYear === latestYear);
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

        const payableAfterDiscount = fullFee - discount;

        totalFees += fullFee;
        totalDiscount += discount;
        totalPayableAfterDiscount += payableAfterDiscount;

        if (studentClassName) {
            if (!classWiseSummary[studentClassName]) {
                classWiseSummary[studentClassName] = { total: 0, paid: 0 };
            }

            classWiseSummary[studentClassName].total += payableAfterDiscount;
            classWiseSummary[studentClassName].paid += paidAmount;
        }
    });

    setTotalFeesAmount(totalFees);
    setTotalDiscountAmount(totalDiscount);
    setPayableAfterDiscount(totalPayableAfterDiscount);
    setClassWiseFees(classWiseSummary);
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
        labels: ["Paid Fees", "Total Fees"],
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
                        <strong>{totalDiscountAmount.toLocaleString("en-IN")}</strong>
                        <p>Concession Provided</p>
                    </div>
                </div>

                <div className="totalCard">
                    <i className="fa-solid fa-wallet bg-wallet fa-xl"></i>
                    <div className="totalValue">
                        <strong>{payableAfterDiscount.toLocaleString("en-IN")}</strong>
                        <p>Fees After Concession</p>
                    </div>
                </div>

                <div className="totalCard">
                    <i className="fa-solid fa-wallet bg-wallet fa-xl"></i>
                    <div className="totalValue">
                        <strong>{totalFeesAmount.toLocaleString("en-IN")}</strong>
                        <p>Total Fees to be Collected</p>
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
                                    <th>Fee Progress [ Paid Fees / ( Class Fees - Concession ) ]</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(classWiseFees).sort(([classA], [classB]) => {
                                    const indexA = customClassOrder.indexOf(classA);
                                    const indexB = customClassOrder.indexOf(classB);
                                    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
                                }).map(([cls, data], idx) => {
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
