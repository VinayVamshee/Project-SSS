require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./connectDB')
const moment = require('moment');

const Class = require('./Models/Classes');
const Subject = require('./Models/Subject');
const ClassSubjectLink = require('./Models/ClassSubjectLink');
const Chapter = require('./Models/Chapter')
const PersonalInformationList = require('./Models/PersonalInformationList')
const Student = require('./Models/Student')
const Exam = require('./Models/Exam')
const AcademicYear = require('./Models/AcademicYear')
const Marks = require('./Models/Marks')
const Payment = require('./Models/Payment')
const ClassFees = require('./Models/ClassFees')
const ReceiptBook = require('./Models/ReceiptBook')
const User = require('./Models/User')
const Master = require('./Models/Master')
const QuestionPaper = require('./Models/QuestionPaper');
const InstructionTemplate = require('./Models/InstructionTemplate')
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT;
const SECRET = process.env.SECRET;

app.post('/register', async (req, res) => {
    try {
        const { username, password, type = 'viewer' } = req.body;

        const exists = await User.findOne({ username });
        if (exists) return res.status(400).json({ message: 'User already exists' });

        const user = new User({ username, password, type });
        await user.save();

        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Registration failed', error: err.message });
    }
});

// Login (compare plain text)
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user || user.password !== password) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
        { id: user._id, username: user.username, type: user.type },
        SECRET,
        { expiresIn: '7d' }
    );

    res.json({ token });
});

app.get('/verifyToken', (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    try {
        const decoded = jwt.verify(token, SECRET);
        res.json({ valid: true, user: decoded });
    } catch (err) {
        res.status(401).json({ message: "Invalid or expired token" });
    }
});

app.post('/AddNewClass', async (req, res) => {
    try {
        const { className } = req.body;

        // Check if the class already exists
        const existingClass = await Class.findOne({ class: className });
        if (existingClass) {
            return res.status(400).json({ message: 'Class already exists' });
        }

        // Create a new class
        const newClass = new Class({
            class: className,
        });

        await newClass.save();
        return res.status(201).json({ message: 'New class added successfully', newClass });
    }
    catch (err) {
        return res.status(500).json({ message: 'Server Error', error: err.message });
    }
});

// Route to get Classes
app.get('/getClasses', async (req, res) => {
    try {
        const classes = await Class.find();
        res.status(200).json({ classes });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching classes', error: error.message });
    }
});

// app to Delete Classes
// Route to delete a class by ID
app.delete('/deleteClass/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deletedClass = await Class.findByIdAndDelete(id);

        if (!deletedClass) {
            return res.status(404).json({ message: 'Class not found' });
        }

        res.status(200).json({ message: 'Class deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting class', error: error.message });
    }
});

// app to Add New Subject
app.post('/AddNewSubject', async (req, res) => {
    const { subjectName } = req.body;
    if (!subjectName) {
        return res.status(400).json({ message: 'Subject name is required.' });
    }
    try {
        const existingSubject = await Subject.findOne({ name: subjectName });
        if (existingSubject) {
            return res.status(400).json({ message: 'Subject already exists' });
        }
        const newSubject = new Subject({
            name: subjectName,
        });
        await newSubject.save();
        return res.status(201).json({ message: 'Subject added successfully.' });
    } catch (error) {
        return res.status(500).json({ message: 'Error adding subject. Please try again later.' });
    }
});

// app to get Subjects
app.get('/getSubjects', async (req, res) => {
    try {
        const subjects = await Subject.find(); // Get all subjects
        res.json({ subjects });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching subjects.' });
    }
});

// app to Delete Subjects
app.delete('/deleteSubject/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const subject = await Subject.findByIdAndDelete(id);

        if (!subject) {
            return res.status(404).json({ message: 'Subject not found' });
        }

        res.status(200).json({ message: 'Subject deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting subject', error: error.message });
    }
});

