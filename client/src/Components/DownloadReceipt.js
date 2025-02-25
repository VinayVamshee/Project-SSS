import { jsPDF } from "jspdf";
import "jspdf-autotable";
import logoBase64 from "./Images/Bada school logo.png"; // Import your logo as a Base64 string

export const generatePdf = (fees, payment, student, selectedYear) => {
  if (!fees || !payment || !student || !selectedYear) {
    console.error("Invalid data", { fees, payment, student, selectedYear });
    return;
  }

  const doc = new jsPDF();

  const paymentDate = new Date(payment.date).toLocaleDateString("en-GB").replace(/\//g, "-");
  const fileName = `VTS - Fee Receipt - ${paymentDate}.pdf`;

  // ✅ Extract Student Information
  const studentName = student.name || "N/A";
  const academicYears = student.academicYears || [];

  // ✅ Find Class for the Selected Year
  const studentClass = academicYears.find(ay => ay.academicYear === selectedYear)?.class || "N/A";

  // ✅ Add Logo (Ensure the image is a Base64 string)
  doc.addImage(logoBase64, "PNG", 15, 10, 15, 15); // (image, format, x, y, width, height)

  doc.setFont("Times New Roman", "normal");
  doc.setFontSize(10);
  doc.text("Daya Vihar,", 200, 10, { align: "right" });
  doc.text("Ganesh Nagar,", 200, 15, { align: "right" });
  doc.text("Bilaspur, CG,", 200, 20, { align: "right" });
  doc.text("495004", 200, 25, { align: "right" });

  doc.setDrawColor(0); // Black color
  doc.line(10, 30, 200, 30);

  // ✅ PDF Title
  doc.setFont("Times New Roman", "bold");
  doc.setFontSize(16);
  doc.text("Vamshee Techno School", 105, 40, null, null, "center");

  // ✅ Student & Payment Details
  // ✅ Student & Payment Details
  doc.setFont("Times New Roman", "bold");
  doc.setFontSize(12);
  doc.text("Student Name:", 15, 60);
  doc.text("Class:", 15, 68);
  doc.text("Payment Received From:", 15, 76);
  doc.text("Payment Date:", 130, 60);
  doc.text("Payment Method:", 130, 68); // Moved below Payment Date

  doc.setFont("Times New Roman", "normal");
  doc.text(studentName, 50, 60);
  doc.text(`${studentClass} (${selectedYear})`, 30, 68);
  doc.text(payment.paymentBy || "N/A", 65, 76);
  doc.text(paymentDate, 165, 60);
  doc.text(payment.paymentMethod || "N/A", 165, 68); // Placed below Payment Date



  // ✅ Fees Table
  doc.text("Payment Details", 15, 90);

  doc.autoTable({
    startY: 95,
    head: [["Total Fees", "Discount", "Amount Paid", "Remaining Fees"]],
    body: [
      [
        fees.totalFees + fees.discount,
        fees.discount,
        payment.amount,
        fees.totalFees - fees.payments.reduce((sum, p) => sum + p.amount, 0)
      ]
    ],
    theme: "grid",
    styles: {
      halign: "center",
      valign: "middle",
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0]
    },
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: [255, 255, 255],
      lineColor: [0, 0, 0],
      fontStyle: "bold"
    },
    alternateRowStyles: {
      fillColor: [240, 240, 240]
    }
  });

  // ✅ Payment History Table
  // ✅ Payment History Table
  doc.text("Payment History", 15, doc.autoTable.previous.finalY + 10);

  doc.autoTable({
    startY: doc.autoTable.previous.finalY + 15,
    head: [["S. No", "Payment Date", "Amount Paid", "Payment By", "Payment Method"]],
    body: fees.payments.map((p, index) => [
      index + 1,
      new Date(p.date).toLocaleDateString("en-GB").replace(/\//g, "-"),
      `${p.amount}`,
      p.paymentBy || "N/A", // Assuming 'paymentBy' stores who made the payment
      p.paymentMethod || "N/A" // Assuming 'paymentMethod' stores how it was paid
    ]),
    theme: "grid",
    styles: {
      halign: "center",
      valign: "middle",
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0]
    },
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: [255, 255, 255],
      lineColor: [0, 0, 0],
      fontStyle: "bold"
    },
    alternateRowStyles: {
      fillColor: [240, 240, 240]
    }
  });


  const finalY = doc.autoTable.previous.finalY + 30; // Adjust the position dynamically
  doc.setFont("Times New Roman", "bold");
  doc.text("Principal Signature", 160, finalY);

  // ✅ Add Footer Message
  const footerY = doc.internal.pageSize.height - 20; // Position near the bottom

  doc.setFont("Times New Roman", "normal");
  doc.setFontSize(10);
  doc.text("Thank you for your payment. For any further inquiries, please contact us at", 15, footerY);

  doc.setFont("Times New Roman", "bold");
  doc.text("technoschoolbsp@gmail.com", 15, footerY + 5);
  doc.text("or call 9752375075", 15, footerY + 10);

  // ✅ Save the PDF
  doc.save(fileName);
};

export default generatePdf;
