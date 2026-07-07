// domain/services/studentService.js
const studentRepository = require('../repositories/studentRepository');
const { logAudit } = require('../../core/audit/auditLogger');
const { financialEventsQueue } = require('../../infrastructure/queue/queueManager');
const AppError = require('../../core/error/AppError');

class StudentService {
  async admitStudent(studentData, req) {
    if (!studentData.name) {
      throw new AppError('Student name is required', 400);
    }

    // Assign school context
    studentData.schoolId = req.tenant._id || req.tenant.id;

    // Create student record
    const student = await studentRepository.create(studentData);

    // Audit Log
    await logAudit('CREATE', 'Student', student._id, studentData, req);

    // Publish Domain Event to Redis Queue (BullMQ)
    await financialEventsQueue.add('StudentCreated', {
      studentId: student._id,
      schoolId: student.schoolId,
      name: student.name,
      timestamp: new Date()
    });

    return student;
  }

  async updateStudentProfile(id, updateData, req) {
    const student = await studentRepository.findById(id);
    if (!student) {
      throw new AppError('Student not found', 404);
    }

    const updatedStudent = await studentRepository.update(id, updateData);

    // Audit Log
    await logAudit('UPDATE', 'Student', id, updateData, req);

    return updatedStudent;
  }
}

module.exports = new StudentService();
