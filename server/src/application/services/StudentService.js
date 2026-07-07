const StudentRepository = require('../../domain/student/repositories/StudentRepository');
const StudentEnrollmentRepository = require('../../domain/student/repositories/StudentEnrollmentRepository');

class StudentService {
  async registerStudent(schoolId, data) {
    const { studentCode, lifecycleStatus, image, academicYearId, enrollmentClass, sectionId, admissionNumber, rollNumber, dynamicFields } = data;

    const student = await StudentRepository.create({
      schoolId,
      studentCode: studentCode || `STU-${Date.now()}`,
      lifecycleStatus: lifecycleStatus || 'Active'
    });

    const enrollment = await StudentEnrollmentRepository.create({
      studentId: student._id,
      schoolId,
      academicYearId,
      classId: enrollmentClass,
      sectionId: sectionId || '',
      admissionNumber: admissionNumber || '',
      rollNumber: rollNumber || '',
      profilePhoto: image || '',
      dynamicFields: dynamicFields || [],
      academicStatus: 'Active'
    });

    return { student, enrollment };
  }

  async updateStudent(studentId, schoolId, data) {
    const { studentCode, lifecycleStatus, image, academicYearId, enrollmentClass, sectionId, admissionNumber, rollNumber, dynamicFields } = data;

    const student = await StudentRepository.updateById(studentId, { studentCode, lifecycleStatus });
    if (!student) throw new Error('Student not found');

    let enrollment = await StudentEnrollmentRepository.findOne({ studentId, academicYearId });
    if (enrollment) {
      enrollment.classId = enrollmentClass || enrollment.classId;
      enrollment.sectionId = sectionId || enrollment.sectionId;
      enrollment.admissionNumber = admissionNumber || enrollment.admissionNumber;
      enrollment.rollNumber = rollNumber || enrollment.rollNumber;
      enrollment.profilePhoto = image || enrollment.profilePhoto;
      if (dynamicFields) enrollment.dynamicFields = dynamicFields;
      await enrollment.save();
    } else {
      enrollment = await StudentEnrollmentRepository.create({
        studentId,
        schoolId,
        academicYearId,
        classId: enrollmentClass,
        sectionId: sectionId || '',
        admissionNumber: admissionNumber || '',
        rollNumber: rollNumber || '',
        profilePhoto: image || '',
        dynamicFields: dynamicFields || [],
        academicStatus: 'Active'
      });
    }

    return { student, enrollment };
  }

  async getAllStudents() {
    const enrollments = await StudentEnrollmentRepository.find();
    return enrollments.map(e => {
      const nameField = e.dynamicFields.find(f => f.fieldId?.key === 'name' || f.fieldId?.key === 'first_name');
      return {
        _id: e.studentId?._id || e._id,
        studentCode: e.studentId?.studentCode,
        lifecycleStatus: e.studentId?.lifecycleStatus,
        name: nameField ? nameField.value : 'Unknown',
        image: e.profilePhoto || '',
        academicYearId: e.academicYearId,
        enrollmentClass: e.classId,
        enrollments: [{
          academicYear: e.academicYearId,
          class: e.classId,
          status: e.academicStatus
        }],
        dynamicFields: e.dynamicFields,
        enrollmentId: e._id
      };
    });
  }

  async promoteStudents(schoolId, data) {
    const { studentIds, currentAcademicYear, newAcademicYear, newClass, newSection } = data;

    if (currentAcademicYear) {
      await StudentEnrollmentRepository.updateMany(
        { studentId: { $in: studentIds }, academicYearId: currentAcademicYear },
        { $set: { academicStatus: 'Passed' } }
      );
    }

    const enrollments = studentIds.map(studentId => ({
      studentId,
      schoolId,
      academicYearId: newAcademicYear,
      classId: newClass,
      sectionId: newSection || '',
      academicStatus: 'Active',
      dynamicFields: []
    }));

    return StudentEnrollmentRepository.insertMany(enrollments);
  }

  async dropAcademicYear(data) {
    const { studentIds, academicYear, status } = data;
    return StudentEnrollmentRepository.updateMany(
      { studentId: { $in: studentIds }, academicYearId: academicYear },
      { $set: { academicStatus: status } }
    );
  }
}

module.exports = new StudentService();
