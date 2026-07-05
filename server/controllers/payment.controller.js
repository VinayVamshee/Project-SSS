const mongoose = require('mongoose');
const Payment = require('../Models/Payment');
const Student = require('../Models/Student');
const Class = require('../Models/Classes');
const ClassFees = require('../Models/ClassFees');
const ReceiptBook = require('../Models/ReceiptBook');
const AcademicYear = require('../Models/AcademicYear');

// Helper to resolve an AcademicYear ID from a string name, ID, or fallback
const resolveAcademicYearId = async (academicYearInput, schoolId) => {
    if (!academicYearInput) return null;
    
    // Build lookup query
    const query = {
        $or: [
            { name: academicYearInput },
            { year: academicYearInput }
        ]
    };
    
    if (mongoose.isValidObjectId(academicYearInput)) {
        query.$or.push({ _id: new mongoose.Types.ObjectId(academicYearInput) });
    }
    
    const yearDoc = await AcademicYear.findOne(query);
    return yearDoc ? yearDoc._id : null;
};

// Payment and fee transactions
exports.saveFees = async (req, res) => {
    const { studentId, academicYear, totalFees, discount, newPayment, isNewStudent } = req.body;

    try {
        const schoolId = req.schoolId;
        const resolvedYearId = await resolveAcademicYearId(academicYear, schoolId) || new mongoose.Types.ObjectId("6a49704e31d281a6130aa86b");
        
        let paymentEntry = await Payment.findOne({ studentId });

        const basePaymentRecord = {
            amount: newPayment?.amount || 0,
            date: newPayment?.date ? new Date(newPayment.date) : new Date(),
            paymentMethod: newPayment?.paymentMethod || "Unknown",
            paymentBy: newPayment?.paymentBy || "Unknown",
            admission_fees: newPayment?.admission_fees || 0,
            development_fee: newPayment?.development_fee || 0,
            exam_fee: newPayment?.exam_fee || 0,
            progress_card: newPayment?.progress_card || 0,
            identity_card: newPayment?.identity_card || 0,
            school_diary: newPayment?.school_diary || 0,
            school_activity: newPayment?.school_activity || 0,
            tuition_fee: newPayment?.tuition_fee || 0,
            late_fee: newPayment?.late_fee || 0,
            miscellaneous: newPayment?.miscellaneous || 0,
            receiptBookName: newPayment?.receiptBookName || "",
            receiptNumber: newPayment?.receiptNumber || 0,
        };

        if (!paymentEntry) {
            paymentEntry = new Payment({
                studentId,
                academicYears: [{
                    academicYear: resolvedYearId,
                    totalFees,
                    discount,
                    isNewStudent,
                    payments: newPayment ? [basePaymentRecord] : []
                }]
            });
        } else {
            const academicYearIndex = paymentEntry.academicYears.findIndex(ay => 
                ay.academicYear?.toString() === resolvedYearId.toString()
            );

            if (academicYearIndex !== -1) {
                paymentEntry.academicYears[academicYearIndex].totalFees = totalFees;
                paymentEntry.academicYears[academicYearIndex].discount = discount;
                paymentEntry.academicYears[academicYearIndex].isNewStudent = isNewStudent;

                if (newPayment) {
                    paymentEntry.academicYears[academicYearIndex].payments.push(basePaymentRecord);
                }
            } else {
                paymentEntry.academicYears.push({
                    academicYear: resolvedYearId,
                    totalFees,
                    discount,
                    isNewStudent,
                    payments: newPayment ? [basePaymentRecord] : []
                });
            }
        }

        await paymentEntry.save();
        res.json({ message: "Payment recorded successfully", paymentEntry });
    } catch (error) {
        console.error("❌ Database error:", error);
        res.status(500).json({ error: "Failed to save payment" });
    }
};

exports.getFees = async (req, res) => {
    const { studentId, academicYear } = req.query;

    try {
        const schoolId = req.schoolId;
        
        if (!studentId || !academicYear) {
            const allFees = await Payment.find({}).populate('academicYears.academicYear', 'name year');
            return res.json(allFees);
        }

        const resolvedYearId = await resolveAcademicYearId(academicYear, schoolId);
        if (!resolvedYearId) {
            return res.status(404).json({ error: "Academic year not found" });
        }

        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ error: "Student not found" });
        }

        // Map student.enrollments lookup (academicYear matches the ID string or populated object)
        const academicData = (student.enrollments || []).find(year => 
            (year.academicYear?._id || year.academicYear)?.toString() === resolvedYearId.toString()
        );
        
        if (!academicData) {
            return res.status(404).json({ error: "No matching academic year found for this student" });
        }

        const className = academicData.class;
        const classData = await Class.findOne({ class: className });
        if (!classData) {
            return res.status(404).json({ error: "Class not found" });
        }

        const classId = classData._id;
        const classFees = await ClassFees.findOne({ class_id: classId });
        if (!classFees) {
            return res.status(404).json({ error: "No fees record found for this class" });
        }

        const paymentRecord = await Payment.findOne({ studentId: studentId });

        let payments = [];
        let isNewStudent = false;
        let discount = 0;
        let totalFees = 0;

        if (paymentRecord) {
            const yearData = paymentRecord.academicYears.find(year => 
                year.academicYear?.toString() === resolvedYearId.toString()
            );

            if (yearData) {
                payments = yearData.payments;
                isNewStudent = yearData.isNewStudent ?? false;
                discount = yearData.discount ?? 0;
                totalFees = yearData.totalFees ?? 0;
            }
        }

        res.json({
            totalFees,
            discount,
            isNewStudent,
            payments
        });

    } catch (error) {
        console.error("❌ Database error:", error);
        res.status(500).json({ error: "Failed to fetch fees" });
    }
};

