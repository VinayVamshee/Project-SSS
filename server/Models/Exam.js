const mongoose = require('mongoose');

// Define the schema for storing exam data
const examSchema = new mongoose.Schema({
  class: {
    type: String,
    required: true,
  },
  numExams: {
    type: Number,
    required: true,
  },
  examNames: [{
    type: String,
    required: true,
  }]
});

const Exam = mongoose.model('Exam', examSchema);

module.exports = Exam;
