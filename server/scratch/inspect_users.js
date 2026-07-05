const mongoose = require('mongoose');
require('dotenv').config();

async function inspectUsers() {
    try {
        const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017/SSS';
        console.log('Connecting to:', mongoUrl);
        await mongoose.connect(mongoUrl);
        console.log('Connected to MongoDB');

        const User = require('../Models/User');

        const users = await User.find({});
        console.log('\n--- Registered Users ---');
        users.forEach(u => {
            console.log(`Username: "${u.username}" | Password: "${u.password}" | Type: "${u.type}" | isDev: ${u.isDev || false} | schoolId: ${u.schoolId}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

inspectUsers();
