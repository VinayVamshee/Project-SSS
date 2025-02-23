const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true }, // Link to Student model
    academicYears: [
        {
            academicYear: { type: String, required: true }, // Academic Year (e.g., 2024-25, 2025-26)
            totalFees: { type: Number, required: true }, // Total Fees for this academic year
            discount: { type: Number, default: 0 }, 
            isNewStudent: { type: Boolean, default: false },
            payments: [
                {
                    amount: { type: Number, required: true }, // Amount Paid
                    date: {type : Date} // Defaults to the current date if not provided
                }
            ]
        }
    ]
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
