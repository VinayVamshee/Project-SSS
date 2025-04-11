import { jsPDF } from "jspdf";
import "jspdf-autotable";

export const generatePDF = async (marksInfo) => {
    if (!marksInfo || !marksInfo.marks) {
        console.error("No marks data available!");
        return;
    }

    const doc = new jsPDF();

    // Image URL
    const imageUrl = "https://media.istockphoto.com/id/1426410572/vector/background-material-with-illustrations-of-pie-charts-and-bar-graphs.jpg?s=612x612&w=0&k=20&c=XuPhGU5vT9ADLTmphNSoJsXl1y2jLSFlkJ9mnEvYjVM=";

    try {
        // Fetch the image and convert to Data URL
        const imgData = await fetch(imageUrl)
            .then(response => response.blob())
            .then(blob => new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            }));

        // Add background image with transparency effect
        doc.addImage(imgData, "JPEG", 0, 0, 210, 297, "", "FAST");

        // Overlay Text
        doc.setFontSize(16);
        doc.text("Report Card", 90, 10);

        doc.setFontSize(12);
        doc.text(`Name: ${marksInfo.name}`, 14, 20);
        doc.text(`Class: ${marksInfo.class}`, 14, 30);
        doc.text(`Academic Year: ${marksInfo.academicYear}`, 14, 40);

        // Extract Exam Names Dynamically
        const examNames = [...new Set(Object.values(marksInfo.marks).flatMap(subject => Object.keys(subject)))];

        // Prepare Table Data
        const tableColumn = ["Subject", ...examNames];
        const tableRows = Object.entries(marksInfo.marks).map(([subject, exams]) => {
            return [subject, ...examNames.map(exam => exams[exam] || "-")];
        });

        // Generate Table with Styling
        doc.autoTable({
            startY: 50,
            head: [tableColumn],
            body: tableRows,
            theme: "grid",
            styles: {
                fontSize: 10,
                cellPadding: 2,
            },
            headStyles: {
                fillColor: [0, 0, 0], // Black background
                textColor: [255, 255, 255], // White text
            },
            bodyStyles: {
                fillColor: [255, 255, 255], // White background
                textColor: [0, 0, 0], // Black text
            },
        });

        // Generate filename: "Report Card Name Academic Year.pdf"
        const fileName = `Report Card ${marksInfo.name} ${marksInfo.academicYear}.pdf`;

        // Save PDF
        doc.save(fileName);
    } catch (error) {
        console.error("Error loading image:", error);
    }
};
