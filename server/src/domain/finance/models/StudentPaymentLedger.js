const mongoose = require('mongoose');

const studentPaymentLedgerSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
    index: true
  },
  academicYearId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicYear',
    required: true
  },
  feeAssignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudentFeeAssignment',
    required: true
  },
  totalFees: {
    type: Number,
    required: true
  },
  discount: {
    type: Number,
    default: 0
  },
  balance: {
    type: Number,
    required: true
  },
  payments: [
    {
      receiptNumber: { type: String, required: true },
      amount: { type: Number, required: true },
      paymentDate: { type: Date, default: Date.now },
      paymentMethod: { type: String, required: true },
      paymentBy: { type: String },
      transactionReference: { type: String },
      remarks: { type: String },
      status: { type: String, enum: ['completed', 'voided'], default: 'completed' },
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      feeComponents: [
        {
          fieldId: { type: mongoose.Schema.Types.ObjectId, ref: 'FieldRegistry', required: true },
          amount: { type: Number, required: true }
        }
      ]
    }
  ]
}, {
  timestamps: true
});

studentPaymentLedgerSchema.index({ studentId: 1, academicYearId: 1 }, { unique: true });

module.exports = mongoose.model('StudentPaymentLedger', studentPaymentLedgerSchema);
