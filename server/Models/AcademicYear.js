const mongoose = require('mongoose');

const academicYearSchema = new mongoose.Schema({
  name: {
    type: String, // e.g. "2025-2026"
    required: true,
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['Draft', 'Active', 'Locked', 'Archived'],
    default: 'Draft',
    index: true
  },
  isCurrent: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Enforce unique name per school (schoolId is added by the global plugin)
academicYearSchema.index({ name: 1, schoolId: 1 }, { unique: true });

const AcademicYear = mongoose.model('AcademicYear', academicYearSchema);

module.exports = AcademicYear;
