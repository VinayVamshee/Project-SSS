const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  class: {
    type: String,
    required: true,
    unique: true,  // Ensures no duplicate class names
  }
});

module.exports = mongoose.model('Class', classSchema);
