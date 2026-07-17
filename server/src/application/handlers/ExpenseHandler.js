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

    return {
      expense: expenseDoc
    };
  }
}

module.exports = new ExpenseHandler();
