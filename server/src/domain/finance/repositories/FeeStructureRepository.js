const FeeStructure = require('../models/FeeStructure');

class FeeStructureRepository {
  async findOne(query) {
    return FeeStructure.findOne(query);
  }

  async find(query = {}) {
    return FeeStructure.find(query)
      .populate('academicYear', 'name year')
      .populate('classes.class_id')
      .populate('classes.fees.fieldId', 'key label type');
  }

  async create(data) {
    const feeStructure = new FeeStructure(data);
    return feeStructure.save();
  }
}

module.exports = new FeeStructureRepository();
