const mongoose = require('mongoose');

const studentFeeAssignmentSchema = new mongoose.Schema({
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
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  feeComponents: [
    {
      fieldId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FieldRegistry',
        required: true
      },
      amount: {
        type: Number,
        required: true
      }
    }
  ],
  discount: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'partially_paid', 'fully_paid', 'cancelled'],
    default: 'pending'
  }
}, {
  timestamps: true
});

studentFeeAssignmentSchema.index({ studentId: 1, academicYearId: 1 }, { unique: true });

module.exports = mongoose.model('StudentFeeAssignment', studentFeeAssignmentSchema);
