const mongoose = require('mongoose');
require('dotenv').config();

async function inspectPayments() {
    try {
        const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017/SSS';
        console.log('Connecting to:', mongoUrl);
        await mongoose.connect(mongoUrl);
        console.log('Connected to MongoDB');

        const Payment = require('../Models/Payment');
        const Student = require('../Models/Student');

        const payments = await Payment.find({});
        console.log(`\nTotal payments in database: ${payments.length}`);
        
        for (const p of payments.slice(0, 10)) {
            const student = await Student.findById(p.studentId);
            console.log(`- Student: ${student ? student.name : 'Unknown'} (${p.studentId}) | schoolId: ${p.schoolId}`);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

inspectPayments();
