const mongoose = require('mongoose');
require('dotenv').config();

async function findByNames() {
    try {
        const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017/SSS';
        console.log('Connecting to:', mongoUrl);
        await mongoose.connect(mongoUrl);
        console.log('Connected to MongoDB');

        const Student = require('../Models/Student');

        const targetNames = [
            "Arnav Jain", "Anika Gupta", "Aarav Mishra", "Myra Singh", "Arnav Agrawal",
            "Riya Mishra", "Kabir Sahu", "Kiara Singh"
        ];

        console.log('\n--- Searching for imported student names ---');
        for (const name of targetNames) {
            const found = await Student.findOne({ name });
            if (found) {
                console.log(`Match: "${name}" -> _id: ${found._id}, schoolId: ${found.schoolId}`);
            } else {
                console.log(`Match: "${name}" -> NOT FOUND`);
            }
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

findByNames();
