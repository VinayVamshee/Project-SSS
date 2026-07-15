const mongoose = require('mongoose');
const path = require('path');
require('../domain/shared/models/School');
require('../domain/metadata/models/FieldRegistry');

async function main() {
  console.log('Connecting to database...');
  await mongoose.connect('mongodb+srv://Project_SSS:Project_SSS@project-sss.addiw.mongodb.net/test?retryWrites=true&w=majority');
  
  const FieldRegistry = mongoose.model('FieldRegistry');
  const fields = await FieldRegistry.find({});
  console.log('Registered Fields:');
  for (const f of fields) {
    console.log(`- ID: ${f._id}, Key: "${f.key}", Label: "${f.label}", Type: "${f.type}"`);
  }
  
  mongoose.disconnect();
}

main().catch(err => console.error(err));
