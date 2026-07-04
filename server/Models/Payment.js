const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true }, // Link to Student model
    academicYears: [
        {
            academicYear: { type: String, required: true }, // Academic Year (e.g., 2024-25, 2025-26)
            totalFees: { type: Number, required: true }, // Total Fees for this academic year
            discount: { type: Number, default: 0 },
            isNewStudent: { type: Boolean, default: false },

            // Payments array for each academic year
            payments: [
                {
                    amount: { type: Number, required: true }, // Total Amount Paid
                    date: { type: Date, default: Date.now }, // Defaults to the current date if not provided
                    paymentMethod: { type: String },
                    paymentBy: { type: String },

                    // Individual Fee Breakdown inside payments
                    admission_fees: { type: Number, default: null },
                    development_fee: { type: Number, default: null },
                    exam_fee: { type: Number, default: null },
                    progress_card: { type: Number, default: null },
                    identity_card: { type: Number, default: null },
                    school_diary: { type: Number, default: null },
                    school_activity: { type: Number, default: null },
                    tuition_fee: { type: Number, default: null },
                    late_fee: { type: Number, default: null },
                    miscellaneous: { type: Number, default: null },
                    receiptBookName: { type: String },
                    receiptNumber: { type: Number },
                }
            ]
        }
    ]
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
