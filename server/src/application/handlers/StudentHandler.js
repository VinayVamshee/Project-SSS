const mongoose = require('mongoose');

class StudentHandler {
  async handle(schoolId, mappedModels, payload, template, entity) {
    console.log(`[StudentHandler] Executing Student business workflows...`);

    const StudentModel = mongoose.model('Student');
    const EnrollmentModel = mongoose.model('StudentEnrollment');

    const studentData = { ...mappedModels.Student, schoolId };
    const enrollmentData = { ...mappedModels.StudentEnrollment, schoolId };

    if (!studentData.studentCode) {
      const count = await StudentModel.countDocuments({ schoolId });
      studentData.studentCode = `S${String(count + 1).padStart(3, '0')}`;
    }

    let studentDoc;
    if (payload.studentId || payload._id) {
      const studentId = payload.studentId || payload._id;
      studentDoc = await StudentModel.findByIdAndUpdate(studentId, studentData, { new: true, runValidators: true });
    } else {
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
