require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./connectDB')
const moment = require('moment');

const Class = require('./Models/Classes');
const Subject = require('./Models/Subject');
const ClassSubjectLink = require('./Models/ClassSubjectLink');
const PersonalInformationList = require('./Models/PersonalInformationList')
const Student = require('./Models/Student')
const Exam = require('./Models/Exam')
const AcademicYear = require('./Models/AcademicYear')
const Marks = require('./Models/Marks')
const Payment = require('./Models/Payment')
const ClassFees = require('./Models/ClassFees')

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT;

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

// Router to Delete Classes
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


// Router to Add New Subject
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

// Router to get Subjects
app.get('/getSubjects', async (req, res) => {
    try {
        const subjects = await Subject.find(); // Get all subjects
        res.json({ subjects });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching subjects.' });
    }
});

// Router to Delete Subjects
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

// Router to Link the Subjects and Classes
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


// Route to add additional personal information
app.post('/AddAdditionalPersonalInformation', async (req, res) => {
    try {
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ message: "Name is required" });
        }

        const newInfo = new PersonalInformationList({ name });
        await newInfo.save();

        res.status(201).json({ message: "Personal information added successfully", data: newInfo });
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
        const { name, dob, additionalInfo, academicYears } = req.body;

        // Create a new student
        const age = moment().diff(dob, 'years');
        const newStudent = new Student({
            name,
            dob,
            age, // Store calculated age
            additionalInfo,
            academicYears, // Store academic years array
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
                        paymentBy: newPayment.paymentBy || "Unknown"
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
                        paymentBy: newPayment.paymentBy || "Unknown"
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
                        paymentBy: newPayment.paymentBy || "Unknown"
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
            const yearData = paymentRecord.academicYears.find(year => year.academicYear === academicYear);
            if (yearData) {
                payments = yearData.payments.map(payment => ({
                    amount: payment.amount,
                    date: payment.date,
                    paymentMethod: payment.paymentMethod || "Unknown",
                    paymentBy: payment.paymentBy || "Unknown"
                }));
                isNewStudent = yearData.isNewStudent ?? false;
                discount = yearData.discount ?? 0;
            }
        }

        // ✅ Step 6: Respond with the fees & payments
        res.json({
            admission_fees: classFees.admission_fees,
            school_fees: classFees.school_fees,
            tuition_fees: classFees.tuition_fees,
            discount: discount || 0, 
            payments: payments || [], 
            isNewStudent: isNewStudent
        });

    } catch (error) {
        console.error("❌ Database error:", error);
        res.status(500).json({ error: "Failed to fetch fees" });
    }
});




// Add and Get class-fees
app.post('/class-fees', async (req, res) => {
    try {
        const { class_id, school_fees, tuition_fees, admission_fees } = req.body;

        if (!class_id) {
            return res.status(400).json({ message: "Class ID is required." });
        }

        const classData = await Class.findById(class_id);
        if (!classData) {
            return res.status(404).json({ message: "Class not found." });
        }

        let classFees = await ClassFees.findOne({ class_id });

        if (classFees) {
            classFees.school_fees = school_fees || classFees.school_fees;
            classFees.tuition_fees = tuition_fees || classFees.tuition_fees;
            classFees.admission_fees = admission_fees || classFees.admission_fees;
        } else {
            classFees = new ClassFees({ class_id, school_fees, tuition_fees, admission_fees });
        }

        await classFees.save();
        res.status(201).json(classFees);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

// ✅ Fetch All Class Fees (With Class Name)
app.get('/class-fees', async (req, res) => {
    try {
        const classFees = await ClassFees.find().populate("class_id", "class");
        res.status(200).json(classFees);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
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















const start = async () => {
    try {
        await connectDB();
        app.listen(PORT, '0.0.0.0', () => {
            console.log('Server Connected');
        })
    } catch (error) {
        console.log(error);
    }
}

start();

module.exports = app;