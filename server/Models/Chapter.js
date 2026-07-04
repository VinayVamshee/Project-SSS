const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema({
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true,
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true,
  },
  chapters: [
    {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        default: () => new mongoose.Types.ObjectId(), // auto-generate unique ID
      },
      name: {
        type: String,
        required: true,
      }
    }
  ]
});

module.exports = mongoose.model('Chapter', chapterSchema);
