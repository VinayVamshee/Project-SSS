const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema({
  className: {
    type: String,
    required: true,
  },
  subjectName: {
    type: String,
    required: true,
  },
  chapters: {
    type: [String], // Array of chapter names
    required: true,
  }
});

module.exports = mongoose.model('Chapter', chapterSchema);
