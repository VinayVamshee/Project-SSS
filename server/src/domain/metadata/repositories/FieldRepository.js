const FieldRegistry = require('../models/FieldRegistry');

class FieldRepository {
  async find(query = {}) {
    return FieldRegistry.find(query);
  }

  async findOne(query) {
    return FieldRegistry.findOne(query);
  }

  async findById(id) {
    return FieldRegistry.findById(id);
  }

  async create(data) {
    const field = new FieldRegistry(data);
    return field.save();
  }

  async updateById(id, data) {
    return FieldRegistry.findByIdAndUpdate(id, data, { new: true });
  }

  async deleteById(id) {
    return FieldRegistry.findByIdAndDelete(id);
  }
}

module.exports = new FieldRepository();
