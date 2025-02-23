const mongoose = require('mongoose');

const PersonalInformationListSchema = new mongoose.Schema({
    name: { type: String, required: true }
});

module.exports = mongoose.model('PersonalInformationList', PersonalInformationListSchema);
