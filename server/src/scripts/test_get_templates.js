const mongoose = require('mongoose');
require('dotenv').config({ path: 'server/.env' });

const Template = require('../domain/metadata/models/Template');
const FieldRegistry = require('../domain/metadata/models/FieldRegistry');
const EntityRegistry = require('../domain/metadata/models/EntityRegistry');
const TemplateRepository = require('../domain/metadata/repositories/TemplateRepository');

async function test() {
  const uri = process.env.MONGODB_URL;
  console.log(`Connecting to MongoDB at: ${uri}`);
  await mongoose.connect(uri);

  try {
    console.log("Running TemplateRepository.find({})...");
    const templates = await TemplateRepository.find({});
    console.log(`Success! Found ${templates.length} templates.`);
  } catch (err) {
    console.error("Error in TemplateRepository.find:", err);
  }

  await mongoose.disconnect();
}

test();
