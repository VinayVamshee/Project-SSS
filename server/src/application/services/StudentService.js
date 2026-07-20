const mongoose = require('mongoose');
const StudentEnrollmentRepository = require('../../domain/student/repositories/StudentEnrollmentRepository');

// Register all required models to avoid runtime missing schema errors
require('../../domain/student/models/Student');
require('../../domain/student/models/StudentEnrollment');
require('../../domain/academics/models/Classes');
require('../../domain/academics/models/AcademicYear');
require('../../domain/metadata/models/FieldRegistry');
require('../../domain/metadata/models/Template');

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

    // Resolve academicYear (name or ID) - Prioritize new year from academicYears array on re-admission
    let academicYearId = (data.academicYears && data.academicYears[0]?.academicYear) || data.academicYearId;
    if (academicYearId && !mongoose.Types.ObjectId.isValid(academicYearId)) {
      const AcademicYear = mongoose.model('AcademicYear');
      const yearDoc = await AcademicYear.findOne({
        $or: [{ name: academicYearId }, { year: academicYearId }],
        schoolId
      });
      if (yearDoc) academicYearId = yearDoc._id;
    }

    // Resolve class (name or ID) - Prioritize new class from academicYears array on re-admission
    let classId = (data.academicYears && data.academicYears[0]?.class) || data.enrollmentClass;
    if (classId && !mongoose.Types.ObjectId.isValid(classId)) {
      const Class = mongoose.model('Class');
      const classDoc = await Class.findOne({ class: classId, schoolId });
      if (classDoc) classId = classDoc._id;
    }

    // Map legacy payload format to EAV payload format
    const payload = {
      studentId: data.previousStudentId || data.studentId || data._id,
      _id: data.previousStudentId || data.studentId || data._id,
      student_code: data.studentCode,
      lifecycle_status: data.lifecycleStatus || 'Active',
      class: classId,
      academicyear: academicYearId,
      section: data.sectionId || (data.academicYears && data.academicYears[0]?.section),
      admissionnumber: data.admissionNumber || data.AdmissionNo,
      rollnumber: data.rollNumber || (data.academicYears && data.academicYears[0]?.rollNumber),
      profilephoto: data.image || data.profilePhoto
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

    // Group ALL enrollments by studentId so we can show full academic history
    const studentMap = new Map();

    for (const e of enrollments) {
      const sid = (e.studentId?._id || e._id).toString();

      // Resolve name from dynamicFields — populated field uses .key (not .fieldKey)
      const nameField = e.dynamicFields.find(
        f => f.fieldId?.key === 'fullname' || f.fieldId?.key === 'firstname'
      );

      const enrollmentEntry = {
        enrollmentId: e._id,
        academicYear: e.academicYearId,          // populated object { _id, name, status }
        class: e.classId?.class || 'N/A',
        classId: e.classId?._id || e.classId,
        section: e.sectionId || '',
        admissionNumber: e.admissionNumber || '',
        rollNumber: e.rollNumber || '',
        academicStatus: e.academicStatus || 'Active',
      };

      if (!studentMap.has(sid)) {
        studentMap.set(sid, {
          _id: e.studentId?._id || e._id,
          studentCode: e.studentId?.studentCode,
          lifecycleStatus: e.studentId?.lifecycleStatus,
          name: nameField ? nameField.value : 'Unknown',
          image: e.profilePhoto || '',
          schoolId: e.schoolId,
          // Expose most-recent enrollment's core fields at the top level for easy display
          academicYearId: e.academicYearId?._id || e.academicYearId,
          enrollmentClass: e.classId?._id || e.classId,
          sectionId: e.sectionId || '',
          admissionNumber: e.admissionNumber || '',
          rollNumber: e.rollNumber || '',
          academicStatus: e.academicStatus || 'Active',
          enrollmentId: e._id,
          dynamicFields: e.dynamicFields,
          enrollments: [enrollmentEntry],
        });
      } else {
        // Append additional enrollment years
        const existing = studentMap.get(sid);
        existing.enrollments.push(enrollmentEntry);
        // Keep the most-recent enrollment's profilePhoto if later one has it
        if (e.profilePhoto) existing.image = e.profilePhoto;
        // Update name if found in a later enrollment
        if (nameField && existing.name === 'Unknown') existing.name = nameField.value;
        // Update dynamic fields to the most recent enrollment's version
        existing.dynamicFields = e.dynamicFields;
        // Update top-level enrollment core fields to latest
        existing.academicYearId = e.academicYearId?._id || e.academicYearId;
        existing.enrollmentClass = e.classId?._id || e.classId;
        existing.sectionId = e.sectionId || '';
        existing.admissionNumber = e.admissionNumber || '';
        existing.rollNumber = e.rollNumber || '';
        existing.academicStatus = e.academicStatus || 'Active';
        existing.enrollmentId = e._id;
      }
    }

    return Array.from(studentMap.values());
  }

  async promoteStudents(schoolId, data) {
    const { studentIds, currentAcademicYear, newAcademicYear, newClass, newSection } = data;

    const Class = mongoose.models.Class || require('../../domain/academics/models/Classes');
    const AcademicYear = mongoose.models.AcademicYear || require('../../domain/academics/models/AcademicYear');

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
        dynamicFields: prev ? (prev.dynamicFields || [])
          .map(df => {
            const fid = df.fieldId?._id || df.fieldId;
            return fid ? { fieldId: fid, value: df.value } : null;
          })
          .filter(Boolean) : []
      };
    });

    return StudentEnrollmentRepository.insertMany(enrollments);
  }

  async updateAcademicYearStatus(studentId, data) {
    const { status } = data;
    const enrollments = await StudentEnrollmentRepository.find({ studentId });
    if (!enrollments || enrollments.length === 0) {
      throw new Error(`No enrollment found for student ID ${studentId}`);
    }
    // Sort by createdAt descending to get the latest enrollment
    const latestEnrollment = enrollments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    return StudentEnrollmentRepository.updateById(latestEnrollment._id, { academicStatus: status });
  }

  async dropAcademicYear(data) {
    const { studentIds, academicYear, status } = data;

    // Resolve academicYear (name string like "2024-25" OR ObjectId) → ObjectId
    const AcademicYear = mongoose.models.AcademicYear || require('../../domain/academics/models/AcademicYear');
    let yearId = academicYear;
    if (academicYear && !mongoose.Types.ObjectId.isValid(academicYear)) {
      const yearDoc = await AcademicYear.findOne({
        $or: [{ name: academicYear }, { year: academicYear }],
      });
      if (!yearDoc) throw new Error(`Academic year "${academicYear}" not found`);
      yearId = yearDoc._id;
    }

    // Map frontend display value "TC-Issued" → schema enum value "TC"
    const resolvedStatus = status === 'TC-Issued' ? 'TC' : status;

    return StudentEnrollmentRepository.updateMany(
      { studentId: { $in: studentIds }, academicYearId: yearId },
      { $set: { academicStatus: resolvedStatus } }
    );
  }

  async deleteStudent(studentId, schoolId) {
    const Student = mongoose.model('Student');
    const StudentEnrollment = mongoose.model('StudentEnrollment');
    const StudentAssessmentMark = mongoose.model('StudentAssessmentMark');

    // 1. Verify student belongs to this school
    const student = await Student.findOne({ _id: studentId, schoolId });
    if (!student) {
      throw new Error('Student not found or does not belong to this school.');
    }

    // 2. Delete all student enrollments
    await StudentEnrollment.deleteMany({ studentId, schoolId });

    // 3. Delete all student assessment marks
    await StudentAssessmentMark.deleteMany({ studentId, schoolId });

    // 4. Delete the student record itself
    await Student.deleteOne({ _id: studentId, schoolId });

    return { message: 'Student and all related records deleted successfully.' };
  }
}

module.exports = new StudentService();
