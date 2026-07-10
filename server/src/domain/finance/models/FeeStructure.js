const mongoose = require('mongoose');

const classFeeSubSchema = new mongoose.Schema({
  class_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  fees: [
    {
      fieldId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FieldRegistry',
        required: true
      },
      amount: {
        type: Number,
        default: 0
      }
    }
  ]
});

const feeStructureSchema = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
    index: true
  },
  academicYear: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicYear',
    required: true,
  },
  classes: [classFeeSubSchema]
}, {
  timestamps: true,
});

feeStructureSchema.index(
{
    schoolId:1,
    academicYear:1
},
{
    unique:true
});

module.exports = mongoose.model('FeeStructure', feeStructureSchema);
