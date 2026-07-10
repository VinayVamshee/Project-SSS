const mongoose = require('mongoose');
const StudentEnrollmentRepository = require('../../domain/student/repositories/StudentEnrollmentRepository');

class StudentService {
  async registerStudent(schoolId, data) {
    const Template = mongoose.model('Template');
    const DispatcherService = require('./DispatcherService');

    // Resolve active student registration template
    const template = await Template.findOne({ 
      status: 'active',
      key: { $regex: 'student_registration', $options: 'i' }
    });

    if (!template) {
      throw new Error("No active student registration template found.");
    }

    // Map legacy payload format to EAV payload format
    const payload = {
      student_code: data.studentCode,
      lifecycle_status: data.lifecycleStatus || 'Active',
      class: data.enrollmentClass,
      academicyear: data.academicYearId,
      section: data.sectionId,
      admissionnumber: data.admissionNumber,
      rollnumber: data.rollNumber,
      profilephoto: data.image
    };

    // Append dynamic fields
    if (data.dynamicFields && Array.isArray(data.dynamicFields)) {
      for (const df of data.dynamicFields) {
        const fieldId = df.fieldId?._id || df.fieldId;
        if (fieldId && df.value !== undefined) {
          const FieldRegistry = mongoose.model('FieldRegistry');
          const field = await FieldRegistry.findById(fieldId);
          if (field) {
            payload[field.key] = df.value;
          }
        }
      }
    }

    return DispatcherService.dispatch(schoolId, template._id, payload);
  }

  async updateStudent(studentId, schoolId, data) {
    const Template = mongoose.model('Template');
    const DispatcherService = require('./DispatcherService');

    const template = await Template.findOne({ 
      status: 'active',
      key: { $regex: 'student_registration', $options: 'i' }
    });

    if (!template) {
      throw new Error("No active student registration template found.");
    }

    // Map update payload
    const payload = {
      studentId: studentId,
      _id: studentId,
      enrollmentId: data.enrollmentId,
      student_code: data.studentCode,
      lifecycle_status: data.lifecycleStatus,
      class: data.enrollmentClass,
      academicyear: data.academicYearId,
      section: data.sectionId,
      admissionnumber: data.admissionNumber,
      rollnumber: data.rollNumber,
      profilephoto: data.image
    };

    if (data.dynamicFields && Array.isArray(data.dynamicFields)) {
      for (const df of data.dynamicFields) {
        const fieldId = df.fieldId?._id || df.fieldId;
        if (fieldId && df.value !== undefined) {
          const FieldRegistry = mongoose.model('FieldRegistry');
          const field = await FieldRegistry.findById(fieldId);
          if (field) {
            payload[field.key] = df.value;
          }
        }
      }
    }

    return DispatcherService.dispatch(schoolId, template._id, payload);
  }

  async getAllStudents() {
    const enrollments = await StudentEnrollmentRepository.find();
    return enrollments.map(e => {
      const nameField = e.dynamicFields.find(f => f.fieldId?.key === 'fullname' || f.fieldId?.key === 'firstname');
      return {
        _id: e.studentId?._id || e._id,
        studentCode: e.studentId?.studentCode,
        lifecycleStatus: e.studentId?.lifecycleStatus,
        name: nameField ? nameField.value : 'Unknown',
        image: e.profilePhoto || '',
        academicYearId: e.academicYearId?._id || e.academicYearId,
        enrollmentClass: e.classId?._id || e.classId,
        enrollments: [{
          academicYear: e.academicYearId,
          class: e.classId?.class || 'N/A',
          status: e.academicStatus
        }],
        dynamicFields: e.dynamicFields,
        enrollmentId: e._id
      };
    });
  }

  async promoteStudents(schoolId, data) {
    const { studentIds, currentAcademicYear, newAcademicYear, newClass, newSection } = data;

    const Class = mongoose.model('Class');
    const AcademicYear = mongoose.model('AcademicYear');

    // 1. Resolve newAcademicYear (name or ID) to its ObjectID
    let targetYearId = newAcademicYear;
    if (newAcademicYear && !mongoose.Types.ObjectId.isValid(newAcademicYear)) {
      const targetYearDoc = await AcademicYear.findOne({
        $or: [{ name: newAcademicYear }, { year: newAcademicYear }],
        schoolId
      });
      if (targetYearDoc) {
        targetYearId = targetYearDoc._id;
      }
    }

    // 2. Resolve newClass (name or ID) to its ObjectID
    let targetClassId = newClass;
    if (newClass && !mongoose.Types.ObjectId.isValid(newClass)) {
      const targetClassDoc = await Class.findOne({ class: newClass, schoolId });
      if (targetClassDoc) {
        targetClassId = targetClassDoc._id;
      }
    }

    // 3. Resolve currentAcademicYear (name or ID) to its ObjectID
    let sourceYearId = currentAcademicYear;
    if (currentAcademicYear && !mongoose.Types.ObjectId.isValid(currentAcademicYear)) {
      const sourceYearDoc = await AcademicYear.findOne({
        $or: [{ name: currentAcademicYear }, { year: currentAcademicYear }],
        schoolId
      });
      if (sourceYearDoc) {
        sourceYearId = sourceYearDoc._id;
      }
    }

    // 4. Fetch previous/current enrollments to copy their data
    let previousEnrollments = [];
    if (sourceYearId) {
      previousEnrollments = await StudentEnrollmentRepository.find({
        studentId: { $in: studentIds },
        academicYearId: sourceYearId
      });

      // Update status of previous academic year enrollments to 'Passed'
      await StudentEnrollmentRepository.updateMany(
        { studentId: { $in: studentIds }, academicYearId: sourceYearId },
        { $set: { academicStatus: 'Passed' } }
      );
    } else {
      // Fallback: search all enrollments for these students to find their latest one
      previousEnrollments = await StudentEnrollmentRepository.find({
        studentId: { $in: studentIds },
        schoolId
      });
    }

    // 5. Map new enrollments copying all data
    const enrollments = studentIds.map(studentId => {
      const studentEnvs = previousEnrollments.filter(pe => 
        pe.studentId?._id?.toString() === studentId.toString() || 
        pe.studentId?.toString() === studentId.toString()
      );
      const prev = studentEnvs[studentEnvs.length - 1];

      return {
        studentId,
        schoolId,
        academicYearId: targetYearId,
        classId: targetClassId,
        sectionId: newSection || (prev ? prev.sectionId : ''),
        academicStatus: 'Active',
        admissionNumber: prev ? prev.admissionNumber : '',
        rollNumber: prev ? prev.rollNumber : '',
        profilePhoto: prev ? prev.profilePhoto : '',
        dynamicFields: prev ? (prev.dynamicFields || []).map(df => ({
          fieldId: df.fieldId?._id || df.fieldId,
          value: df.value
        })) : []
      };
    });

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
