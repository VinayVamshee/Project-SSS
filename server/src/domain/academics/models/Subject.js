const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: {
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

subjectSchema.index({ name: 1, schoolId: 1 }, { unique: true });

module.exports = mongoose.model('Subject', subjectSchema);
