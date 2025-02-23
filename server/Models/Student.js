const mongoose = require('mongoose');
const moment = require('moment');

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    dob: {
      type: Date,
      required: true,
    },
    age: {
      type: Number,
      get: function () {
        return moment().diff(this.dob, 'years');
      },
    },
    academicYears: [{
      academicYear: {
        type: String, // Storing academic year as a string (e.g., "2024-25")
        required: true,
      },
      class: {
        type: String, // Storing class as a string (e.g., "Class 2")
        required: true,
      },
    }],
    additionalInfo: [
      {
        key: String,
        value: String,
      }
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Student', studentSchema);
