const FinanceService = require('../services/FinanceService');

class FeeStructureHandler {
  async handle(schoolId, mappedModels, payload, template, entity) {
    return await FinanceService.saveClassFees(schoolId, payload);
  }
}

module.exports = new FeeStructureHandler();
