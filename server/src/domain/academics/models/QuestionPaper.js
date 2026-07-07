const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema({
  text: { type: String },
  imageUrl: { type: String },
}, { _id: true });

const pairItemSchema = new mongoose.Schema({
  leftText: { type: String },
  leftImage: { type: String },
  rightText: { type: String },
  rightImage: { type: String },
}, { _id: true });

const baseQuestionSchema = new mongoose.Schema({
  questionId: { type: String, required: true },
  questionText: { type: String, required: true },
  questionImage: { type: String },
  questionType: { type: String, required: true }, 
  questionMarks: { type: String },
  options: [optionSchema],
  pairs: [pairItemSchema],
  subQuestions: [this], 
}, { _id: true });

baseQuestionSchema.add({
  subQuestions: [baseQuestionSchema]
});

const questionPaperSchema = new mongoose.Schema({
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  chapter: { type: mongoose.Schema.Types.ObjectId, required: false },
  questions: [baseQuestionSchema],
}, { timestamps: true });

module.exports = mongoose.model('QuestionPaper', questionPaperSchema);
