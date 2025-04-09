const mongoose = require('mongoose');

const classFeesSchema = new mongoose.Schema({
  class_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Class",  // Reference to Class model
    default: null
  },
  admission_fees: {
    type: Number,
    default: null
  },
  development_fee: {
    type: Number,
    default: null
  },
  exam_fee: {
    type: Number,
    default: null
  },
  progress_card: {
    type: Number,
    default: null
  },
  identity_card: {
    type: Number,
    default: null
  },
  school_diary: {
    type: Number,
    default: null
  },
  school_activity: {
    type: Number,
    default: null
  },
  tuition_fee: {
    type: Number,
    default: null
  }
});

module.exports = mongoose.model('ClassFees', classFeesSchema);
