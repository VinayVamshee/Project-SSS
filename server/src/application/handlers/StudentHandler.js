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
        const count = await StudentModel.countDocuments({ schoolId });
        studentData.studentCode = `S${String(count + 1).padStart(3, '0')}`;
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

    return {
      student: studentDoc,
      enrollment: enrollmentDoc
    };
  }
}

module.exports = new StudentHandler();
