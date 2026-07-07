const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    academicYears: [
        {
            academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
            totalFees: { type: Number, required: true }, 
            discount: { type: Number, default: 0 },
            isNewStudent: { type: Boolean, default: false },
            payments: [
                {
                    amount: { type: Number, required: true },
                    date: { type: Date, default: Date.now }, 
                    paymentMethod: { type: String },
                    paymentBy: { type: String },
                    components: [
                        {
                            fieldId: { type: mongoose.Schema.Types.ObjectId, ref: 'FieldRegistry', required: true },
                            amount: { type: Number, required: true }
                        }
                    ],
                    receiptBookName: { type: String },
                    receiptNumber: { type: Number },
                }
            ]
        }
    ]
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
