const mongoose = require('mongoose');

const academicYearSchema = new mongoose.Schema({
  year: {
    type: String,  // You can use String or Number based on your preference
    required: true,
    unique: true,  // Ensures no duplicate years
  },
});

const AcademicYear = mongoose.model('AcademicYear', academicYearSchema);

module.exports = AcademicYear;
