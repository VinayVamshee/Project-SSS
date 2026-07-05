const mongoose = require('mongoose');

// PersonalInformationList acts as the central field definition registry for all student fields.
// Admins add field definitions here; the frontend auto-generates forms from these records.
// isGlobalRegistry sentinel prevents the multi-tenant plugin from scoping this to a single school.
const PersonalInformationListSchema = new mongoose.Schema({
  isGlobalRegistry: { type: Boolean, default: true }, // ← sentinel: opts out of schoolId plugin
  sno: {
    type: Number,
    required: true  // Display order / sequencing
  },
  fieldKey: {
    type: String,
    required: true,
    unique: true,   // Unique machine-readable identifier (e.g. 'admissionNo', 'dob')
    trim: true
  },
  fieldName: {
    type: String,
    required: true  // Human-readable label (e.g. 'Admission Number')
  },
  fieldType: {
    type: String,
    required: true,
    enum: ['text', 'number', 'date', 'select', 'textarea', 'email', 'phone'],
    default: 'text'
  },
  options: {
    type: [String],  // Only for fieldType: 'select'
    default: []
  },
  required: {
    type: Boolean,
    default: false
  },
  isUnique: {
    type: Boolean,
    default: false   // Enforce unique values per school (e.g. Admission No)
  },
  isActive: {
    type: Boolean,
    default: true    // Field can be disabled without deleting
  },
  validationPattern: {
    type: String,    // Regex validation formula (e.g., "^[0-9]{10}$" for phone number)
    default: ""
  },
  validationMessage: {
    type: String,    // Validation error text to display
    default: ""
  },
  // Empty array = applicable to ALL schools. Non-empty = school-specific field
  applicableSchools: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School'
  }]
}, { timestamps: true });

module.exports = mongoose.model('PersonalInformationList', PersonalInformationListSchema);
