const Template = require('../../domain/metadata/models/Template');
const FieldRegistry = require('../../domain/metadata/models/FieldRegistry');

const dynamicValidator = (entityType) => {
  return async (req, res, next) => {
    try {
      const template = await Template.findOne({ entity: entityType, status: 'active' }).populate('fields.fieldId');
      if (!template) {
        return next();
      }

      const dynamicFields = req.body.dynamicFields || [];
      const fieldMap = new Map();
      dynamicFields.forEach(f => {
        if (f.fieldId) fieldMap.set(f.fieldId.toString(), f.value);
      });

      for (const tField of template.fields) {
        const fieldDef = tField.fieldId;
        if (!fieldDef) continue;

        const val = fieldMap.get(fieldDef._id.toString());
        const isRequired = tField.required || fieldDef.required;

        if (isRequired && (val === undefined || val === null || val === '')) {
          return res.status(400).json({ message: `Field '${fieldDef.label}' is required.` });
        }

        if (val !== undefined && val !== null && val !== '') {
          if (fieldDef.validationPattern) {
            const regex = new RegExp(fieldDef.validationPattern);
            if (!regex.test(val.toString())) {
              return res.status(400).json({ message: fieldDef.validationMessage || `Field '${fieldDef.label}' is invalid.` });
            }
          }
        }
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = dynamicValidator;
