const mongoose = require('mongoose');
require('dotenv').config();

const schoolId = "6a4a2532c34e5731d437606d"; // Brilliant Public School

async function createUser() {
    try {
        const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017/SSS';
        console.log('Connecting to:', mongoUrl);
        await mongoose.connect(mongoUrl);
        console.log('Connected to MongoDB');

        const User = require('../Models/User');

        // Check if user already exists for Brilliant Public School
        const exists = await User.findOne({ username: "BSP", schoolId });
        if (exists) {
            console.log('User BSP already exists. Updating password to BSP123*...');
            exists.password = "BSP123*";
            exists.type = "admin";
            await exists.save();
        } else {
            const newUser = new User({
                username: "BSP",
                password: "BSP123*",
                type: "admin",
                schoolId
            });
            await newUser.save();
            console.log('User BSP registered successfully!');
        }

        process.exit(0);
    } catch (err) {
        console.error('Registration failed:', err);
        process.exit(1);
    }
}

createUser();
