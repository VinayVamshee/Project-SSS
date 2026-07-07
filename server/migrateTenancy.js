require('dotenv').config();
const mongoose = require('mongoose');

// Import new/refactored models
const School = require('./src/domain/models/School');
const User = require('./src/domain/models/User');
const Student = require('./src/domain/models/Student');
const StudentEnrollment = require('./src/domain/models/StudentEnrollment');
const FieldRegistry = require('./src/domain/models/FieldRegistry');
const Template = require('./src/domain/models/Template');
const Payment = require('./src/domain/models/Payment');
const FeeStructure = require('./src/domain/models/FeeStructure');
const AcademicYear = require('./src/domain/models/AcademicYear');
const Classes = require('./src/domain/models/Classes');
const TransactionTemplate = require('./src/domain/models/TransactionTemplate');

const seedFields = [
  { key: 'first_name', label: 'First Name', type: 'text', required: true, status: 'active' },
  { key: 'name', label: 'Full Name', type: 'text', required: true, status: 'active' },
  { key: 'admission_fees', label: 'Admission Fee', type: 'currency', required: false, status: 'active' },
  { key: 'tuition_fee', label: 'Tuition Fee', type: 'currency', required: false, status: 'active' },
  { key: 'development_fee', label: 'Development Fee', type: 'currency', required: false, status: 'active' },
  { key: 'exam_fee', label: 'Exam Fee', type: 'currency', required: false, status: 'active' },
  { key: 'progress_card', label: 'Progress Card Fee', type: 'currency', required: false, status: 'active' },
  { key: 'identity_card', label: 'Identity Card Fee', type: 'currency', required: false, status: 'active' },
  { key: 'school_diary', label: 'School Diary Fee', type: 'currency', required: false, status: 'active' },
  { key: 'school_activity', label: 'School Activity Fee', type: 'currency', required: false, status: 'active' },
  { key: 'late_fee', label: 'Late Fee', type: 'currency', required: false, status: 'active' },
  { key: 'miscellaneous', label: 'Miscellaneous Fee', type: 'currency', required: false, status: 'active' }
];

const migrate = async () => {
  try {
    const mongoUri = process.env.MONGODB_URL;
    if (!mongoUri) {
      throw new Error("MONGODB_URL environment variable is missing.");
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("Connected successfully!");

    // 1. Seed Field Registry
    console.log("Seeding Field Registry...");
    const fieldMap = {};
    for (const f of seedFields) {
      let field = await FieldRegistry.findOne({ key: f.key });
      if (!field) {
        field = new FieldRegistry(f);
        await field.save();
      }
      fieldMap[f.key] = field._id;
    }
    console.log("Field Registry seeded.");

    // 2. Seed Templates
    console.log("Seeding Templates...");
    let enrollmentTemplate = await Template.findOne({ entity: 'StudentEnrollment' });
    if (!enrollmentTemplate) {
      enrollmentTemplate = new Template({
        entity: 'StudentEnrollment',
        label: 'Student Enrollment Template',
        key: 'student_enrollment_default',
        status: 'active',
        fields: [
          { fieldId: fieldMap['first_name'], order: 1, required: true },
          { fieldId: fieldMap['name'], order: 2, required: true }
        ]
      });
      await enrollmentTemplate.save();
    }

    let paymentTemplate = await Template.findOne({ entity: 'Payment' });
    if (!paymentTemplate) {
      paymentTemplate = new Template({
        entity: 'Payment',
        label: 'Fee Payment Template',
        key: 'fee_payment_default',
        status: 'active',
        fields: Object.keys(fieldMap)
          .filter(k => k.endsWith('_fee') || k === 'progress_card' || k === 'identity_card' || k === 'school_diary' || k === 'school_activity' || k === 'miscellaneous')
          .map((k, idx) => ({ fieldId: fieldMap[k], order: idx + 1, required: false }))
      });
      await paymentTemplate.save();
    }
    console.log("Templates seeded.");

    // 3. Migrate Students to StudentEnrollment
    console.log("Migrating student records to StudentEnrollment...");
    const students = await Student.find();
    let migratedStudentsCount = 0;
    for (const s of students) {
      const legacyStudent = s.toObject();
      const enrollmentsToCreate = [];
      if (legacyStudent.enrollments && legacyStudent.enrollments.length > 0) {
        for (const e of legacyStudent.enrollments) {
          const exists = await StudentEnrollment.findOne({ studentId: s._id, academicYearId: e.academicYear });
          if (!exists) {
            let classId = null;
            if (e.class) {
              const classDoc = await Classes.findOne({ class: e.class, schoolId: s.schoolId });
              classId = classDoc ? classDoc._id : new mongoose.Types.ObjectId();
            } else {
              classId = new mongoose.Types.ObjectId();
            }

            enrollmentsToCreate.push({
              studentId: s._id,
              schoolId: s.schoolId,
              academicYearId: e.academicYear,
              classId,
              sectionId: '',
              admissionNumber: '',
              rollNumber: '',
              profilePhoto: legacyStudent.image || '',
              dynamicFields: [
                { fieldId: fieldMap['name'], value: legacyStudent.name || 'Unknown' }
              ],
              academicStatus: e.status || 'Active'
            });
          }
        }
      } else if (legacyStudent.academicYearId) {
        const exists = await StudentEnrollment.findOne({ studentId: s._id, academicYearId: legacyStudent.academicYearId });
        if (!exists) {
          enrollmentsToCreate.push({
            studentId: s._id,
            schoolId: s.schoolId,
            academicYearId: legacyStudent.academicYearId,
            classId: new mongoose.Types.ObjectId(),
            sectionId: '',
            admissionNumber: '',
            rollNumber: '',
            profilePhoto: legacyStudent.image || '',
            dynamicFields: [
              { fieldId: fieldMap['name'], value: legacyStudent.name || 'Unknown' }
            ],
            academicStatus: 'Active'
          });
        }
      }

      if (enrollmentsToCreate.length > 0) {
        await StudentEnrollment.insertMany(enrollmentsToCreate);
        migratedStudentsCount += enrollmentsToCreate.length;
      }
    }
    console.log(`Migrated ${migratedStudentsCount} student enrollment documents.`);

    // 4. Migrate Payments
    console.log("Migrating Payments to new schema structure...");
    const payments = await Payment.find();
    let migratedPaymentsCount = 0;
    for (const p of payments) {
      let isModified = false;
      const paymentObj = p.toObject();
      const updatedYears = paymentObj.academicYears.map(ay => {
        const updatedPayments = ay.payments.map(pymt => {
          if (pymt.components && pymt.components.length > 0) return pymt;

          const components = [];
          const feeKeys = [
            'admission_fees', 'development_fee', 'exam_fee', 'progress_card',
            'identity_card', 'school_diary', 'school_activity', 'tuition_fee',
            'late_fee', 'miscellaneous'
          ];

          for (const key of feeKeys) {
            if (pymt[key] !== undefined && pymt[key] !== null && pymt[key] > 0) {
              components.push({
                fieldId: fieldMap[key],
                amount: pymt[key]
              });
              isModified = true;
            }
          }

          return {
            ...pymt,
            components
          };
        });

        return {
          ...ay,
          payments: updatedPayments
        };
      });

      if (isModified) {
        p.academicYears = updatedYears;
        await p.save();
        migratedPaymentsCount++;
      }
    }
    console.log(`Migrated ${migratedPaymentsCount} payment documents.`);

    console.log("🎉 Migration successfully completed!");
    await mongoose.disconnect();
  } catch (err) {
    console.error("Migration execution failed:", err);
    process.exit(1);
  }
};

migrate();
