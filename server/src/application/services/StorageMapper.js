const mongoose = require('mongoose');

class StorageMapper {
  async map(payload, storageConfig) {
    const FieldRegistry = mongoose.models.FieldRegistry || require('../../domain/metadata/models/FieldRegistry');
    const mapped = {};

    // 1. Gather all core keys mapped across all models to prevent them from leaking into dynamicFields
    const coreKeys = new Set();
    for (const store of storageConfig) {
      const fieldsMap = store.fields instanceof Map ? Object.fromEntries(store.fields) : (store.fields || {});
      for (const key of Object.keys(fieldsMap)) {
        coreKeys.add(key.toLowerCase());
      }
    }

    for (const store of storageConfig) {
      const modelName = store.model;
      const fieldsMap = store.fields instanceof Map ? Object.fromEntries(store.fields) : (store.fields || {});
      const dynamicFieldContainer = store.dynamicFieldContainer;

      const modelData = {};
      const dynamicFields = [];

      for (const [key, value] of Object.entries(payload)) {
        if (key === '_id' || key === 'schoolId') continue;

        const lowerKey = key.toLowerCase();
        const mappedProperty = fieldsMap[lowerKey];

        if (mappedProperty) {
          modelData[mappedProperty] = value;
        } else {
          // Only treat as dynamic if it is NOT a core mapped field on any model in this config
          if (dynamicFieldContainer && !coreKeys.has(lowerKey)) {
            dynamicFields.push({ fieldId: lowerKey, value });
          }
        }
      }

      if (dynamicFieldContainer && dynamicFields.length > 0) {
        const formattedDynamics = [];
        for (const df of dynamicFields) {
          const fieldRegistryDoc = await FieldRegistry.findOne({ key: df.fieldId });
          
          if (fieldRegistryDoc) {
            let processedValue = df.value;
            
            // If the field type is a lookup, resolve its values to primitive keys/IDs
            if (fieldRegistryDoc.type === 'lookup' && df.value) {
              const resolveSingle = (val) => {
                if (val && typeof val === 'object') {
                  const valueKeyObj = fieldRegistryDoc.lookup?.valueField;
                  const keyToExtract = (typeof valueKeyObj === 'object' ? valueKeyObj?.field : valueKeyObj) || '_id';
                  return val[keyToExtract] !== undefined ? val[keyToExtract] : (val._id || val);
                }
                return val;
              };
              
              if (Array.isArray(df.value)) {
                processedValue = df.value.map(resolveSingle);
              } else {
                processedValue = resolveSingle(df.value);
              }
            }
            
            formattedDynamics.push({ fieldId: fieldRegistryDoc._id, value: processedValue });
          }
        }
        modelData[dynamicFieldContainer] = formattedDynamics;
      }

      mapped[modelName] = modelData;
    }

    return mapped;
  }
}

module.exports = new StorageMapper();
