const mongoose = require('mongoose');

const SchoolSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true }, // e.g. 'abc' for abc.mysss.com
  customDomain: { type: String, unique: true, sparse: true }, // e.g. 'schoolname.com'
  logoUrl: { type: String },
  motto: { type: String },
  backgroundImage: { type: String },
  address: { type: String },
  phoneNo: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  theme: {
    themeName: { type: String, default: 'light' }
  },
  subscription: {
    plan: { type: String, enum: ['basic', 'premium', 'enterprise'], default: 'basic' },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' }
  },
  features: {
    questionPaperModule: { type: Boolean, default: true }
  }
}, { timestamps: true });

module.exports = mongoose.model('School', SchoolSchema);
