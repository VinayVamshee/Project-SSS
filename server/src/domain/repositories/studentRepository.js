// domain/repositories/studentRepository.js
const Student = require('../models/Student');

class StudentRepository {
  async findById(id) {
    return await Student.findById(id).populate('academicYearId');
  }

  async findBySchool(schoolId) {
    return await Student.find({ schoolId }).populate('academicYearId');
  }

  async create(studentData) {
    const student = new Student(studentData);
    return await student.save();
  }

  async update(id, updateData) {
    return await Student.findByIdAndUpdate(id, updateData, { new: true });
  }

  async delete(id) {
    return await Student.findByIdAndDelete(id);
  }
}

module.exports = new StudentRepository();
