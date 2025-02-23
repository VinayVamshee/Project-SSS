import { jsPDF } from "jspdf";
import "jspdf-autotable";

export const generatePdf = (fees, payment, student, selectedYear) => {
  if (!fees || !payment || !student || !selectedYear) {
    console.error("Invalid data", { fees, payment, student, selectedYear });
    return;
  }

  const doc = new jsPDF();
  const paymentDate = new Date(payment.date).toLocaleDateString().replace(/\//g, "-");
  const fileName = `VTS - Fee Receipt - ${paymentDate}.pdf`;

  // ✅ Extract Student Information
  const studentName = student.name || "N/A";
  const academicYears = student.academicYears || [];

  // ✅ Find Class for the Selected Year
  const studentClass = academicYears.find(ay => ay.academicYear === selectedYear)?.class || "N/A";

  // ✅ PDF Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Vamshee Techno School", 105, 15, null, null, "center");

  // ✅ Student & Payment Details
  doc.setFontSize(12);
  doc.text(`Student Name: ${studentName}`, 15, 30);
  doc.text(`Class: ${studentClass} (${selectedYear})`, 15, 38); // Using selectedYear
  doc.text(`Payment Date: ${paymentDate}`, 15, 46);

  // ✅ Fees Table
  doc.text("Fee Details", 15, 55);

  doc.autoTable({
    startY: 60,
    head: [["Total Fees (₹)", "Discount (₹)", "Paid Now (₹)", "Remaining Fees (₹)"]],
    body: [
      [
        fees.totalFees + fees.discount,
        fees.discount,
        payment.amount,
        fees.totalFees - fees.payments.reduce((sum, p) => sum + p.amount, 0)
      ]
    ],
    theme: "grid",
    styles: { halign: "center", valign: "middle" }
  });

  // ✅ Payment History Table
  doc.text("Payment History", 15, doc.autoTable.previous.finalY + 10);

  doc.autoTable({
    startY: doc.autoTable.previous.finalY + 15,
    head: [["S. No", "Payment Date", "Amount (₹)"]],
    body: fees.payments.map((p, index) => [
      index + 1,
      new Date(p.date).toLocaleDateString(),
      `₹${p.amount}`
    ]),
    theme: "grid",
    styles: { halign: "center", valign: "middle" }
  });

  // ✅ Save the PDF
  doc.save(fileName);
};

export default generatePdf;
