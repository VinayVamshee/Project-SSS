const mongoose = require('mongoose');

const studentAssessmentMarkSchema = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "School",
    required: true
  },
  assessmentConfigurationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AssessmentConfiguration",
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject",
    required: true
  },
  obtainedMarks: Number,
  attendanceStatus: String, // "present", "absent"
  percentage: Number,
  grade: String,
  remarks: String
}, { timestamps: true });

studentAssessmentMarkSchema.index({ assessmentConfigurationId: 1, studentId: 1, subjectId: 1 }, { unique: true });

module.exports = mongoose.model('StudentAssessmentMark', studentAssessmentMarkSchema);
