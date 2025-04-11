const mongoose = require('mongoose');
const moment = require('moment');

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    nameHindi: {
      type: String,
    },
    dob: {
      type: Date,
      required: true,
    },
    dobInWords: {
      type: String,
    },
    gender: {
      type: String,
      required: true,
    },
    aadharNo: {
      type: String
    },
    bloodGroup: {
      type: String,
    },
    age: {
      type: Number,
      get: function () {
        return moment().diff(this.dob, 'years');
      },
    },
    image: {
      type: String,
    },
    category: {
      type: String,
    },
    AdmissionNo: {
      type: String,
    },
    Caste: {
      type: String,
    },
    CasteHindi: {
      type: String,
    },
    FreeStud: {
      type: String,
    },
    academicYears: [{
      academicYear: {
        type: String,
        required: true,
      },
      class: {
        type: String,
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
