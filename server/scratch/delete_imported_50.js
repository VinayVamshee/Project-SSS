const mongoose = require('mongoose');
require('dotenv').config();

async function deleteImported() {
    try {
        const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017/SSS';
        console.log('Connecting to:', mongoUrl);
        await mongoose.connect(mongoUrl);
        console.log('Connected to MongoDB');

        const Student = require('../Models/Student');

        // Generate the 50 ObjectIds using BigInt to prevent hex overflow
        const idsToDelete = [];
        const startInt = BigInt("0x6a4a31f6f2c0c79cd64af834");
        
        for (let i = 0; i < 50; i++) {
            const nextVal = (startInt + BigInt(i)).toString(16);
            idsToDelete.push(new mongoose.Types.ObjectId(nextVal));
        }

        console.log(`Generated ${idsToDelete.length} ObjectIds to delete. First: ${idsToDelete[0]}, Last: ${idsToDelete[idsToDelete.length - 1]}`);

        const result = await Student.deleteMany({ _id: { $in: idsToDelete } });
        console.log(`Successfully deleted ${result.deletedCount} imported students from database.`);

        process.exit(0);
    } catch (err) {
        console.error('Deletion failed:', err);
        process.exit(1);
    }
}

deleteImported();
