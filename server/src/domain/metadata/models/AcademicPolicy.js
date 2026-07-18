const mongoose = require('mongoose');

const GradeRangeSchema = new mongoose.Schema({
  grade: { type: String, required: true },
  minScore: { type: Number, required: true },
  maxScore: { type: Number, required: true },
  gradePoint: { type: Number, default: 0 },
  remarks: { type: String, default: '' },
  displayColor: { type: String, default: '#3b82f6' }
});

const StandingRuleSchema = new mongoose.Schema({
  standing: { type: String, required: true },
  minAverage: { type: Number, required: true },
  maxAverage: { type: Number, required: true },
  remarks: { type: String, default: '' },
  displayColor: { type: String, default: '#10b981' },
  icon: { type: String, default: 'fa-star' }
});

const RiskLevelRuleSchema = new mongoose.Schema({
  level: { type: String, required: true },
  minAttendance: { type: Number, default: 0 },
  minAverage: { type: Number, default: 0 },
  maxFailedSubjects: { type: Number, default: 0 },
  maxConsecutiveAbsentDays: { type: Number, default: 0 },
  feeDueThreshold: { type: Number, default: 0 }
});

const AcademicPolicySchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true, index: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['draft', 'active', 'archived'], default: 'draft' },
  isDefault: { type: Boolean, default: false },
  effectiveFrom: { type: Date, required: true },
  effectiveUntil: { type: Date, required: true },

  // Grading Configurations
  grading: {
    strategy: { type: String, enum: ['percentage', 'points', 'gpa', 'hybrid'], default: 'percentage' },
    passPercentage: { type: Number, default: 33 },
    gradeRanges: [GradeRangeSchema]
  },

  // Ranking Configurations
  ranking: {
    enabled: { type: Boolean, default: true },
    strategy: { type: String, enum: ['highest_average', 'highest_gpa', 'weighted_average', 'best_of_five'], default: 'highest_average' },
    tieBreaker: { type: String, enum: ['attendance', 'age', 'alphabetical', 'none'], default: 'attendance' },
    style: { type: String, enum: ['competition', 'dense', 'ordinal'], default: 'competition' }
  },

  // Standing configurations
  standing: [StandingRuleSchema],

  // Risk evaluations
  risk: {
    enabled: { type: Boolean, default: true },
    levels: [RiskLevelRuleSchema]
  },

  // Promotion configurations
  promotion: {
    minAttendance: { type: Number, default: 75 },
    minAverage: { type: Number, default: 35 },
    mandatorySubjects: [{ type: String }],
    maxFailedSubjects: { type: Number, default: 1 },
    graceMarksLimit: { type: Number, default: 5 },
    condonationLimit: { type: Number, default: 5 }
  },

  // GPA configurations
  gpa: {
    enabled: { type: Boolean, default: false },
    scale: { type: Number, enum: [4, 5, 10], default: 10 },
    passingGradePoints: { type: Number, default: 4 }
  },

  // Awards configurations
  awards: {
    mostImprovedMinDelta: { type: Number, default: 5 },
    perfectAttendancePercent: { type: Number, default: 100 }
  },

  // Report card formatting
  reportCard: {
    showRank: { type: Boolean, default: true },
    showGPA: { type: Boolean, default: false },
    showGrade: { type: Boolean, default: true },
    showRemarks: { type: Boolean, default: true },
    showGraphs: { type: Boolean, default: true }
  },

  // Transcript rules
  transcript: {
    showCredits: { type: Boolean, default: false },
    showCGPA: { type: Boolean, default: false },
    classificationSystem: { type: String, default: 'GPA Scale' }
  }
}, {
  timestamps: true
});

// Single active policy constraint
AcademicPolicySchema.index({ schoolId: 1, academicYearId: 1, isDefault: 1 }, {
  unique: true,
  partialFilterExpression: { isDefault: true, status: 'active' }
});

module.exports = mongoose.model('AcademicPolicy', AcademicPolicySchema);
