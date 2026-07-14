const mongoose = require('mongoose');
require('dotenv').config({ path: 'server/.env' });
const Template = require('../domain/metadata/models/Template');

async function migrate() {
  const uri = process.env.MONGODB_URL || 'mongodb://localhost:27017/test';
  console.log(`Connecting to MongoDB at: ${uri}`);
  await mongoose.connect(uri);

  const db = mongoose.connection.db;
  // Get collection name dynamically from the Template model
  const TemplateModel = mongoose.model('Template');
  const collectionName = TemplateModel.collection.name;
  console.log(`Using templates collection: ${collectionName}`);

  const collection = db.collection(collectionName);
  const rawTemplates = await collection.find({}).toArray();
  console.log(`Found ${rawTemplates.length} raw templates to check.`);

  let migratedCount = 0;

  for (const t of rawTemplates) {
    console.log(`Checking template: "${t.label}" (${t.key})`);
    
    // Check if sections is empty or undefined and fields exists and is non-empty
    const hasSections = t.sections && Array.isArray(t.sections) && t.sections.length > 0;
    const hasFields = t.fields && Array.isArray(t.fields) && t.fields.length > 0;

    if (!hasSections && hasFields) {
      console.log(`-> Migrating template: "${t.label}" (${t.key}) with ${t.fields.length} legacy fields...`);

      const mappedSections = [{
        label: "",
        description: "",
        icon: "",
        order: 1,
        collapsible: false,
        collapsedByDefault: false,
        fields: t.fields.map(f => ({
          fieldId: f.fieldId,
          order: f.order || 1,
          required: f.required || false,
          unique: f.unique || false,
          readOnly: f.readOnly || f.readonly || false,
          hidden: f.hidden || false,
          width: f.width || 12,
          placeholder: f.placeholder || "",
          helperText: f.helperText || "",
          defaultValue: f.defaultValue,
          validation: f.validation || {}
        }))
      }];

      await collection.updateOne(
        { _id: t._id },
        { 
          $set: { sections: mappedSections },
          $unset: { fields: "" } // Clean up legacy fields property from DB
        }
      );

      console.log(`-> Successfully migrated "${t.label}"`);
      migratedCount++;
    } else {
      console.log(`-> Skipped: hasSections=${hasSections}, hasFields=${hasFields}`);
    }
  }

  console.log(`Migration complete. Successfully migrated ${migratedCount} templates.`);
  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
