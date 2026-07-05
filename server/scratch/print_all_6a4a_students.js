const mongoose = require('mongoose');
require('dotenv').config();

async function list6a4a() {
    try {
        const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017/SSS';
        console.log('Connecting to:', mongoUrl);
        await mongoose.connect(mongoUrl);
        console.log('Connected to MongoDB');

        const Student = require('../Models/Student');

        const students = await Student.find({
            _id: {
                $gte: new mongoose.Types.ObjectId("6a4a00000000000000000000"),
                $lte: new mongoose.Types.ObjectId("6a4affffffffffffffffffff")
            }
        });

        console.log(`\nFound ${students.length} students starting with "6a4a":`);
        students.forEach((s, idx) => {
            console.log(`[${idx + 1}] _id: ${s._id}, name: ${s.name}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

list6a4a();
