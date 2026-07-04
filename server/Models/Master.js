const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  from: { type: Date, required: true }, // Start date of the session
  to: { type: Date, required: true }    // End date of the session
});

const MasterSchema = new mongoose.Schema({
  imageUrl: { type: String, required: true },
  name: { type: String, required: true },
  sessions: [sessionSchema],
  address: { type: String, required: true },
  phoneNo: { type: String, required: true },
  email: { type: String, required: true },
  inUse: { type: Boolean, default: false }
},{ timestamps: true });

module.exports = mongoose.model('Master', MasterSchema);
