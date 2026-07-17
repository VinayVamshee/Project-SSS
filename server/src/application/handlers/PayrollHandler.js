const mongoose = require('mongoose');

class PayrollHandler {
  async handle(schoolId, mappedModels, payload, template, entity) {
    const SalaryStructureModel = mongoose.model('SalaryStructure');
    const salaryData = { ...mappedModels.SalaryStructure, schoolId };

    let salaryDoc;
    if (payload._id || payload.salaryStructureId) {
      const salId = payload._id || payload.salaryStructureId;
      salaryDoc = await SalaryStructureModel.findByIdAndUpdate(salId, salaryData, { new: true, runValidators: true });
    } else {
      salaryDoc = new SalaryStructureModel(salaryData);
      await salaryDoc.save();
    }

    return {
      salaryStructure: salaryDoc
    };
  }
}

module.exports = new PayrollHandler();
