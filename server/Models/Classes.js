const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  class: {
    type: String,
    required: true
  },
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
    index: true
  }
});

// Enforce unique class name within each school
classSchema.index({ class: 1, schoolId: 1 }, { unique: true });

module.exports = mongoose.model('Class', classSchema);

