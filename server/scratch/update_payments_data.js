const mongoose = require('mongoose');
require('dotenv').config();

const schoolId = "6a4a2532c34e5731d437606d"; // Brilliant Public School
const academicYear = "6a4a27aa2ba012dbeeb631db"; // 2025-26

const studentNames = [
    "Yashvardhan Singh", "Devansh Sahu", "Ananya Mishra", "Aarushi Verma", "Priyansh Patel",
    "Kavya Sharma", "Rudra Dewangan", "Ishita Rao", "Tanishq Jangde", "Aditi Gavel"
];

// Diverse payment plans for the 10 students
const paymentPlans = [
    { discount: 1000, totalFees: 12000, payments: [
        { amount: 5000, method: "Cash", payBy: "Father", tuition: 3500, admission: 1000, exam: 500 },
        { amount: 3000, method: "UPI", payBy: "Mother", tuition: 3000, admission: 0, exam: 0 }
    ]}, // Paid 8000, Discount 1000, Balance 3000
    { discount: 0, totalFees: 12000, payments: [
        { amount: 6000, method: "UPI", payBy: "Father", tuition: 4000, admission: 1000, exam: 1000 }
    ]}, // Paid 6000, Discount 0, Balance 6000
    { discount: 1500, totalFees: 12000, payments: [
        { amount: 10500, method: "Cheque", payBy: "Father", tuition: 9000, admission: 1000, exam: 500 }
    ]}, // Fully Paid (10500 + 1500 = 12000)
    { discount: 2000, totalFees: 12000, payments: [
        { amount: 5000, method: "Card", payBy: "Self", tuition: 3000, admission: 1000, exam: 1000 }
    ]}, // Paid 5000, Discount 2000, Balance 5000
    { discount: 500, totalFees: 12000, payments: [
        { amount: 6500, method: "Cash", payBy: "Father", tuition: 5000, admission: 1000, exam: 500 },
        { amount: 2000, method: "UPI", payBy: "Mother", tuition: 2000, admission: 0, exam: 0 }
    ]}, // Paid 8500, Discount 500, Balance 3000
    { discount: 0, totalFees: 12000, payments: [
        { amount: 12000, method: "Cash", payBy: "Father", tuition: 10000, admission: 1000, exam: 1000 }
    ]}, // Fully Paid (12000 + 0 = 12000)
    { discount: 1000, totalFees: 12000, payments: [
        { amount: 4000, method: "UPI", payBy: "Father", tuition: 2500, admission: 1000, exam: 500 }
    ]}, // Paid 4000, Discount 1000, Balance 7000
    { discount: 500, totalFees: 12000, payments: [
        { amount: 6000, method: "Cheque", payBy: "Mother", tuition: 4500, admission: 1000, exam: 500 }
    ]}, // Paid 6000, Discount 500, Balance 5500
    { discount: 2000, totalFees: 12000, payments: [
        { amount: 8000, method: "UPI", payBy: "Father", tuition: 6500, admission: 1000, exam: 500 }
    ]}, // Paid 8000, Discount 2000, Balance 2000
    { discount: 1000, totalFees: 12000, payments: [
        { amount: 5000, method: "Cash", payBy: "Mother", tuition: 3500, admission: 1000, exam: 500 },
        { amount: 6000, method: "UPI", payBy: "Father", tuition: 6000, admission: 0, exam: 0 }
    ]}  // Fully Paid (11000 + 1000 = 12000)
];

async function updatePayments() {
    try {
        const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017/SSS';
        console.log('Connecting to:', mongoUrl);
        await mongoose.connect(mongoUrl);
        console.log('Connected to MongoDB');

        const Student = require('../Models/Student');
        const Payment = require('../Models/Payment');
        const ReceiptBook = require('../Models/ReceiptBook');

        // Get receipt book
        let receiptBook = await ReceiptBook.findOne({ schoolId });
        if (!receiptBook) {
            receiptBook = new ReceiptBook({ bookName: "A", currentNumber: 200, schoolId });
            await receiptBook.save();
        }

        console.log('Fetching student IDs...');
        const students = await Student.find({ name: { $in: studentNames }, schoolId });

        for (let i = 0; i < students.length; i++) {
            const student = students[i];
            const plan = paymentPlans[i % paymentPlans.length];

            // Construct payment transactions
            const transactions = [];
            for (const p of plan.payments) {
                const receiptNum = receiptBook.currentNumber;
                receiptBook.currentNumber += 1;
                await receiptBook.save();

                transactions.push({
                    amount: p.amount,
                    date: new Date(),
                    paymentMethod: p.method,
                    paymentBy: p.payBy,
                    tuition_fee: p.tuition,
                    admission_fees: p.admission,
                    exam_fee: p.exam,
                    receiptBookName: receiptBook.bookName,
                    receiptNumber: receiptNum
                });
            }

            // Find or create Payment document
            let paymentDoc = await Payment.findOne({ studentId: student._id });
            if (!paymentDoc) {
                paymentDoc = new Payment({
                    studentId: student._id,
                    schoolId
                });
            }

            paymentDoc.academicYears = [{
                academicYear: new mongoose.Types.ObjectId(academicYear),
                totalFees: plan.totalFees,
                discount: plan.discount,
                isNewStudent: true,
                payments: transactions
            }];

            await paymentDoc.save();
            console.log(`Updated Payments for student: ${student.name}`);
            console.log(`  -> Total: ${plan.totalFees}, Discount: ${plan.discount}, Paid: ${transactions.reduce((acc, t) => acc + t.amount, 0)}`);
        }

        console.log('Payments Data Updated Successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Update failed:', err);
        process.exit(1);
    }
}

updatePayments();
