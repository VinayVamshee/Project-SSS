const mongoose = require('mongoose');
require('dotenv').config();

const schoolId = "6a4a2532c34e5731d437606d"; // Brilliant Public School
const correctYearId = "6a4a27aa2ba012dbeeb631db"; // Brilliant's 2025-26 Academic Year
const wrongYearId = "6a49704e31d281a6130aa86b"; // Vamshee's 2025-26 Academic Year

const studentNames = [
    "Yashvardhan Singh", "Devansh Sahu", "Ananya Mishra", "Aarushi Verma", "Priyansh Patel",
    "Kavya Sharma", "Rudra Dewangan", "Ishita Rao", "Tanishq Jangde", "Aditi Gavel"
];

async function fixYears() {
    try {
        const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017/SSS';
        console.log('Connecting to:', mongoUrl);
        await mongoose.connect(mongoUrl);
        console.log('Connected to MongoDB');

        const Student = require('../Models/Student');
        const Payment = require('../Models/Payment');

        // 1. Update Students
        const studentIds = [];
        const students = await Student.find({ name: { $in: studentNames }, schoolId });
        console.log(`Found ${students.length} students to update.`);

        for (const student of students) {
            studentIds.push(student._id);
            student.academicYearId = new mongoose.Types.ObjectId(correctYearId);
            
            if (student.enrollments && student.enrollments.length > 0) {
                student.enrollments.forEach(e => {
                    if (e.academicYear.toString() === wrongYearId) {
                        e.academicYear = new mongoose.Types.ObjectId(correctYearId);
                    }
                });
            }
            await student.save();
            console.log(`Updated Student: ${student.name} to correct year ID: ${correctYearId}`);
        }

        // 2. Update Payments
        const payments = await Payment.find({ studentId: { $in: studentIds } });
        console.log(`Found ${payments.length} payment documents to update.`);

        for (const payment of payments) {
            if (payment.academicYears && payment.academicYears.length > 0) {
                payment.academicYears.forEach(ay => {
                    if (ay.academicYear.toString() === wrongYearId) {
                        ay.academicYear = new mongoose.Types.ObjectId(correctYearId);
                    }
                });
            }
            await payment.save();
            console.log(`Updated Payment document for studentId: ${payment.studentId}`);
        }

        console.log('Update Complete! The 10 new students will now be visible in the UI under Brilliant Public School.');
        process.exit(0);
    } catch (err) {
        console.error('Update failed:', err);
        process.exit(1);
    }
}

fixYears();
