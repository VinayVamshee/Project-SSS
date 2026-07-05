const mongoose = require('mongoose');
require('dotenv').config();

// Avatar URLs
const AVATAR_MALE = "https://cdn-icons-png.flaticon.com/512/2940/2940654.png";
const AVATAR_FEMALE = "https://cdn-icons-png.flaticon.com/512/2293/2293826.png";

// Brilliant Public School
const schoolId = "6a4a2532c34e5731d437606d"; 

const rawStudents = [
    { name: "Yashvardhan Singh", gender: "Male", image: AVATAR_MALE, rollSuffix: "011", caste: "Rajput", phone: "9876543220", dob: "2019-04-12" },
    { name: "Devansh Sahu", gender: "Male", image: AVATAR_MALE, rollSuffix: "012", caste: "Teli", phone: "9876543221", dob: "2019-08-23" },
    { name: "Ananya Mishra", gender: "Female", image: AVATAR_FEMALE, rollSuffix: "013", caste: "Brahmin", phone: "9876543222", dob: "2020-01-15" },
    { name: "Aarushi Verma", gender: "Female", image: AVATAR_FEMALE, rollSuffix: "014", caste: "Kurmi", phone: "9876543223", dob: "2019-11-30" },
    { name: "Priyansh Patel", gender: "Male", image: AVATAR_MALE, rollSuffix: "015", caste: "Patel", phone: "9876543224", dob: "2019-05-09" },
    { name: "Kavya Sharma", gender: "Female", image: AVATAR_FEMALE, rollSuffix: "016", caste: "Brahmin", phone: "9876543225", dob: "2020-03-04" },
    { name: "Rudra Dewangan", gender: "Male", image: AVATAR_MALE, rollSuffix: "017", caste: "Dewangan", phone: "9876543226", dob: "2019-10-18" },
    { name: "Ishita Rao", gender: "Female", image: AVATAR_FEMALE, rollSuffix: "018", caste: "General", phone: "9876543227", dob: "2020-02-27" },
    { name: "Tanishq Jangde", gender: "Male", image: AVATAR_MALE, rollSuffix: "019", caste: "Satnami", phone: "9876543228", dob: "2019-07-11" },
    { name: "Aditi Gavel", gender: "Female", image: AVATAR_FEMALE, rollSuffix: "020", caste: "Gavel", phone: "9876543229", dob: "2019-12-05" }
];

async function seed() {
    try {
        const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017/SSS';
        console.log('Connecting to:', mongoUrl);
        await mongoose.connect(mongoUrl);
        console.log('Connected to MongoDB');

        const Student = require('../Models/Student');
        const Payment = require('../Models/Payment');
        const AcademicYear = require('../Models/AcademicYear');
        const PersonalInformationList = require('../Models/PersonalInformationList');
        const ReceiptBook = require('../Models/ReceiptBook');

        // Clean up partial runs
        await Student.deleteMany({ name: { $in: rawStudents.map(r => r.name) }, schoolId });
        console.log("Cleaned up any partial runs.");

        // 1. Get Academic Year for this year (2025-26) matching the schoolId or global
        const academicYearDoc = await AcademicYear.findOne({ name: "2025-26" });
        if (!academicYearDoc) {
            throw new Error("Academic Year '2025-26' not found in database.");
        }
        console.log(`Found Academic Year '2025-26': ${academicYearDoc._id}`);

        // 2. Fetch field definitions
        const fields = await PersonalInformationList.find({});
        const fieldMap = {};
        fields.forEach(f => {
            fieldMap[f.fieldKey] = f._id;
        });

        // 3. Get Receipt Book to increment receipt number
        let receiptBook = await ReceiptBook.findOne({ schoolId });
        if (!receiptBook) {
            receiptBook = new ReceiptBook({
                bookName: "A",
                currentNumber: 100,
                schoolId
            });
            await receiptBook.save();
        }

        console.log(`Starting seeding of 10 students for Brilliant Public School (schoolId: ${schoolId})...`);

        for (const raw of rawStudents) {
            const admissionNo = `BPS-2025-${raw.rollSuffix}`;

            // Map standard EAV fields
            const dynamicFields = [];
            const eavData = {
                admissionNo: admissionNo,
                gender: raw.gender,
                dob: raw.dob,
                caste: raw.caste,
                phoneNo: raw.phone,
                category: "General",
                address: "Bilaspur, Chhattisgarh",
                freeStudent: "No"
            };

            Object.entries(eavData).forEach(([key, val]) => {
                if (fieldMap[key]) {
                    dynamicFields.push({
                        fieldId: fieldMap[key],
                        value: val
                    });
                }
            });

            // Create student record
            const student = new Student({
                name: raw.name,
                image: raw.image,
                schoolId,
                academicYearId: academicYearDoc._id,
                enrollments: [{
                    academicYear: academicYearDoc._id,
                    class: "Grade-1",
                    status: "Active"
                }],
                dynamicFields
            });

            await student.save();
            console.log(`Created Student: ${student.name} with Admission No: ${admissionNo}`);

            // Increment receipt number
            const receiptNum = receiptBook.currentNumber;
            receiptBook.currentNumber += 1;
            await receiptBook.save();

            // Create Payment record for this year
            const payment = new Payment({
                studentId: student._id,
                schoolId,
                academicYears: [{
                    academicYear: academicYearDoc._id,
                    totalFees: 12000,
                    discount: 500,
                    isNewStudent: true,
                    payments: [{
                        amount: 6000,
                        date: new Date(),
                        paymentMethod: "Cash",
                        paymentBy: "Father",
                        tuition_fee: 4500,
                        admission_fees: 1000,
                        exam_fee: 500,
                        receiptBookName: receiptBook.bookName,
                        receiptNumber: receiptNum
                    }]
                }]
            });

            await payment.save();
            console.log(`  -> Created Payment Entry. Receipt: ${receiptBook.bookName}-${receiptNum}, Amount: 6000`);
        }

        console.log('Seeding completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
}

seed();
