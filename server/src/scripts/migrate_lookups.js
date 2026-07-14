const mongoose = require('mongoose');
require('dotenv').config({ path: 'server/.env' });

const FieldRegistry = require('../domain/metadata/models/FieldRegistry');

async function migrate() {
  const uri = process.env.MONGODB_URL || 'mongodb://localhost:27017/sss_v2';
  console.log(`Connecting to MongoDB at: ${uri}`);
  await mongoose.connect(uri);

  console.log('Querying lookup fields...');
  const lookupFields = await FieldRegistry.find({ type: 'lookup' });
  console.log(`Found ${lookupFields.length} lookup fields to migrate.`);

  let migratedCount = 0;
  for (const field of lookupFields) {
    const rawLookup = field.toObject().lookup || {};

    // Transform valueField if it's a string or has a legacy structure
    let newValueField = { field: '_id', source: 'core', path: '' };
    if (typeof rawLookup.valueField === 'string') {
      newValueField.field = rawLookup.valueField;
    } else if (rawLookup.valueField && typeof rawLookup.valueField === 'object') {
      newValueField = {
        field: rawLookup.valueField.field || '_id',
        source: rawLookup.valueField.source || 'core',
        path: rawLookup.valueField.path || ''
      };
    }

    const updatedLookup = {
      entity: rawLookup.entity || null,
      sourceType: rawLookup.sourceType || 'document',
      arrayPath: rawLookup.arrayPath || '',
      displayField: {
        field: rawLookup.displayField?.field || null,
        source: rawLookup.displayField?.source || 'core',
        path: rawLookup.displayField?.path || ''
      },
      valueField: newValueField,
      searchable: rawLookup.searchable !== undefined ? rawLookup.searchable : true,
      multiple: rawLookup.multiple !== undefined ? rawLookup.multiple : false,
      filters: (rawLookup.filters || []).map(f => ({
        field: f.field,
        source: f.source || 'core',
        operator: f.operator || 'equals',
        value: f.value
      }))
    };

    field.lookup = updatedLookup;
    await field.save();
    migratedCount++;
    console.log(`Migrated lookup field: "${field.key}"`);
  }

  await mongoose.disconnect();
  console.log(`Successfully migrated ${migratedCount} lookup fields!`);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
