const mongoose = require('mongoose');

// Option schema for MCQ
const optionSchema = new mongoose.Schema({
  text: { type: String },
  imageUrl: { type: String },
});

// Pair schema for 'Match the Following'
const pairItemSchema = new mongoose.Schema({
  leftText: { type: String },
  leftImage: { type: String },
  rightText: { type: String },
  rightImage: { type: String },
});

// Question schema handling all types
const questionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  questionImage: { type: String },
  questionType: { type: String, required: true },
  questionMarks: { type: String },
  options: [optionSchema],
  pairs: [pairItemSchema],
});


const questionPaperSchema = new mongoose.Schema({
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  questions: [questionSchema],
}, { timestamps: true });

module.exports = mongoose.model('QuestionPaper', questionPaperSchema);
