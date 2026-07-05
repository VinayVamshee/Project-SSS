require('dotenv').config();
const mongoose = require('mongoose');

uri = process.env.MONGODB_URL || 3001;

const connectDB = () => {
    console.log("DataBase Connected");
    return mongoose.connect(uri, {
        // useNewUrlParser: true,
        // useUnifiedTopology: true,
    });
}

module.exports = connectDB;