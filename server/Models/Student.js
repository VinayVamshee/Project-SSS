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

    },
    dobInWords: {
      type: String,
    },
    gender: {
      type: String,

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

      },
      class: {
        type: String,

      },
      status: {
        type: String,
        enum: ['Active', 'Passed', 'TC-Issued', 'Dropped'],
        default: 'Active'
      },
    }],
    additionalInfo: [
      {
        infoId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'PersonalInformationList',

        },
        key: {
          type: String,   // copy of PersonalInformationList.name
          required: true
        },
        value: {
          type: String,   // student-specific value
          required: true
        }
      }
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Student', studentSchema);
