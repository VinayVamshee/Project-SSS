const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  seq: { type: Number, default: 1 },
  isGlobalRegistry: { type: Boolean, default: true, select: false }
});

module.exports = mongoose.model('Counter', counterSchema);