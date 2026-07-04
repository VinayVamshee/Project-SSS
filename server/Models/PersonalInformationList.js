const mongoose = require('mongoose');

const PersonalInformationListSchema = new mongoose.Schema({
  sno: { type: String, required: true },
  name: { type: String, required: true }
});

module.exports = mongoose.model('PersonalInformationList', PersonalInformationListSchema);
