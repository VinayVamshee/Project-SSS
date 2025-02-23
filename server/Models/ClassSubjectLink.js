const mongoose = require('mongoose');

const classSubjectLinkSchema = new mongoose.Schema({
    className: { type: String, required: true },
    subjectNames: { type: [String], required: true } // Store multiple subjects in an array
});

module.exports = mongoose.model('ClassSubjectLink', classSubjectLinkSchema);
