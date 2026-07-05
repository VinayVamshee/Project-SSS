const mongoose = require('mongoose');
require('dotenv').config();

async function fixPayments() {
    try {
        const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017/SSS';
        console.log('Connecting to:', mongoUrl);
        await mongoose.connect(mongoUrl);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const paymentsCol = db.collection('payments');
        const studentsCol = db.collection('students');

        const payments = await paymentsCol.find({}).toArray();
        console.log(`Found ${payments.length} total payments to analyze.`);

        let updatedCount = 0;

        for (const payment of payments) {
            if (!payment.studentId) continue;

            const student = await studentsCol.findOne({ _id: payment.studentId });
            if (student && student.schoolId) {
                // Update using raw MongoDB driver to bypass Mongoose schema restrictions
                await paymentsCol.updateOne(
                    { _id: payment._id },
                    { $set: { schoolId: student.schoolId } }
                );
                updatedCount++;
            } else {
                console.log(`Warning: Student not found or has no schoolId for payment ID: ${payment._id}`);
            }
        }

        console.log(`Successfully mapped and updated schoolId on ${updatedCount} payment records.`);
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

fixPayments();