// app to Link the Subjects and Classes
app.post('/ClassSubjectLink', async (req, res) => {
    try {
        const { className, subjectNames } = req.body;

        // Validate input
        if (!className || !Array.isArray(subjectNames) || subjectNames.length === 0) {
            return res.status(400).json({ message: 'Class Name and Subject Names are required' });
        }

        // Check if the class already exists in the database
        let existingClass = await ClassSubjectLink.findOne({ className });

        if (existingClass) {
            // If the class exists, overwrite the existing subjects with the new ones
            existingClass.subjectNames = subjectNames; // Replace old subjects with new ones

            // Save the updated class record
            await existingClass.save();

            return res.status(200).json({
                message: 'Class subjects updated successfully',
                data: existingClass
            });
        }

        // If class doesn't exist, create a new one with the subjects
        const newClass = new ClassSubjectLink({ className, subjectNames });
        await newClass.save();

        return res.status(201).json({
            message: 'Class and subjects linked successfully',
            data: newClass
        });

    } catch (error) {
        console.error('Error linking class and subjects:', error);
        return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

// Get the Classes and Their Subjects Linked
app.get('/class-subjects', async (req, res) => {
    try {
        const classSubjects = await ClassSubjectLink.find();
        res.json({ success: true, data: classSubjects });
    } catch (error) {
        console.error('Error fetching class subjects:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/chapters', async (req, res) => {
    try {
        const { className, subjectName, chapters } = req.body;

        if (!className || !subjectName || !Array.isArray(chapters) || chapters.length === 0) {
            return res.status(400).json({ message: 'className, subjectName and chapters are required' });
        }

        let existing = await Chapter.findOne({ className, subjectName });

        if (existing) {
            existing.chapters = chapters; // overwrite existing chapters
            await existing.save();
            return res.status(200).json({ message: 'Chapters updated successfully', data: existing });
        }

        const newChapter = new Chapter({ className, subjectName, chapters });
        await newChapter.save();
        res.status(201).json({ message: 'Chapters added successfully', data: newChapter });

    } catch (error) {
        console.error('Error adding chapters:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

app.get('/chapters', async (req, res) => {
    try {
        const allChapters = await Chapter.find();
        res.status(200).json({ success: true, data: allChapters });
    } catch (error) {
        console.error('Error fetching chapters:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.delete('/chapters', async (req, res) => {
    try {
        const { className, subjectName } = req.body;

        if (!className || !subjectName) {
            return res.status(400).json({ message: 'className and subjectName are required' });
        }

        const deleted = await Chapter.findOneAndDelete({ className, subjectName });

        if (!deleted) {
            return res.status(404).json({ message: 'Chapters not found for given class and subject' });
        }

        res.status(200).json({ message: 'Chapters deleted successfully', data: deleted });

    } catch (error) {
        console.error('Error deleting chapters:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

// Route to add additional personal information
app.post('/AddAdditionalPersonalInformation', async (req, res) => {
    try {
        const { sno, personalInformationList_name } = req.body;

        if (!sno || !personalInformationList_name) {
            return res.status(400).json({ message: "S.No and Name are required" });
        }

        // Check if the name already exists
        const existingInfo = await PersonalInformationList.findOne({ name: personalInformationList_name });

        if (existingInfo) {
            // Update the sno if it's different
            if (existingInfo.sno !== sno) {
                existingInfo.sno = sno;
                await existingInfo.save();
                return res.status(200).json({ message: "S.No updated for existing name", data: existingInfo });
            } else {
                return res.status(200).json({ message: "No changes made. Same S.No already exists for this name.", data: existingInfo });
            }
        }

        // Create new entry if name doesn't exist
        const newInfo = new PersonalInformationList({
            sno,
            name: personalInformationList_name
        });

        await newInfo.save();
        res.status(201).json({ message: "New personal information added successfully", data: newInfo });

    } catch (error) {
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

// Route to get all personal information
app.get('/GetPersonalInformationList', async (req, res) => {
    try {
        const infoList = await PersonalInformationList.find();
        res.status(200).json({ data: infoList });
    } catch (error) {
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

// Route to delete personal information list
app.delete('/DeletePersonalInfo/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const info = await PersonalInformationList.findByIdAndDelete(id);

        if (!info) {
            return res.status(404).json({ message: 'Personal information not found' });
        }

        res.status(200).json({ message: 'Personal information deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting personal information', error: error.message });
    }
});

// Route to add a student
app.post('/addStudent', async (req, res) => {
    try {
        const { name, nameHindi, dob, dobInWords, aadharNo, gender, bloodGroup, image, category, AdmissionNo, Caste, CasteHindi, FreeStud, additionalInfo, academicYears } = req.body;

        const newStudent = new Student({
            name,
            nameHindi,
            dob,
            dobInWords,
            aadharNo,
            gender,
            bloodGroup,
            image,
            category,
            AdmissionNo,
            Caste,
            CasteHindi,
            FreeStud,
            additionalInfo,
            academicYears
        });

        await newStudent.save();
        res.status(201).json({ message: 'Student added successfully', data: newStudent });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error adding student', error: error.message });
    }
});


// Route to get all students
app.get('/getStudent', async (req, res) => {
    try {
        const students = await Student.find(); // Fetch all students from the Student collection
        res.status(200).json({ students });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching students', error: error.message });
    }
});

// Route to update a student
app.put('/updateStudent/:id', async (req, res) => {
    try {
        const studentId = req.params.id;
        const updatedData = req.body;

        const updatedStudent = await Student.findByIdAndUpdate(studentId, updatedData, { new: true });

        if (!updatedStudent) {
            return res.status(404).json({ message: 'Student not found' });
        }

        res.status(200).json({ message: 'Student updated successfully', data: updatedStudent });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating student', error: error.message });
    }
});


// Exam post
app.post('/addExams', async (req, res) => {
    const { className, numExams, examNames } = req.body;

    try {
        let exam = await Exam.findOne({ class: className });

        if (exam) {
            // Update existing record
            exam.numExams = numExams;
            exam.examNames = examNames;
            await exam.save();
            return res.status(200).send('Exam data updated successfully');
        }

        // Create a new record
        exam = new Exam({
            class: className,
            numExams: numExams,
            examNames: examNames
        });
        await exam.save();

        res.status(201).send('Exam data added successfully');
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// Route to get exams for each class
app.get('/getExams', async (req, res) => {
    try {
        // Fetch all exams
        const exams = await Exam.find(); // assuming exams are stored with class info and exam names

        // If no exams found, return empty response
        if (!exams || exams.length === 0) {
            return res.status(404).json({ message: 'No exams found for any class' });
        }

        // Send exams data
        res.status(200).json({ exams });
    } catch (error) {
        console.error('Error fetching exams:', error);
        res.status(500).json({ message: 'Error fetching exams', error: error.message });
    }
});

// Post Academic Year
app.post('/AddAcademicYear', async (req, res) => {
    try {
        const newYear = new AcademicYear({
            year: req.body.year,
        });
        await newYear.save();
        res.status(201).json(newYear);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get all academic years
app.get('/GetAcademicYear', async (req, res) => {
    try {
        const years = await AcademicYear.find();
        res.status(200).json({ data: years });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete an academic year by ID
app.delete('/DeleteAcademicYear/:id', async (req, res) => {
    try {
        const deletedYear = await AcademicYear.findByIdAndDelete(req.params.id);
        if (!deletedYear) {
            return res.status(404).json({ message: 'Academic Year not found' });
        }
        res.status(200).json({ message: 'Academic Year deleted successfully' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Route for saving Marks 
app.post('/submit-marks', async (req, res) => {
    try {
        const { studentId, name, class: studentClass, academicYear, marks } = req.body;

        if (!studentId || !academicYear || !marks) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Check if the student already has marks for the same academic year
        let studentMarks = await Marks.findOne({ studentId, academicYear });

        if (studentMarks) {
            // Update existing entry with the received marks directly
            studentMarks.marks = marks; // Directly update marks field as received from frontend
            await studentMarks.save();
            return res.json({ message: "Marks updated successfully", studentMarks });
        } else {
            // Create a new marks entry using the received marks directly
            const newMarksEntry = new Marks({
                studentId,
                name,
                class: studentClass,
                academicYear,
                marks, // Directly assign the marks as received
            });

            await newMarksEntry.save();
            return res.json({ message: "Marks submitted successfully", newMarksEntry });
        }
    } catch (error) {
        console.error("Error submitting marks:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

//Get Marks
app.get('/get-marks', async (req, res) => {
    try {
        const { studentId, academicYear } = req.query;

        if (!studentId || !academicYear) {
            return res.status(400).json({ error: "Missing studentId or academicYear" });
        }

        // Find marks based on studentId and academicYear
        const studentMarks = await Marks.findOne({ studentId, academicYear });
        if (!studentMarks) {
            return res.status(404).json({ message: "No marks found for the given student and academic year" });
        }

        res.json({ studentMarks });
    } catch (error) {
        console.error("Error fetching marks:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


// Add or update payment details
app.post("/saveFees", async (req, res) => {
    const { studentId, academicYear, totalFees, discount, newPayment, isNewStudent } = req.body;

    try {
        let paymentEntry = await Payment.findOne({ studentId });

        if (!paymentEntry) {
            // 🔹 Create a new payment record if none exists for the student
            paymentEntry = new Payment({
                studentId,
                academicYears: [{
                    academicYear,
                    totalFees,
                    discount,
                    isNewStudent,
                    payments: newPayment ? [{
                        amount: newPayment.amount,
                        date: new Date(newPayment.date),
                        paymentMethod: newPayment.paymentMethod || "Unknown",
                        paymentBy: newPayment.paymentBy || "Unknown",
                        admission_fees: newPayment.admission_fees || 0,
                        development_fee: newPayment.development_fee || 0,
                        exam_fee: newPayment.exam_fee || 0,
                        progress_card: newPayment.progress_card || 0,
                        identity_card: newPayment.identity_card || 0,
                        school_diary: newPayment.school_diary || 0,
                        school_activity: newPayment.school_activity || 0,
                        tuition_fee: newPayment.tuition_fee || 0,
                        late_fee: newPayment.late_fee || 0,
                        miscellaneous: newPayment.miscellaneous || 0,
                        receiptBookName: newPayment.receiptBookName || "",
                        receiptNumber: newPayment.receiptNumber || 0,
                    }] : []
                }]
            });
        } else {
            // 🔹 Check if the academic year already exists
            const academicYearIndex = paymentEntry.academicYears.findIndex(ay => ay.academicYear === academicYear);

            if (academicYearIndex !== -1) {
                // 🔹 If academic year exists, update it
                paymentEntry.academicYears[academicYearIndex].totalFees = totalFees;
                paymentEntry.academicYears[academicYearIndex].discount = discount;
                paymentEntry.academicYears[academicYearIndex].isNewStudent = isNewStudent;

                if (newPayment) {
                    paymentEntry.academicYears[academicYearIndex].payments.push({
                        amount: newPayment.amount,
                        date: new Date(newPayment.date),
                        paymentMethod: newPayment.paymentMethod || "Unknown",
                        paymentBy: newPayment.paymentBy || "Unknown",
                        admission_fees: newPayment.admission_fees || 0,
                        development_fee: newPayment.development_fee || 0,
                        exam_fee: newPayment.exam_fee || 0,
                        progress_card: newPayment.progress_card || 0,
                        identity_card: newPayment.identity_card || 0,
                        school_diary: newPayment.school_diary || 0,
                        school_activity: newPayment.school_activity || 0,
                        tuition_fee: newPayment.tuition_fee || 0,
                        late_fee: newPayment.late_fee || 0,
                        miscellaneous: newPayment.miscellaneous || 0,
                        receiptBookName: newPayment.receiptBookName || "",
                        receiptNumber: newPayment.receiptNumber || 0,
                    });
                }
            } else {
                // 🔹 If academic year does not exist, add a new one
                paymentEntry.academicYears.push({
                    academicYear,
                    totalFees,
                    discount,
                    isNewStudent,
                    payments: newPayment ? [{
                        amount: newPayment.amount,
                        date: new Date(newPayment.date),
                        paymentMethod: newPayment.paymentMethod || "Unknown",
                        paymentBy: newPayment.paymentBy || "Unknown",
                        admission_fees: newPayment.admission_fees || 0,
                        development_fee: newPayment.development_fee || 0,
                        exam_fee: newPayment.exam_fee || 0,
                        progress_card: newPayment.progress_card || 0,
                        identity_card: newPayment.identity_card || 0,
                        school_diary: newPayment.school_diary || 0,
                        school_activity: newPayment.school_activity || 0,
                        tuition_fee: newPayment.tuition_fee || 0,
                        late_fee: newPayment.late_fee || 0,
                        miscellaneous: newPayment.miscellaneous || 0,
                        receiptBookName: newPayment.receiptBookName || "",
                        receiptNumber: newPayment.receiptNumber || 0,
                    }] : []
                });
            }
        }

        // 🔹 Save the updated or new entry
        await paymentEntry.save();

        res.json({ message: "Payment recorded successfully", paymentEntry });

    } catch (error) {
        console.error("❌ Database error:", error);
        res.status(500).json({ error: "Failed to save payment" });
    }
});


app.get("/getFees", async (req, res) => {
    const { studentId, academicYear } = req.query;

    try {
        if (!studentId || !academicYear) {
            // Fetch all students' fees if no specific query params are provided
            const allFees = await Payment.find({});
            return res.json(allFees);
        }

        // Step 1: Find the student
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ error: "Student not found" });
        }

        // Step 2: Match the academic year
        const academicData = student.academicYears.find(year => year.academicYear === academicYear);
        if (!academicData) {
            return res.status(404).json({ error: "No matching academic year found" });
        }

        const className = academicData.class;

        // Step 3: Find the class
        const classData = await Class.findOne({ class: className });
        if (!classData) {
            return res.status(404).json({ error: "Class not found" });
        }

        const classId = classData._id;

        // Step 4: Find the class fees
        const classFees = await ClassFees.findOne({ class_id: classId });
        if (!classFees) {
            return res.status(404).json({ error: "No fees record found for this class" });
        }

        // Step 5: Fetch previous payments from Payments collection
        const paymentRecord = await Payment.findOne({ studentId: studentId });

        let payments = [];
        let isNewStudent = false;
        let discount = 0;

        if (paymentRecord) {
            const yearData = paymentRecord.academicYears.find(
                year => year.academicYear === academicYear
            );

            if (yearData) {
                payments = yearData.payments;
                isNewStudent = yearData.isNewStudent ?? false;
                discount = yearData.discount ?? 0;
            }
        }

        // ✅ Step 6: Respond with the fees & payments
        res.json({
            totalFees:
                paymentRecord?.academicYears.find(y => y.academicYear === academicYear)
                    ?.totalFees || 0,
            discount: discount || 0,
            isNewStudent: isNewStudent,
            payments: payments || []
        });


    } catch (error) {
        console.error("❌ Database error:", error);
        res.status(500).json({ error: "Failed to fetch fees" });
    }
});

// ✅ Add or Update Class Fee for an Academic Year
app.post('/class-fees', async (req, res) => {
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
            return res.status(400).json({ message: "Academic Year and Class ID are required." });
        }

        const classExists = await Class.findById(class_id);
        if (!classExists) {
            return res.status(404).json({ message: "Class not found." });
        }

        let classFeesDoc = await ClassFees.findOne({ academicYear });

        const newFee = {
            class_id,
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
            // First time this year
            classFeesDoc = new ClassFees({
                academicYear,
                classes: [newFee]
            });
        } else {
            // Check if class already has entry
            const index = classFeesDoc.classes.findIndex(c => c.class_id.toString() === class_id);

            if (index !== -1) {
                // Update existing class fee
                classFeesDoc.classes[index] = {
                    ...classFeesDoc.classes[index]._doc,
                    ...newFee
                };
            } else {
                // Add new class fee
                classFeesDoc.classes.push(newFee);
            }
        }

        await classFeesDoc.save();

        res.status(201).json({ message: "Class fees updated", data: classFeesDoc });

    } catch (error) {
        console.error("❌ Server error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

// ✅ Fetch All Class Fees (Grouped by Academic Year)
app.get('/class-fees', async (req, res) => {
    try {
        const classFees = await ClassFees.find().populate('classes.class_id');
        res.status(200).json(classFees);
    } catch (error) {
        res.status(500).json({ message: "Error fetching fees", error: error.message });
    }
});

//pass students to
app.post("/pass-students-to", async (req, res) => {
    try {
        const { studentIds, newAcademicYear, newClass } = req.body;

        // Validation: Ensure required data is provided
        if (!studentIds || studentIds.length === 0 || !newAcademicYear || !newClass) {
            return res.status(400).json({ message: "Missing required data." });
        }

        // Update each selected student
        await Student.updateMany(
            { _id: { $in: studentIds } }, // Find all students with matching IDs
            {
                $push: { academicYears: { academicYear: newAcademicYear, class: newClass } } // Add new year & class
            }
        );

        res.status(200).json({ message: "Students updated successfully!" });
    } catch (error) {
        console.error("Error updating students:", error);
        res.status(500).json({ message: "Internal server error." });
    }
});

//Drop students 
app.post("/drop-academic-year", async (req, res) => {
    try {
        const { studentId, academicYear } = req.body;

        console.log("📩 Received request to drop academic year");
        console.log("➡️ studentId:", studentId);
        console.log("➡️ academicYear:", academicYear);

        if (!studentId || !academicYear) {
            console.warn("⚠️ Missing studentId or academicYear in request body");
            return res.status(400).json({ message: "Missing studentId or academicYear" });
        }

        const student = await Student.findById(studentId);
        if (!student) {
            console.warn(`⚠️ Student not found for ID: ${studentId}`);
            return res.status(404).json({ message: "Student not found" });
        }

        console.log("🧾 Current academicYears:", student.academicYears);

        // Filter out the year to be dropped
        student.academicYears = student.academicYears.filter(
            (entry) => entry.academicYear !== academicYear
        );

        console.log("✅ Updated academicYears:", student.academicYears);

        await student.save();
        console.log("💾 Student record saved successfully");

        res.status(200).json({ message: "Academic year removed successfully" });

    } catch (err) {
        console.error("❌ Error in /drop-academic-year:", err);
        res.status(500).json({ message: "Server error" });
    }
});

app.get("/receiptBook", async (req, res) => {
    try {
        let receiptBook = await ReceiptBook.findOne();

        // If not found, create a default one
        if (!receiptBook) {
            receiptBook = new ReceiptBook({ bookName: "Book A", currentNumber: 1 });
            await receiptBook.save();
        }

        res.json(receiptBook);
    } catch (err) {
        res.status(500).json({ message: "Error fetching receipt book" });
    }
});

// POST to update/reset the book name and start number
app.post("/updateReceiptBook", async (req, res) => {
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
});


app.patch("/incrementReceipt", async (req, res) => {
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
});

app.post('/masters', async (req, res) => {
    try {
        const newMaster = new Master(req.body);
        const savedMaster = await newMaster.save();
        res.status(201).json(savedMaster);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.get('/masters', async (req, res) => {
    try {
        const inUseMaster = await Master.findOne({ inUse: true });
        if (!inUseMaster) return res.status(404).json({ message: 'No master with inUse: true' });
        res.json(inUseMaster);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/get-all-masters', async (req, res) => {
    try {
        const allMasters = await Master.find().sort({ _id: -1 });
        res.json(allMasters);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/masters/:id', async (req, res) => {
    try {
        const updatedMaster = await Master.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true } // returns updated doc
        );
        if (!updatedMaster) return res.status(404).json({ message: 'Master not found' });
        res.json(updatedMaster);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✅ SET ONE MASTER AS IN USE AND RESET OTHERS
app.put('/masters/set-in-use/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // 1. Set all masters' inUse to false
        await Master.updateMany({}, { inUse: false });

        // 2. Set selected one to true
        const updated = await Master.findByIdAndUpdate(id, { inUse: true }, { new: true });

        if (!updated) return res.status(404).json({ message: 'Master not found' });

        res.json({ message: '✅ Master marked as in use', master: updated });
    } catch (err) {
        res.status(500).json({ error: '❌ Failed to update inUse status', details: err.message });
    }
});

app.delete('/masters/:id', async (req, res) => {
    try {
        const deleted = await Master.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: "Not found" });
        res.json({ message: "Master deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// GET all questions for a specific class and subject
app.get('/questions', async (req, res) => {
    const { class: classId, subject: subjectId } = req.query;

    try {
        const paper = await QuestionPaper.findOne({ class: classId, subject: subjectId });
        if (!paper) return res.json({ questions: [] });
        res.json({ questions: paper.questions });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// POST a new question to a question paper
app.post('/questions', async (req, res) => {
    const { class: classId, subject: subjectId, question } = req.body;
    if (!classId || !subjectId || !question || !question.questionType) {
        return res.status(400).json({ error: 'Missing fields' });
    }

    let paper = await QuestionPaper.findOne({ class: classId, subject: subjectId });
    if (!paper) {
        paper = new QuestionPaper({
            class: classId,
            subject: subjectId,
            questions: [question],
        });
    } else {
        paper.questions.push(question);
    }
    await paper.save();
    res.status(201).json(paper.questions);
});

// DELETE a question by index
app.delete('/questions', async (req, res) => {
    const { class: classId, subject: subjectId, index } = req.body;

    try {
        const paper = await QuestionPaper.findOne({ class: classId, subject: subjectId });
        if (!paper || index < 0 || index >= paper.questions.length) {
            return res.status(404).json({ message: 'Question not found' });
        }

        paper.questions.splice(index, 1);
        await paper.save();
        res.json({ questions: paper.questions });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 🔹 GET all templates
app.get('/get-all-templates', async (req, res) => {
    try {
        const templates = await InstructionTemplate.find();
        res.status(200).json(templates);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
});

// 🔹 POST: Save new template
app.post('/save-template', async (req, res) => {
    try {
        const newTemplate = new InstructionTemplate(req.body);
        const saved = await newTemplate.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ error: 'Failed to save template' });
    }
});

// 🔹 DELETE a template by ID
app.delete('/delete-template/:id', async (req, res) => {
    try {
        await InstructionTemplate.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete template' });
    }
});





















const start = async () => {
    try {
        await connectDB();
        app.listen(PORT, () => {
            console.log('Server Connected');
        })
    } catch (error) {
        console.log(error);
    }
}

start();

module.exports = app;