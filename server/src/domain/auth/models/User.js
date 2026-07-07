const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  isGlobalRegistry: { type: Boolean, default: true },
  username: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'viewer', 'student-enrollment', 'qp-editor', 'payment-manager', 'payment'], default: 'viewer' },
  isDev: { type: Boolean, default: false }, 
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: false }
}, { timestamps: true });

userSchema.index({ username: 1, schoolId: 1 }, { unique: true, partialFilterExpression: { schoolId: { $exists: true } } });

module.exports = mongoose.model('User', userSchema);
