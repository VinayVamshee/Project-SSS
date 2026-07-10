const FinanceService = require('../services/FinanceService');

class FeeStructureHandler {
  async handle(schoolId, mappedModels, payload, template, entity) {
    const fsData = mappedModels.FeeStructure || {};

    // 1. Map dynamic field values (which use "value") to the schema "amount" property
    const mappedFees = (fsData.fees || []).map(f => ({
      fieldId: f.fieldId,
      amount: Number(f.value) || 0
    }));

    // 2. Build the exact payload structure that FinanceService expects
    const cleanPayload = {
      academicYear: payload.academicYear || fsData.academicYear,
      class_id: payload.class_id || fsData.class_id || payload.class || fsData.class,
      fees: mappedFees.length > 0 ? mappedFees : (payload.fees || [])
    };

    return await FinanceService.saveClassFees(schoolId, cleanPayload);
  }
}

module.exports = new FeeStructureHandler();
