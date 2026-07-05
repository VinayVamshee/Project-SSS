const mongoose = require('mongoose');
require('dotenv').config();

async function inspectYears() {
    try {
        const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017/SSS';
        console.log('Connecting to:', mongoUrl);
        await mongoose.connect(mongoUrl);
        console.log('Connected to MongoDB');

        const AcademicYear = require('../Models/AcademicYear');
        const years = await AcademicYear.find({});
        console.log('\n--- Academic Years ---');
        years.forEach(y => {
            console.log(`_id: ${y._id}, name: ${y.name || y.year}, status: ${y.status}, schoolId: ${y.schoolId}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

inspectYears();
