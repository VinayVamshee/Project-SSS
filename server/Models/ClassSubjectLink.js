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
});

module.exports = mongoose.model('ClassSubjectLink', classSubjectLinkSchema);
