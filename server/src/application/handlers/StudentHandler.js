const mongoose = require('mongoose');

class StudentHandler {
  async handle(schoolId, mappedModels, payload, template, entity) {
    const StudentModel = mongoose.model('Student');
    const EnrollmentModel = mongoose.model('StudentEnrollment');

    const studentData = { ...mappedModels.Student, schoolId };
    const enrollmentData = { ...mappedModels.StudentEnrollment, schoolId };

    // Resolve academicYear (name/string to ObjectId)
    if (enrollmentData.academicYearId && !mongoose.Types.ObjectId.isValid(enrollmentData.academicYearId)) {
      const AcademicYear = mongoose.model('AcademicYear');
      const yearDoc = await AcademicYear.findOne({
        $or: [
          { name: enrollmentData.academicYearId },
          { year: enrollmentData.academicYearId }
        ],
        schoolId
      });
      if (yearDoc) {
        enrollmentData.academicYearId = yearDoc._id;
      }
    }

    // Resolve class (name/string to ObjectId)
    if (enrollmentData.classId && !mongoose.Types.ObjectId.isValid(enrollmentData.classId)) {
      const Class = mongoose.model('Class');
      const classDoc = await Class.findOne({ class: enrollmentData.classId, schoolId });
      if (classDoc) {
        enrollmentData.classId = classDoc._id;
      }
    }

    let studentDoc;
    if (payload.studentId || payload._id) {
      const studentId = payload.studentId || payload._id;
      const existingStudent = await StudentModel.findById(studentId);
      if (existingStudent && existingStudent.studentCode && !studentData.studentCode) {
        studentData.studentCode = existingStudent.studentCode;
      }
      studentDoc = await StudentModel.findByIdAndUpdate(studentId, studentData, { new: true, runValidators: true });
    } else {
      if (!studentData.studentCode) {
        const lastStudent = await StudentModel.findOne({ 
          schoolId,
          studentCode: /^S\d+$/
        }).sort({ studentCode: -1 });

        let nextNum = 1;
        if (lastStudent && lastStudent.studentCode) {
          const match = lastStudent.studentCode.match(/^S(\d+)$/);
          if (match) {
            nextNum = parseInt(match[1], 10) + 1;
          }
        }
        studentData.studentCode = `S${String(nextNum).padStart(3, '0')}`;
      }
      studentDoc = new StudentModel(studentData);
      await studentDoc.save();
    }

    enrollmentData.studentId = studentDoc._id;

    let enrollmentDoc;
    if (payload.enrollmentId) {
      enrollmentDoc = await EnrollmentModel.findByIdAndUpdate(payload.enrollmentId, enrollmentData, { new: true, runValidators: true });
    } else {
      const existing = await EnrollmentModel.findOne({
        studentId: studentDoc._id,
        academicYearId: enrollmentData.academicYearId
      });
      if (existing) {
        enrollmentDoc = await EnrollmentModel.findByIdAndUpdate(existing._id, enrollmentData, { new: true, runValidators: true });
      } else {
        enrollmentDoc = new EnrollmentModel(enrollmentData);
        await enrollmentDoc.save();
      }
    }

    // Auto-create StudentFeeAssignment & StudentPaymentLedger
    try {
      const FeeStructureModel = mongoose.model('FeeStructure');
      const StudentFeeAssignmentModel = mongoose.model('StudentFeeAssignment');
      const StudentPaymentLedgerModel = mongoose.model('StudentPaymentLedger');

      let assignment = await StudentFeeAssignmentModel.findOne({
        studentId: studentDoc._id,
        academicYearId: enrollmentData.academicYearId
      });

      if (!assignment) {
        const feeStructure = await FeeStructureModel.findOne({
          schoolId,
          academicYear: enrollmentData.academicYearId
        });

        let feeComponents = [];
        let totalAmount = 0;

        if (feeStructure) {
          const classFees = feeStructure.classes.find(c => c.class_id.toString() === enrollmentData.classId.toString());
          if (classFees) {
            feeComponents = classFees.fees.map(f => ({
              fieldId: f.fieldId,
              amount: f.amount
            }));
            totalAmount = feeComponents.reduce((sum, f) => sum + f.amount, 0);
          }
        }

        assignment = new StudentFeeAssignmentModel({
          studentId: studentDoc._id,
          schoolId,
          academicYearId: enrollmentData.academicYearId,
          classId: enrollmentData.classId,
          feeComponents,
          discount: 0,
          totalAmount,
          status: 'pending'
        });
        await assignment.save();
      }

      let ledger = await StudentPaymentLedgerModel.findOne({
        studentId: studentDoc._id,
        academicYearId: enrollmentData.academicYearId
      });

      if (!ledger) {
        ledger = new StudentPaymentLedgerModel({
          studentId: studentDoc._id,
          schoolId,
          academicYearId: enrollmentData.academicYearId,
          feeAssignmentId: assignment._id,
          totalFees: assignment.totalAmount,
          discount: assignment.discount,
          balance: assignment.totalAmount - assignment.discount,
          payments: []
        });
        await ledger.save();
      }
    } catch (feeErr) {
      console.error('⚠️ Error assigning fee snapshot on student save:', feeErr);
    }

    return {
      student: studentDoc,
      enrollment: enrollmentDoc
    };
  }
}

module.exports = new StudentHandler();
