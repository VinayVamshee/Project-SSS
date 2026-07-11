const Template = require('../models/Template');

class TemplateRepository {
  async find(query = {}) {
    return Template.find(query).populate('sections.fields.fieldId').populate('entity');
  }

  async findOne(query) {
    return Template.findOne(query).populate('sections.fields.fieldId').populate('entity');
  }

  async findById(id) {
    return Template.findById(id).populate('sections.fields.fieldId').populate('entity');
  }

  async create(data) {
    const template = new Template(data);
    return template.save();
  }

  async updateById(id, data) {
    return Template.findByIdAndUpdate(id, data, { new: true }).populate('sections.fields.fieldId').populate('entity');
  }

  async deleteById(id) {
    return Template.findByIdAndDelete(id);
  }
}

module.exports = new TemplateRepository();
