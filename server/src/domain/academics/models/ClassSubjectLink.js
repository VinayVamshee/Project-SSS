const mongoose = require('mongoose');

const classSubjectLinkSchema = new mongoose.Schema({
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true,
  },
  subjectIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    }
  ]
}, { collection: 'classsubjectlinks' });

module.exports = mongoose.model('ClassSubjectLink', classSubjectLinkSchema);
