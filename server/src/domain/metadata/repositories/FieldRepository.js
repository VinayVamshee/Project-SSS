const FieldRegistry = require('../models/FieldRegistry');

class FieldRepository {
  async find(query = {}) {
    return FieldRegistry.find(query).populate('lookup.entity');
  }

  async findOne(query) {
    return FieldRegistry.findOne(query).populate('lookup.entity');
  }

  async findById(id) {
    return FieldRegistry.findById(id).populate('lookup.entity');
  }

  async create(data) {
    const field = new FieldRegistry(data);
    return field.save();
  }

  async updateById(id, data) {
    return FieldRegistry.findByIdAndUpdate(id, data, { new: true }).populate('lookup.entity');
  }

  async deleteById(id) {
    return FieldRegistry.findByIdAndDelete(id);
  }
}

module.exports = new FieldRepository();
