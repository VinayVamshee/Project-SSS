const mongoose = require('mongoose');

const dynamicFieldSchema = new mongoose.Schema({
  fieldId: { type: mongoose.Schema.Types.ObjectId, ref: 'FieldRegistry', required: true },
  value: { type: String, default: "" },
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true }
}, { _id: true });

const employeeSchema = new mongoose.Schema({
  employeeCode: { type: String, required: true },
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  joiningDate: { type: Date, required: true, default: Date.now },
  status: { type: String, enum: ['Active', 'Inactive', 'Terminated'], default: 'Active' },
  dynamicFields: [dynamicFieldSchema]
}, { timestamps: true });

employeeSchema.index({ employeeCode: 1, schoolId: 1 }, { unique: true });

module.exports = mongoose.model('Employee', employeeSchema);
