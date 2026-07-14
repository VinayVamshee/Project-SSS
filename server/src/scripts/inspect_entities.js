const mongoose = require('mongoose');
require('dotenv').config({ path: 'server/.env' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URL);
  const ents = await mongoose.connection.db.collection('entityregistries').find({}).toArray();
  for (const ent of ents) {
    console.log(`Key: ${ent.key}, ID: ${ent._id}`);
    console.log("Storage:", JSON.stringify(ent.storage, null, 2));
    console.log("-----------------------------------------");
  }
  await mongoose.disconnect();
}
run().catch(console.error);
