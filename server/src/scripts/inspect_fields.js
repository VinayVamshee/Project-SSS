const mongoose = require('mongoose');
require('dotenv').config({ path: 'server/.env' });

const Template = require('../domain/metadata/models/Template');
const FieldRegistry = require('../domain/metadata/models/FieldRegistry');
const EntityRegistry = require('../domain/metadata/models/EntityRegistry');

async function inspect() {
  const uri = process.env.MONGODB_URL;
  await mongoose.connect(uri);

  const template = await Template.findOne({ key: 'student_registration_vamshee' }).populate('sections.fields.fieldId');
  if (!template) {
    console.log("Template not found");
    await mongoose.disconnect();
    return;
  }

  const fields = template.sections[0].fields;
  console.log(`Fields in template: ${fields.length}`);
  
  fields.forEach((f, idx) => {
    const fd = f.fieldId;
    console.log(`${idx + 1}. Key: "${fd ? fd.key : 'N/A'}" | Label: "${fd ? fd.label : 'N/A'}" | Type: "${fd ? fd.type : 'N/A'}" | fieldId: "${f.fieldId._id || f.fieldId}"`);
  });

  await mongoose.disconnect();
}

inspect();
