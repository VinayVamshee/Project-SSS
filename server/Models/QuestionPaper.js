const mongoose = require('mongoose');

// Option schema for MCQ
const optionSchema = new mongoose.Schema({
  text: { type: String },
  imageUrl: { type: String },
}, { _id: true });

// Pair schema for 'Match the Following'
const pairItemSchema = new mongoose.Schema({
  leftText: { type: String },
  leftImage: { type: String },
  rightText: { type: String },
  rightImage: { type: String },
}, { _id: true });

// Reusable question schema for main & sub-questions
const baseQuestionSchema = new mongoose.Schema({
  questionId: { type: String, required: true },
  questionText: { type: String, required: true },
  questionImage: { type: String },
  questionType: { type: String, required: true }, // e.g., MCQ, Match, Fill, Sub
  questionMarks: { type: String },
  options: [optionSchema],
  pairs: [pairItemSchema],
  subQuestions: [this], // 🔁 recursive nesting (will be overridden below)
}, { _id: true });

// Override subQuestions manually to allow recursion
baseQuestionSchema.add({
  subQuestions: [baseQuestionSchema]
});

// Main schema
const questionPaperSchema = new mongoose.Schema({
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  chapter: { type: mongoose.Schema.Types.ObjectId, required: false },
  questions: [baseQuestionSchema],
}, { timestamps: true });

module.exports = mongoose.model('QuestionPaper', questionPaperSchema);
