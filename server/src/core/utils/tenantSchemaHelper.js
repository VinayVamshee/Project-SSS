const mongoose = require('mongoose');

/**
 * Injects a indexed schoolId tenant reference field into a mongoose schema.
 */
const addTenantField = (schema) => {
  schema.add({
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true
    }
  });
};

module.exports = addTenantField;
