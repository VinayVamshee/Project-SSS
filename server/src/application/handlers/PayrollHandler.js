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

    // Log Financial Transaction
    try {
      const FinancialTransactionService = require('../services/FinancialTransactionService');
      const totalAmount = (salaryDoc.basicSalary || 0) + (salaryDoc.allowances || []).reduce((sum, a) => sum + (a.amount || 0), 0);

      await FinancialTransactionService.recordTransaction({
        schoolId,
        transactionType: 'expense',
        sourceModule: 'payroll',
        referenceId: salaryDoc._id,
        amount: totalAmount,
        paymentMethod: 'Bank Transfer',
        remarks: `Payroll Allocation for Salary Structure`,
        createdBy: null,
        transactionDate: new Date()
      });
    } catch (txErr) {
      console.error('⚠️ Failed to log financial transaction for payroll:', txErr);
    }

    return {
      salaryStructure: salaryDoc
    };
  }
}

module.exports = new PayrollHandler();
