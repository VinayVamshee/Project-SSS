const FinancialTransaction = require('../../domain/finance/models/FinancialTransaction');

class FinancialTransactionService {
  async recordTransaction({
    schoolId,
    transactionType,
    sourceModule,
    referenceId,
    amount,
    paymentMethod,
    remarks,
    createdBy,
    transactionDate
  }) {
    if (!schoolId || !transactionType || !sourceModule || !referenceId || amount === undefined || !paymentMethod) {
      throw new Error('Missing required fields for financial transaction logging');
    }

    const transaction = new FinancialTransaction({
      schoolId,
      transactionType,
      sourceModule,
      referenceId,
      amount,
      paymentMethod,
      remarks,
      createdBy,
      transactionDate: transactionDate || new Date()
    });

    await transaction.save();
    return transaction;
  }
}

module.exports = new FinancialTransactionService();
