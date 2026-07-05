// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'viewer', 'student-enrollment', 'qp-editor'], default: 'viewer' },
  isDev: { type: Boolean, default: false }, // Super user developer flag
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: false }
}, { timestamps: true });

// Enforce unique username per school (ignore if schoolId is not defined for global developers)
userSchema.index({ username: 1, schoolId: 1 }, { unique: true, partialFilterExpression: { schoolId: { $exists: true } } });

module.exports = mongoose.model('User', userSchema);
