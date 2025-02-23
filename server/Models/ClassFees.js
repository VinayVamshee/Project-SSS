const mongoose = require('mongoose');

const classFeesSchema = new mongoose.Schema({
  class_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Class",  // Reference to Class model
    default: null
  },
  school_fees: {
    type: Number,
    default: null
  },
  tuition_fees: {
    type: Number,
    default: null
  },
  admission_fees: {
    type: Number,
    default: null
  }
});

module.exports = mongoose.model('ClassFees', classFeesSchema);
