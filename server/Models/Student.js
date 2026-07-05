const mongoose = require('mongoose');

// Student schema follows EAV (Entity-Attribute-Value) architecture.
// Core system fields (name, image, schoolId, academicYearId) are stored directly.
// All configurable student information is stored in dynamicFields, referencing PersonalInformationList.
const studentSchema = new mongoose.Schema(
  {
    // Core identity fields (referenced across Payments, Marks, Results modules)
    name: {
      type: String,
      required: true
    },
    image: {
      type: String,
      default: ''
    },

    // Multi-tenant school reference (injected via global plugin pre-validate hook)
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true
    },

    // Active academic year reference (replaces string year)
    academicYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: false
    },

    // Enrollment history — tracks per-year class assignment and status
    enrollments: [{
      academicYear: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AcademicYear',
        required: true
      },
      class: {
        type: String
      },
      status: {
        type: String,
        enum: ['Active', 'Passed', 'TC-Issued', 'Dropped'],
        default: 'Active'
      }
    }],

    // EAV dynamic fields — all configurable student attributes stored here
    dynamicFields: [{
      fieldId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PersonalInformationList',
        required: true
      },
      value: {
        type: String,
        default: ''
      }
    }]
  },
  { timestamps: true }
);

// Compound index for fast lookups per school
studentSchema.index({ schoolId: 1, academicYearId: 1 });

module.exports = mongoose.model('Student', studentSchema);
