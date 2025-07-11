const mongoose = require('mongoose');

const instructionTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., "Template 1"
  schoolName: { type: String, required: true },
  address: { type: String, required: true },
  examTitle: { type: String, required: true },
  instructions: [String], // Array of instructions
});

module.exports = mongoose.model('InstructionTemplate', instructionTemplateSchema);
