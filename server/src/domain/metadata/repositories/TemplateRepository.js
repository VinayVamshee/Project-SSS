const Template = require('../models/Template');

class TemplateRepository {
  async find(query = {}) {
    return Template.find(query).populate('fields.fieldId');
  }

  async findOne(query) {
    return Template.findOne(query).populate('fields.fieldId');
  }

  async findById(id) {
    return Template.findById(id).populate('fields.fieldId');
  }

  async create(data) {
    const template = new Template(data);
    return template.save();
  }

  async updateById(id, data) {
    return Template.findByIdAndUpdate(id, data, { new: true }).populate('fields.fieldId');
  }

  async deleteById(id) {
    return Template.findByIdAndDelete(id);
  }
}

module.exports = new TemplateRepository();
