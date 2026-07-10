const StudentEnrollment = require('../models/StudentEnrollment');

class StudentEnrollmentRepository {
  async findById(id) {
    return StudentEnrollment.findById(id).populate('studentId');
  }

  async findOne(query) {
    return StudentEnrollment.findOne(query).populate('studentId');
  }

  async find(query = {}) {
    return StudentEnrollment.find(query)
      .populate('studentId')
      .populate('academicYearId', 'name status')
      .populate('classId', 'class status')
      .populate('dynamicFields.fieldId', 'key label type sno');
  }

  async create(data) {
    const enrollment = new StudentEnrollment(data);
    return enrollment.save();
  }

  async updateById(id, data) {
    return StudentEnrollment.findByIdAndUpdate(id, data, { new: true });
  }

  async updateMany(query, update) {
    return StudentEnrollment.updateMany(query, update);
  }

  async insertMany(docs) {
    return StudentEnrollment.insertMany(docs);
  }
}

module.exports = new StudentEnrollmentRepository();
