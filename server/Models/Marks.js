const mongoose = require('mongoose');

const marksSchema = new mongoose.Schema({
    studentId: { type: String, required: true },
    name: { type: String, required: true },
    class: { type: String, required: true },
    academicYear: { type: String, required: true },
    marks: {
        type: Map,
        of: {
            type: Map,
            of: Number
        }
    }
}, { timestamps: true });

module.exports = mongoose.model('Marks', marksSchema);
