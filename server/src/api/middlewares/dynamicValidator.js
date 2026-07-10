const Template = require('../../domain/metadata/models/Template');
const FieldRegistry = require('../../domain/metadata/models/FieldRegistry');

const dynamicValidator = (entityType) => {
  return async (req, res, next) => {
    try {
      if (req.body.AdmissionNo === "Re-Admission" || req.body.previousStudentId) {
        return next();
      }
      const mongoose = require('mongoose');
      const EntityRegistry = mongoose.models.EntityRegistry || require('../../domain/metadata/models/EntityRegistry');
      
      const entityDoc = await EntityRegistry.findOne({
        $or: [
          { key: entityType },
          { key: entityType.toLowerCase() },
          { key: entityType.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '') }
        ]
      });

      if (!entityDoc) {
        return next();
      }

      const template = await Template.findOne({ entity: entityDoc._id, status: 'active' }).populate('fields.fieldId');
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
        const isRequired = tField.required;

        if (isRequired && (val === undefined || val === null || val === '')) {
          return res.status(400).json({ message: `Field '${fieldDef.label}' is required.` });
        }

        if (val !== undefined && val !== null && val !== '') {
          const validation = tField.validation || {};
          if (validation.pattern) {
            const regex = new RegExp(validation.pattern);
            if (!regex.test(val.toString())) {
              return res.status(400).json({ message: validation.message || `Field '${fieldDef.label}' is invalid.` });
            }
          }
          if (validation.minLength !== undefined && validation.minLength !== null && val.toString().length < validation.minLength) {
            return res.status(400).json({ message: validation.message || `Field '${fieldDef.label}' must be at least ${validation.minLength} characters.` });
          }
          if (validation.maxLength !== undefined && validation.maxLength !== null && val.toString().length > validation.maxLength) {
            return res.status(400).json({ message: validation.message || `Field '${fieldDef.label}' must be at most ${validation.maxLength} characters.` });
          }
          if (validation.min !== undefined && validation.min !== null && Number(val) < validation.min) {
            return res.status(400).json({ message: validation.message || `Field '${fieldDef.label}' must be at least ${validation.min}.` });
          }
          if (validation.max !== undefined && validation.max !== null && Number(val) > validation.max) {
            return res.status(400).json({ message: validation.message || `Field '${fieldDef.label}' must be at most ${validation.max}.` });
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
