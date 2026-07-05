const mongoose = require('mongoose');
require('dotenv').config();

const studentIds = [
    "6a4a33d5ea41512aedb6416b",
    "6a4a33d56baf3321452b4736",
    "6a4a33d5c4f58fd3255641e0",
    "6a4a33d55febf8fea5a94bcf",
    "6a4a33d50060f2c59a7243be",
    "6a4a33d594ebf252b9c9426f",
    "6a4a33d5eb551173af8244de",
    "6a4a33d50af9d614a0da4dfc",
    "6a4a33d5ee03473e1cdf44c1",
    "6a4a33d51e400fe10cc24b98",
    "6a4a33d56122c84cc62e492b",
    "6a4a33d578453149f4934837",
    "6a4a33d5ddffa8cb64804fb3",
    "6a4a33d52eef80bd904d4b65",
    "6a4a33d59d176b6b6d954592",
    "6a4a33d5d6b7bd8839ae440c",
    "6a4a33d55f1ff8cb4d3b4a34",
    "6a4a33d5b0d7d3a0d59741b7",
    "6a4a33d5bb4ad2cf4a4f4fd4",
    "6a4a33d5f844df57f4de44a5",
    "6a4a33d5a1dd8f90ba4441da",
    "6a4a33d57ecdd6e18002464e",
    "6a4a33d54cff58f2106946e8",
    "6a4a33d554ed27c5a8ee4bcf",
    "6a4a33d5981e7e84b7e04ffb",
    "6a4a33d51cd019d634484405",
    "6a4a33d5ee9ecaf1e7704524",
    "6a4a33d595aa859679c54d18",
    "6a4a33d54d7a30384fb1412b",
    "6a4a33d5e0b6b94db3194005",
    "6a4a33d561654f4d2426411e",
    "6a4a33d5e65c62cc1d1f4edb",
    "6a4a33d54cc53317751a4f22",
    "6a4a33d576654122682c4b4f",
    "6a4a33d55ab68f6e11cc4775",
    "6a4a33d5a517d8a87a334157",
    "6a4a33d54aee2ff01a7d4fdf",
    "6a4a33d56ce7463117354675",
    "6a4a33d54086897c09ad4734",
    "6a4a33d57ba4b24a8d204e03",
    "6a4a33d5e15d717348084c30",
    "6a4a33d5ba1876a25ea84fa0",
    "6a4a33d550601497965e4edb",
    "6a4a33d5e1cb00e0372a4bde",
    "6a4a33d58d3ba1d510064ad9",
    "6a4a33d5aef31b9c58f541fc",
    "6a4a33d5727e4f74c76c4e1e",
    "6a4a33d57904c0a3deb14ced",
    "6a4a33d58fcef077faf14c5c",
    "6a4a33d5d491564ad3b24ab3"
];

async function deleteStudents() {
    try {
        const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017/SSS';
        console.log('Connecting to:', mongoUrl);
        await mongoose.connect(mongoUrl);
        console.log('Connected to MongoDB');

        const Student = require('../Models/Student');

        const objectIds = studentIds.map(id => new mongoose.Types.ObjectId(id));

        const result = await Student.deleteMany({ _id: { $in: objectIds } });
        console.log(`Successfully deleted ${result.deletedCount} students from database.`);

        process.exit(0);
    } catch (err) {
        console.error('Deletion failed:', err);
        process.exit(1);
    }
}

deleteStudents();
