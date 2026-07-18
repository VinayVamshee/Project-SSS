const mongoose = require('mongoose');

const financialTransactionSchema = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
    index: true
  },
  transactionType: {
    type: String,
    enum: ['income', 'expense'],
    required: true
  },
  sourceModule: {
    type: String,
    enum: ['student_fee', 'payroll', 'expense_ledger', 'other'],
    required: true
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    required: true
  },
  transactionDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['cleared', 'voided', 'pending'],
    default: 'cleared'
  },
  remarks: {
    type: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('FinancialTransaction', financialTransactionSchema);
