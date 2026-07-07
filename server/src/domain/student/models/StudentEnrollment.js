const mongoose = require('mongoose');

const StudentEnrollmentSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
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
    required: true,
    index: true
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  sectionId: {
    type: String,
    default: ''
  },
  admissionNumber: {
    type: String,
    trim: true
  },
  rollNumber: {
    type: String,
    trim: true
  },
  profilePhoto: {
    type: String,
    default: ''
  },
  dynamicFields: [{
    fieldId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FieldRegistry',
      required: true
    },
    value: {
      type: mongoose.Schema.Types.Mixed
    }
  }],
  academicStatus: {
    type: String,
    enum: ['Active', 'Passed', 'Failed', 'TC', 'Dropped', 'Transferred'],
    default: 'Active'
  }
}, {
  timestamps: true
});

StudentEnrollmentSchema.index({ studentId: 1, academicYearId: 1 }, { unique: true });

module.exports = mongoose.model('StudentEnrollment', StudentEnrollmentSchema);
