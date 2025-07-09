import { jsPDF } from "jspdf";
import "jspdf-autotable";

export const generatePdf = (fees, payment, student, selectedYear, paidFees, latestMaster) => {

  if (!fees || !payment || !student || !selectedYear) {
    console.error("Invalid data", { fees, payment, student, selectedYear });
    return;
  }

  const doc = new jsPDF({ orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();  // ~842
  const pageHeight = doc.internal.pageSize.getHeight(); // ~595
  const halfWidth = pageWidth / 2; // ~421

  const paymentDate = new Date(payment.date).toLocaleDateString("en-GB").replace(/\//g, "-");
  const fileName = `${latestMaster.name} - Fee Receipt - ${paymentDate}.pdf`;
  const studentName = student.name || "N/A";
  const academicYears = student.academicYears || [];
  const studentClass = academicYears.find(ay => ay.academicYear === selectedYear)?.class || "N/A";

  const drawReceipt = (xOffset = 0) => {
    const labelX = 10 + xOffset;
    const valueX = 80 + xOffset;

    // Header
    doc.addImage(`${latestMaster.imageUrl}`, "PNG", labelX, 8, 14, 15);
    doc.setFont("Times New Roman", "bold");
    doc.setFontSize(13);
    doc.text(`${latestMaster.name}`, xOffset + halfWidth / 2, 18, null, null, "center");

    doc.setFont("Times New Roman", "normal");
    doc.setFontSize(9);
    const addressLines = latestMaster?.address?.split(",") || [];
    const startY = 12;
    const lineHeight = 4;

    addressLines.forEach((line, index) => {
      const isLast = index === addressLines.length - 1;
      const text = line.trim() + (isLast ? "" : ",");
      doc.text(text, xOffset + halfWidth - 10, startY + index * lineHeight, {
        align: "right",
      });
    });



    doc.line(labelX, 30, xOffset + halfWidth - 10, 30);

    // Add "Receipt" below the line
    doc.setFont("Times New Roman", "bold");
    doc.setFontSize(12);
    doc.text("Receipt", xOffset + halfWidth / 2, 36, null, null, "center");

    doc.setFontSize(10);
    doc.text(`Receipt No: ${payment.receiptBookName} - ${payment.receiptNumber}`, labelX, 42);

    // Student Info
    let y = 48;
    const gap = 6;

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
    printLabelValue("Total Paid Fees:", `${paidFees}`);

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
    doc.text("Receiver's Signature", labelX + 90, finalY + 15);

    // Footer
    const footerY = pageHeight - 20;
    doc.setFont("Times New Roman", "normal");
    doc.setFontSize(8);
    doc.text("Thank you for your payment. For inquiries:", labelX, footerY);
    doc.setFont("Times New Roman", "bold");
    doc.text(`${latestMaster.email} | ${latestMaster.phoneNo}`, labelX, footerY + 4);
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
