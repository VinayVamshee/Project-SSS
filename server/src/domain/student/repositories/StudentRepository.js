const Student = require('../models/Student');

class StudentRepository {
  async findById(id) {
    return Student.findById(id);
  }

  async findOne(query) {
    return Student.findOne(query);
  }

  async find(query = {}) {
    return Student.find(query);
  }

  async create(data) {
    const student = new Student(data);
    return student.save();
  }

  async updateById(id, data) {
    return Student.findByIdAndUpdate(id, data, { new: true });
  }

  async deleteById(id) {
    return Student.findByIdAndDelete(id);
  }
}

module.exports = new StudentRepository();
