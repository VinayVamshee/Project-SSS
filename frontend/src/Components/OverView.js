import React, { useEffect, useState } from "react";
import axios from "axios";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend} from "chart.js";

ChartJS.register( CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend) 

export default function OverView() {
    const [students, setStudents] = useState([]);
    const [classes, setClasses] = useState([]);
    const [academicYears, setAcademicYears] = useState([]);
    const [studentCountPerYear, setStudentCountPerYear] = useState({});
    const [classStudentCount, setClassStudentCount] = useState({});
    const [totalPaidFees, setTotalPaidFees] = useState(0); // Store total paid fees

    useEffect(() => {
        const fetchData = async () => {
            try {
                const studentResponse = await axios.get("http://localhost:3001/getStudent");
                const studentsList = studentResponse.data.students || [];
                setStudents(studentsList);

                const classResponse = await axios.get("http://localhost:3001/getClasses");
                const sortedClasses = (classResponse.data.classes || []).sort((a, b) => parseInt(a.class) - parseInt(b.class));
                setClasses(sortedClasses);

                const yearResponse = await axios.get("http://localhost:3001/GetAcademicYear");
                const sortedYears = (yearResponse.data.data || []).sort((a, b) => {
                    const yearA = a.year ? a.year.split("-")[0] : "";
                    const yearB = b.year ? b.year.split("-")[0] : "";
                    return parseInt(yearA || "0") - parseInt(yearB || "0"); // Sort by ascending order
                });
                setAcademicYears(sortedYears);

                // Count students per class
                const studentCount = {};
                studentsList.forEach((student) => {
                    student.academicYears.forEach((year) => {
                        const cls = year.class;
                        studentCount[cls] = (studentCount[cls] || 0) + 1;
                    });
                });
                setClassStudentCount(studentCount);

                const studentPerYearCount = {};
                studentsList.forEach((student) => {
                    student.academicYears.forEach((year) => {
                        const yearKey = year.academicYear; // Assuming "academicYear" field exists in student data
                        studentPerYearCount[yearKey] = (studentPerYearCount[yearKey] || 0) + 1;
                    });
                });
                setStudentCountPerYear(studentPerYearCount);

                // ✅ Fetch fees and calculate total paid amount
                const feesResponse = await axios.get("http://localhost:3001/getFees");
                const allFees = feesResponse.data || [];

                let totalPaid = 0;
                allFees.forEach((fee) => {
                    fee.academicYears.forEach((year) => {
                        if (year.payments && Array.isArray(year.payments)) {
                            totalPaid += year.payments.reduce((sum, payment) => sum + payment.amount, 0);
                        }
                    });
                });

                setTotalPaidFees(totalPaid);

            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };

        fetchData();
    }, []);

    const [totalFeesAmount, setTotalFeesAmount] = useState(0);


    useEffect(() => {
        const fetchData = async () => {
            try {
                const feesResponse = await axios.get("http://localhost:3001/getFees");
                const allFees = feesResponse.data || [];
    
                let totalPaid = 0;
                let totalFees = 0;
    
                allFees.forEach((fee) => {
                    fee.academicYears.forEach((year) => {
                        if (year.payments && Array.isArray(year.payments)) {
                            totalPaid += year.payments.reduce((sum, payment) => sum + payment.amount, 0);
                        }
                        // ✅ Ensure we're summing the total expected fees, not just paid ones
                        if (year.totalFees) {
                            totalFees += year.totalFees;
                        }
                    });
                });
    
                setTotalPaidFees(totalPaid);
                setTotalFeesAmount(totalFees); // ✅ Store total fees
            } catch (error) {
                console.error("Error fetching fees:", error);
            }
        };
    
        fetchData();
    }, []);
    

    const buttonColor = getComputedStyle(document.documentElement).getPropertyValue("--button-color").trim();
    const backgroundColor = getComputedStyle(document.documentElement).getPropertyValue("--background-color").trim();


    // Prepare data for the bar chart
    const BarData = {
        labels: classes.map((cls) => `Class ${cls.class}`),
        datasets: [
            {
                label: "Students per Class",
                data: classes.map((cls) => classStudentCount[cls.class] || 0),
                backgroundColor: buttonColor,
                borderWidth: 0,
                borderRadius: { topLeft: 50, topRight: 50, bottomLeft: 0, bottomRight: 0 }, // Top rounded, bottom sharp
                borderSkipped: 'bottom',
                barThickness: 15, // ✅ Set a fixed bar width (adjust as needed)
            maxBarThickness: 20, 
            },
        ],
    };


const amountPaid = totalPaidFees; // Use the already calculated total paid amount

const pieData = {
    labels: ["Amount Paid", "Remaining Amount"],
    datasets: [
        {
            label: "Fee Payment",
            data: [amountPaid, totalFeesAmount - amountPaid],
            backgroundColor: [buttonColor, backgroundColor], // Green for paid, Red for remaining
            hoverOffset: 4,
            cutout: "90%", // Adjust thickness of doughnut
            radius:"80%"
        },
    ],
};


    const lineData = {
        labels: academicYears.map((year) => year.year), // X-axis (Academic Year)
        datasets: [
            {
                label: "Total Students",
                data: academicYears.map((year) => studentCountPerYear[year.year] || 0), // Y-axis (Total Students)
                borderColor: buttonColor,
                tension: 0.4, // Smooth curve
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

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: "top",  // 🟢 Move legend to the left
                labels: {
                    color: "#424242", // 🟢 Set text color
                    font: {
                        size: 14 // Optional: Adjust font size
                    }
                }
            },
            title: {
                display: true,
                text: "Class-wise Student Count",
                color: "#424242", // 🟢 Title text color
                font: {
                    size: 16 // Optional: Adjust font size
                }
            }
        },
        scales: {
            x: {
                ticks: {
                    color: "#424242" // 🟢 X-axis labels color
                },
                title: {
                    display: true,
                    text: "Classes",
                    color: "#424242"
                }
            },
            y: {
                ticks: {
                    color: "#424242" // 🟢 Y-axis labels color
                },
                title: {
                    display: true,
                    text: "Students",
                    color: "#424242"
                }
            }
        }
    };

    const pieOptions = {
        responsive: true,
        plugins: {
            legend: {
                display: true,
                position: "bottom", // Positions the label at the bottom
                labels: {
                    font: {
                        size: 14
                    },
                    padding: 10
                }
            }
        }
    };
    

    return (
        <div className="OverView">
            <div className="totalCards">
                <div className="totalCard">
                    <i className="fa-solid fa-user fa-xl"></i>
                    <div className="totalValue">
                        <strong>{students.length}</strong>
                        <p>Total Students</p>
                    </div>
                </div>

                <div className="totalCard">
                <i class="fa-solid fa-id-badge fa-xl"></i>
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
                <i className="fa-solid fa-school bg-classes fa-xl"></i>
                    <div className="totalValue">
                        <strong>{classes.length}</strong>
                        <p>Total Classes</p>
                    </div>
                </div>

                <div className="totalCard">
                    <i className="fa-solid fa-user bg-users fa-xl"></i>
                    <div className="totalValue">
                        <strong>{classes.length}</strong>
                        <p>Total Classes</p>
                    </div>
                </div>
            </div>

            <div className="ClassStudentsChart">
                <Bar className="BarGraph" data={BarData} options={chartOptions} />
                <Doughnut className="PieGraph" data={pieData} options={pieOptions}/>
            </div>
            <div className="AcademicYearStudentsChart">
                <Line className="LineGraph" data={lineData} options={lineOptions} />
            </div>
        </div>
    );
}
