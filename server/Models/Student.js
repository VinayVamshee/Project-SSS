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
    image: {
      type: String,
    },
    category: {
      type: String,
    },
    AdmissionNo: {
      type: String,
    },
    oldAdmissionNo: {                    // 🔹 NEW FIELD
      type: String,
    },
    previousStudentId: {                // 🔹 NEW FIELD
      type: mongoose.Types.ObjectId,
      ref: 'Student',
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
      status: {
        type: String,
        enum: ['Active', 'Passed', 'TC-Issued', 'Dropped'],
        default: 'Active'
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
