const mongoose = require('mongoose');
require('dotenv').config();

async function findStudents() {
    try {
        const mongoUrl = 'mongodb+srv://Project_SSS:Project_SSS@project-sss.addiw.mongodb.net/SSS';
        console.log('Connecting to database SSS:', mongoUrl);
        await mongoose.connect(mongoUrl);
        console.log('Connected to MongoDB');

        const Student = require('../Models/Student');

        const testId = "6a4a33d5ea41512aedb6416b";
        const foundOneObj = await Student.findOne({ _id: new mongoose.Types.ObjectId(testId) });
        console.log(`Found by ObjectId in SSS:`, foundOneObj ? foundOneObj.name : 'Not Found');

        // Let's count total students
        const count = await Student.countDocuments({});
        console.log('Total students in SSS:', count);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

findStudents();