// Class Fees
exports.saveClassFees = async (req, res) => {
    try {
        const {
            academicYear,
            class_id,
            admission_fees,
            development_fee,
            exam_fee,
            progress_card,
            identity_card,
            school_diary,
            school_activity,
            tuition_fee
        } = req.body;

        if (!academicYear || !class_id) {
            return res.status(400).json({ message: "Academic Year and Class are required." });
        }

        const schoolId = req.schoolId;
        const resolvedYearId = await resolveAcademicYearId(academicYear, schoolId) || new mongoose.Types.ObjectId("6a49704e31d281a6130aa86b");
        
        const classIdObj = new mongoose.Types.ObjectId(class_id);
        let classFeesDoc = await ClassFees.findOne({ academicYear: resolvedYearId });

        const newFee = {
            class_id: classIdObj,
            admission_fees,
            development_fee,
            exam_fee,
            progress_card,
            identity_card,
            school_diary,
            school_activity,
            tuition_fee
        };

        if (!classFeesDoc) {
            classFeesDoc = new ClassFees({
                academicYear: resolvedYearId,
                classes: [newFee]
            });
        } else {
            const index = classFeesDoc.classes.findIndex(c =>
                c.class_id && c.class_id.equals(classIdObj)
            );

            if (index !== -1) {
                classFeesDoc.classes[index] = {
                    ...classFeesDoc.classes[index]._doc,
                    ...newFee
                };
            } else {
                classFeesDoc.classes.push(newFee);
            }
        }

        await classFeesDoc.save();
        res.status(201).json({ message: "Class fees updated", data: classFeesDoc });
    } catch (error) {
        console.error("❌ Server error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

exports.getClassFees = async (req, res) => {
    try {
        const classFees = await ClassFees.find()
            .populate('academicYear', 'name year')
            .populate('classes.class_id');
        res.status(200).json(classFees);
    } catch (error) {
        res.status(500).json({ message: "Error fetching fees", error: error.message });
    }
};

// Receipt book invoicing
exports.getReceiptBook = async (req, res) => {
    try {
        let receiptBook = await ReceiptBook.findOne();
        if (!receiptBook) {
            receiptBook = new ReceiptBook({ bookName: "Book A", currentNumber: 1 });
            await receiptBook.save();
        }
        res.json(receiptBook);
    } catch (err) {
        res.status(500).json({ message: "Error fetching receipt book" });
    }
};

exports.updateReceiptBook = async (req, res) => {
    try {
        const { bookName, startNumber } = req.body;
        let receiptBook = await ReceiptBook.findOne();

        if (!receiptBook) {
            receiptBook = new ReceiptBook({ bookName, currentNumber: startNumber });
        } else {
            receiptBook.bookName = bookName;
            receiptBook.currentNumber = startNumber;
        }

        await receiptBook.save();
        res.json(receiptBook);
    } catch (err) {
        res.status(500).json({ message: "Error updating receipt book" });
    }
};

exports.incrementReceipt = async (req, res) => {
    try {
        const receiptBook = await ReceiptBook.findOne();
        if (!receiptBook) {
            return res.status(404).json({ message: "Receipt book not found" });
        }
        receiptBook.currentNumber += 1;
        await receiptBook.save();
        res.json(receiptBook);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error incrementing receipt number" });
    }
};

exports.copyClassFees = async (req, res) => {
    try {
        const { fromYear, toYear } = req.body;
        if (!fromYear || !toYear) {
            return res.status(400).json({ message: "Both fromYear and toYear parameters are required." });
        }

        const schoolId = req.schoolId;
        const fromYearId = await resolveAcademicYearId(fromYear, schoolId);
        const toYearId = await resolveAcademicYearId(toYear, schoolId);

        if (!fromYearId || !toYearId) {
            return res.status(404).json({ message: "One or both academic years could not be resolved." });
        }

        const sourceFees = await ClassFees.findOne({ academicYear: fromYearId });
        if (!sourceFees) {
            return res.status(404).json({ message: `No fee structure found to copy from year '${fromYear}'.` });
        }

        // Overwrite or create new ClassFees document for target year
        let targetFees = await ClassFees.findOne({ academicYear: toYearId });
        const copiedClasses = sourceFees.classes.map(c => ({
            class_id: c.class_id,
            admission_fees: c.admission_fees || 0,
            development_fee: c.development_fee || 0,
            exam_fee: c.exam_fee || 0,
            progress_card: c.progress_card || 0,
            identity_card: c.identity_card || 0,
            school_diary: c.school_diary || 0,
            school_activity: c.school_activity || 0,
            tuition_fee: c.tuition_fee || 0
        }));

        if (!targetFees) {
            targetFees = new ClassFees({
                academicYear: toYearId,
                classes: copiedClasses
            });
        } else {
            targetFees.classes = copiedClasses;
        }

        await targetFees.save();
        res.status(200).json({ message: `Successfully copied fee structure to academic year ${toYear}!`, data: targetFees });
    } catch (error) {
        console.error("❌ Error copying class fees:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};
