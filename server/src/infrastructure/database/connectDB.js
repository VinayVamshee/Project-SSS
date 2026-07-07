require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URL;

const connectDB = () => {
    console.log("DataBase Connected");
    return mongoose.connect(uri);
}

module.exports = connectDB;
