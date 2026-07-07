const EntityRegistry = require('../models/EntityRegistry');

class EntityRepository {
  async find(query = {}) {
    return EntityRegistry.find(query);
  }

  async findOne(query) {
    return EntityRegistry.findOne(query);
  }

  async create(data) {
    const registry = new EntityRegistry(data);
    return registry.save();
  }

  async updateById(id, data) {
    return EntityRegistry.findByIdAndUpdate(id, data, { new: true });
  }

  async deleteById(id) {
    return EntityRegistry.findByIdAndDelete(id);
  }
}

module.exports = new EntityRepository();
