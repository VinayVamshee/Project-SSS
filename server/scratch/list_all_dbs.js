const mongoose = require('mongoose');
require('dotenv').config();

async function listDbs() {
    try {
        const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017/SSS';
        console.log('Connecting to cluster:', mongoUrl);
        await mongoose.connect(mongoUrl);
        console.log('Connected to MongoDB');

        const admin = mongoose.connection.useDb('admin');
        const dbList = await admin.db.admin().listDatabases();
        console.log('\nDatabases on Cluster:');
        
        for (const dbInfo of dbList.databases) {
            const dbName = dbInfo.name;
            console.log(`\n=== Database: ${dbName} ===`);
            const db = mongoose.connection.useDb(dbName);
            const collections = await db.db.listCollections().toArray();
            for (const col of collections) {
                const count = await db.db.collection(col.name).countDocuments({});
                console.log(`  - ${col.name} : ${count} documents`);
            }
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

listDbs();
