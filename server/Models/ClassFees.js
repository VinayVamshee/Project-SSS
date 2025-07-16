const mongoose = require('mongoose');

const classFeeSubSchema = new mongoose.Schema({
  class_id: {
    type: String
  },
  admission_fees: {
    type: Number,
    default: 0,
  },
  development_fee: {
    type: Number,
    default: 0,
  },
  exam_fee: {
    type: Number,
    default: 0,
  },
  progress_card: {
    type: Number,
    default: 0,
  },
  identity_card: {
    type: Number,
    default: 0,
  },
  school_diary: {
    type: Number,
    default: 0,
  },
  school_activity: {
    type: Number,
    default: 0,
  },
  tuition_fee: {
    type: Number,
    default: 0,
  }
});

const classFeesSchema = new mongoose.Schema({
  academicYear: {
    type: String,
    required: true,
    unique: true
  },
  classes: [classFeeSubSchema]
}, {
  timestamps: true,
});

module.exports = mongoose.model('ClassFees', classFeesSchema);
