const mongoose = require('mongoose');

const dynamicFieldSchema = new mongoose.Schema({
  fieldId: { type: mongoose.Schema.Types.ObjectId, ref: 'FieldRegistry', required: true },
  value: { type: String, default: "" },
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true }
}, { _id: true });

const expenseSchema = new mongoose.Schema({
  expenseCode: { type: String, required: true },
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  date: { type: Date, required: true, default: Date.now },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['Paid', 'Pending', 'Cancelled'], default: 'Paid' },
  dynamicFields: [dynamicFieldSchema]
}, { timestamps: true });

expenseSchema.index({ expenseCode: 1, schoolId: 1 }, { unique: true });

module.exports = mongoose.model('Expense', expenseSchema);
