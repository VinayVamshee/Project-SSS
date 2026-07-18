const mongoose = require('mongoose');

class ExpenseHandler {
  async handle(schoolId, mappedModels, payload, template, entity) {
    const ExpenseModel = mongoose.model('Expense');
    const expenseData = { ...mappedModels.Expense, schoolId };

    if (!expenseData.expenseCode) {
      const count = await ExpenseModel.countDocuments({ schoolId });
      expenseData.expenseCode = `EXP-${String(count + 1).padStart(3, '0')}`;
    }

    let expenseDoc;
    if (payload._id || payload.expenseId) {
      const expId = payload._id || payload.expenseId;
      expenseDoc = await ExpenseModel.findByIdAndUpdate(expId, expenseData, { new: true, runValidators: true });
    } else {
      expenseDoc = new ExpenseModel(expenseData);
      await expenseDoc.save();
    }

    // Log Financial Transaction
    try {
      const FinancialTransactionService = require('../services/FinancialTransactionService');
      await FinancialTransactionService.recordTransaction({
        schoolId,
        transactionType: 'expense',
        sourceModule: 'expense_ledger',
        referenceId: expenseDoc._id,
        amount: expenseDoc.amount || 0,
        paymentMethod: expenseDoc.paymentMethod || 'Cash',
        remarks: expenseDoc.description || `Expense Voucher ${expenseDoc.expenseCode}`,
        createdBy: null,
        transactionDate: expenseDoc.date || new Date()
      });
    } catch (txErr) {
      console.error('⚠️ Failed to log financial transaction for expense:', txErr);
    }

    return {
      expense: expenseDoc
    };
  }
}

module.exports = new ExpenseHandler();
