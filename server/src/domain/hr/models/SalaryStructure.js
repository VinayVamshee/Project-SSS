const mongoose = require('mongoose');

const dynamicFieldSchema = new mongoose.Schema({
  fieldId: { type: mongoose.Schema.Types.ObjectId, ref: 'FieldRegistry', required: true },
  value: { type: String, default: "" },
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true }
}, { _id: true });

const salaryStructureSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  effectiveFrom: { type: Date, required: true, default: Date.now },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  dynamicFields: [dynamicFieldSchema]
}, { timestamps: true });

module.exports = mongoose.model('SalaryStructure', salaryStructureSchema);
