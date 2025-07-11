const mongoose = require('mongoose');

const instructionTemplateSchema = new mongoose.Schema({
  name: { type: String }, 
  schoolName: { type: String },
  address: { type: String},
  examTitle: { type: String},
  instructions: [String], 
});

module.exports = mongoose.model('InstructionTemplate', instructionTemplateSchema);
