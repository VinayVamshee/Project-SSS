const mongoose = require('mongoose');
require('dotenv').config();

async function checkPattern() {
    try {
        const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017/SSS';
        console.log('Connecting to:', mongoUrl);
        await mongoose.connect(mongoUrl);
        console.log('Connected to MongoDB');

        const db = mongoose.connection;
        const collections = await db.db.listCollections().toArray();

        const searchIds = [
            "6a4a33d5ea41512aedb6416b",
            "6a4a33d56baf3321452b4736",
            "6a4a33d5c4f58fd3255641e0"
        ];

        console.log('\n--- Searching for target IDs across all collections ---');
        for (const col of collections) {
            for (const idStr of searchIds) {
                const oid = new mongoose.Types.ObjectId(idStr);
                const found = await db.db.collection(col.name).findOne({ _id: oid });
                if (found) {
                    console.log(`Found ID ${idStr} in collection "${col.name}"!`);
                }
            }
        }

        // Let's also check if there are any documents in "students" with IDs starting with "6a4a33"
        const Student = require('../Models/Student');
        const prefixCount = await Student.countDocuments({
            _id: {
                $gte: new mongoose.Types.ObjectId("6a4a33000000000000000000"),
                $lte: new mongoose.Types.ObjectId("6a4a33ffffffffffffffffff")
            }
        });
        console.log(`\nNumber of students with IDs in range 6a4a33...: ${prefixCount}`);

        const allStudentsIn6a4a = await Student.find({
            _id: {
                $gte: new mongoose.Types.ObjectId("6a4a33000000000000000000"),
                $lte: new mongoose.Types.ObjectId("6a4a33ffffffffffffffffff")
            }
        }).limit(10);
        
        console.log('Sample of students in range 6a4a33...:');
        allStudentsIn6a4a.forEach(s => {
            console.log(`- ${s._id} : ${s.name}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkPattern();
