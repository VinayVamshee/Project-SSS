import { jsPDF } from "jspdf";
import "jspdf-autotable";
import logoBase64 from "./Images/Bada school logo.png";

export const generatePdf = (fees, payment, student, selectedYear, paidFees) => {
  if (!fees || !payment || !student || !selectedYear) {
    console.error("Invalid data", { fees, payment, student, selectedYear });
    return;
  }

  const doc = new jsPDF({ orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();  // ~842
  const pageHeight = doc.internal.pageSize.getHeight(); // ~595
  const halfWidth = pageWidth / 2; // ~421

  const paymentDate = new Date(payment.date).toLocaleDateString("en-GB").replace(/\//g, "-");
  const fileName = `VTS - Fee Receipt - ${paymentDate}.pdf`;
  const studentName = student.name || "N/A";
  const academicYears = student.academicYears || [];
  const studentClass = academicYears.find(ay => ay.academicYear === selectedYear)?.class || "N/A";

  const drawReceipt = (xOffset = 0) => {
    const labelX = 10 + xOffset;
    const valueX = 80 + xOffset;

    // Header
    doc.addImage(logoBase64, "PNG", labelX, 8, 14, 14);
    doc.setFont("Times New Roman", "normal");
    doc.setFontSize(9);
    doc.text("Daya Vihar,", xOffset + halfWidth - 10, 8, { align: "right" });
    doc.text("Ganesh Nagar,", xOffset + halfWidth - 10, 12, { align: "right" });
    doc.text("Bilaspur, CG,", xOffset + halfWidth - 10, 16, { align: "right" });
    doc.text("495004", xOffset + halfWidth - 10, 20, { align: "right" });

    doc.line(labelX, 25, xOffset + halfWidth - 10, 25);

    doc.setFont("Times New Roman", "bold");
    doc.setFontSize(13);
    doc.text("Vamshee Techno School", xOffset + halfWidth / 2, 32, null, null, "center");

    doc.setFontSize(10);
    doc.text(`Receipt No: ${payment.receiptBookName} - ${payment.receiptNumber}`, labelX, 38);

    // Student Info
    let y = 44;
    const gap = 6; // reduced gap

    const printLabelValue = (label, value) => {
      doc.setFont("Times New Roman", "bold");
      doc.text(label, labelX, y);
      doc.setFont("Times New Roman", "normal");
      doc.text(value || "N/A", valueX, y);
      y += gap;
    };

    printLabelValue("Student Name:", studentName);
    printLabelValue("Class:", `${studentClass} (${selectedYear})`);
    printLabelValue("Payment Received From:", payment.paymentBy);
    printLabelValue("Payment Date:", paymentDate);
    printLabelValue("Payment Method:", payment.paymentMethod);
    printLabelValue("Payment Amount:", `${payment.amount}`);
    printLabelValue("Total Fees:", `${fees.totalFees}`);
    printLabelValue("Paid Fees:", `${paidFees}`);

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
      { label: "Miscellaneous", value: payment.miscellaneous },
    ];

    const breakdownRows = particulars.map((item) => [
      item.label,
      item.value > 0 ? item.value : "-"
    ]);

    doc.autoTable({
      startY: y + 4, // smaller gap before table
      startX: labelX,
      margin: { left: labelX, right: 5 },
      head: [["Particulars", "Amount"]],
      body: breakdownRows,
      tableWidth: halfWidth - 20,
      theme: "grid",
      styles: {
        fontSize: 8,
        cellPadding: 1.5,
        halign: "center",
      },
      headStyles: {
        fillColor: [0, 0, 0],
        textColor: 255,
        fontStyle: "bold"
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      didDrawPage: () => {
        // prevent multi-page table draw
      },
    });

    const finalY = doc.autoTable.previous.finalY + 10;
    doc.setFont("Times New Roman", "bold");
    doc.setFontSize(10);
    doc.text("Principal Signature", labelX + 90, finalY);

    // Footer
    const footerY = pageHeight - 20;
    doc.setFont("Times New Roman", "normal");
    doc.setFontSize(8);
    doc.text("Thank you for your payment. For inquiries:", labelX, footerY);
    doc.setFont("Times New Roman", "bold");
    doc.text("technoschoolbsp@gmail.com | 9752375075", labelX, footerY + 4);
  };

  drawReceipt(0);           
  drawReceipt(halfWidth);  

  doc.setLineWidth(0.1);
  doc.setDrawColor(150);
  doc.setLineDash([2, 2], 0);
  doc.line(pageWidth / 2, 5, pageWidth / 2, pageHeight - 5);

  doc.save(fileName);
};

export default generatePdf;
