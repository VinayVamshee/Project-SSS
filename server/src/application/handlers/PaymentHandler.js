const FinanceService = require('../services/FinanceService');

class PaymentHandler {
  async handle(schoolId, mappedModels, payload, template, entity) {
    return await FinanceService.saveFees(schoolId, payload);
  }
}

module.exports = new PaymentHandler();
