require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URL;

const connectDB = () => {
    return mongoose.connect(uri).then(() => console.log('Database connected'));
}

module.exports = connectDB;
