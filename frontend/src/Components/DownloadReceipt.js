import { jsPDF } from "jspdf";
import "jspdf-autotable";
import logoBase64 from "./Images/Bada school logo.png";

export const generatePdf = (fees, payment, student, selectedYear,paidFees) => {
  if (!fees || !payment || !student || !selectedYear) {
    console.error("Invalid data", { fees, payment, student, selectedYear });
    return;
  }

  const doc = new jsPDF();

  const paymentDate = new Date(payment.date).toLocaleDateString("en-GB").replace(/\//g, "-");
  const fileName = `VTS - Fee Receipt - ${paymentDate}.pdf`;
  const studentName = student.name || "N/A";
  const academicYears = student.academicYears || [];
  const studentClass = academicYears.find(ay => ay.academicYear === selectedYear)?.class || "N/A";

  doc.addImage(logoBase64, "PNG", 15, 10, 15, 15);

  doc.setFont("Times New Roman", "normal");
  doc.setFontSize(10);
  doc.text("Daya Vihar,", 200, 10, { align: "right" });
  doc.text("Ganesh Nagar,", 200, 15, { align: "right" });
  doc.text("Bilaspur, CG,", 200, 20, { align: "right" });
  doc.text("495004", 200, 25, { align: "right" });

  doc.setDrawColor(0);
  doc.line(10, 30, 200, 30);

  doc.setFont("Times New Roman", "bold");
  doc.setFontSize(16);
  doc.text("Vamshee Techno School", 105, 40, null, null, "center");

  // Receipt Number Section
  doc.setFont("Times New Roman", "bold");
  doc.setFontSize(12);
  doc.text(`Receipt No: ${payment.receiptBookName} - ${payment.receiptNumber}`, 15, 50);  

  // Student & Payment Details
  doc.setFont("Times New Roman", "bold");
doc.setFontSize(12);
doc.text("Student Name:", 15, 60);
doc.text("Class:", 15, 68);
doc.text("Payment Received From:", 15, 76);
doc.text("Total Fees:", 15, 84);            
doc.text("Paid Fees:", 130, 84);            
doc.text("Payment Date:", 130, 60);
doc.text("Payment Method:", 130, 68);
doc.text("Payment Amount:", 130, 76);

doc.setFont("Times New Roman", "normal");
doc.text(studentName, 50, 60);
doc.text(`${studentClass} (${selectedYear})`, 30, 68);
doc.text(payment.paymentBy || "N/A", 65, 76);
doc.text(`${fees.totalFees}`, 50, 84);      
doc.text(`${paidFees}`, 165, 84);      
doc.text(paymentDate, 165, 60);
doc.text(payment.paymentMethod || "N/A", 165, 68);
doc.text(`${payment.amount}`, 165, 76);

  // Payment Details Title
  doc.setFont("Times New Roman", "bold");
  doc.setFontSize(12);
  // doc.text("Payment Details", 15, 90);

  // Fee Breakdown Table
  const particulars = [
    { label: "Admission Fees", value: payment.admission_fees },
    { label: "Development Fee", value: payment.development_fee },
    { label: "Exam Fee", value: payment.exam_fee },
    { label: "Progress Card", value: payment.progress_card },
    { label: "Identity Card", value: payment.identity_card },
    { label: "School Diary", value: payment.school_diary },
    { label: "School Activity", value: payment.school_activity },
    { label: "Tuition Fee", value: payment.tuition_fee },
    { label: "Late Fee", value: payment.late_fee },
    { label: "Miscellaneous", value: payment.miscellaneous }
  ];

  const breakdownRows = particulars.map((item) => [
    item.label,
    item.value > 0 ? item.value : "-"
  ]);

  const y = 100;

  doc.autoTable({
    startY: y,
    head: [["Particulars", "Amount (in rupees)"]],
    body: breakdownRows,
    theme: "grid",
    styles: {
      halign: "center",
      valign: "middle",
      fontSize: 10,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0]
    },
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: [255, 255, 255],
      fontStyle: "bold"
    },
    alternateRowStyles: {
      fillColor: [240, 240, 240]
    }
  });

  const finalY = doc.autoTable.previous.finalY + 30;
  doc.setFont("Times New Roman", "bold");
  doc.text("Principal Signature", 160, finalY);

  const footerY = doc.internal.pageSize.height - 20;

  doc.setFont("Times New Roman", "normal");
  doc.setFontSize(10);
  doc.text("Thank you for your payment. For any further inquiries, please contact us at", 15, footerY);

  doc.setFont("Times New Roman", "bold");
  doc.text("technoschoolbsp@gmail.com", 15, footerY + 5);
  doc.text("or call 9752375075", 15, footerY + 10);

  doc.save(fileName);
};

export default generatePdf;
