const EntityRepository = require('../../domain/metadata/repositories/EntityRepository');
const FieldRepository = require('../../domain/metadata/repositories/FieldRepository');
const TemplateRepository = require('../../domain/metadata/repositories/TemplateRepository');
const AppError = require('../../core/errors/AppError');
const mongoose = require('mongoose');

class MetadataService {
  // ─── Entity Registry ────────────────────────────────────────────────────────
  async createEntity(data) {
    const { key } = data;

    const exists = await EntityRepository.findOne({ key });

    if (exists) {
      throw new AppError(
        `Entity key '${key}' already exists.`,
        409
      );
    }

    return EntityRepository.create({
      ...data,
      status: data.status || "active",
      version: 1
    });
  }

  async updateEntity(id, data) {
    const { key } = data;
    if (key) {
      const exists = await EntityRepository.findOne({ key, _id: { $ne: id } });
      if (exists) throw new AppError(`Entity key '${key}' already exists.`, 409);
    }
    const updated = await EntityRepository.updateById(id, data);
    if (!updated) throw new AppError('Entity registry entry not found', 404);
    return updated;
  }

  async deleteEntity(id) {
    const entity = await EntityRepository.findOne({ _id: id });
    if (!entity) throw new AppError('Entity not found', 404);

    const systemEntities = ['Student', 'StudentEnrollment', 'FeeStructure', 'Payment', 'Employee', 'Hostel', 'Library'];
    if (systemEntities.includes(entity.key)) {
      throw new AppError('Cannot delete system reserved entities.', 400);
    }
    return EntityRepository.deleteById(id);
  }

  async archiveEntity(id) {
    const updated = await EntityRepository.updateById(id, { status: 'inactive' });
    if (!updated) throw new AppError('Entity registry entry not found', 404);
    return updated;
  }

  async activateEntity(id) {
    const updated = await EntityRepository.updateById(id, { status: 'active' });
    if (!updated) throw new AppError('Entity registry entry not found', 404);
    return updated;
  }

  async getEntity(id) {
    const query = mongoose.isValidObjectId(id) ? { _id: id } : { name: id };
    const entity = await EntityRepository.findOne(query);
    if (!entity) throw new AppError('Entity not found', 404);
    return entity;
  }

  async getAllEntities() {
    return EntityRepository.find({});
  }

  // ─── Field Registry ─────────────────────────────────────────────────────────
  async createField(data) {
    const { key } = data;

    const exists = await FieldRepository.findOne({ key });
    if (exists) throw new AppError(`Field with key '${key}' already exists.`, 409);

    return FieldRepository.create({
      ...data,
      status: 'draft',
      version: 1
    });
  }

  async updateField(id, data) {
    const field = await FieldRepository.findById(id);
    if (!field) throw new AppError('Field not found', 404);

    if (field.status === 'active') {
      const immutableFields = ['key', 'type'];
      for (const key of immutableFields) {
        if (data[key] !== undefined && data[key] !== field[key]) {
          throw new AppError(`Field property '${key}' is immutable once active.`, 400);
        }
      }
    }

    const updated = await FieldRepository.updateById(id, data);
    return updated;
  }

  async archiveField(id) {
    const updated = await FieldRepository.updateById(id, { status: 'archived' });
    if (!updated) throw new AppError('Field not found', 404);
    return updated;
  }

  async activateField(id) {
    const updated = await FieldRepository.updateById(id, { status: 'active' });
    if (!updated) throw new AppError('Field not found', 404);
    return updated;
  }

  async deleteDraftField(id) {
    const field = await FieldRepository.findById(id);
    if (!field) throw new AppError('Field not found', 404);
    if (field.status !== 'draft') {
      throw new AppError('Only fields in draft status can be deleted.', 400);
    }
    return FieldRepository.deleteById(id);
  }

  async getField(id) {
    const query = mongoose.isValidObjectId(id) ? { _id: id } : { key: id };
    const field = await FieldRepository.findOne(query);
    if (!field) throw new AppError('Field not found', 404);
    return field;
  }

  async listFields() {
    return FieldRepository.find({});
  }

  // ─── Template Module ────────────────────────────────────────────────────────
  validateTemplateFields(fields) {
    if (!fields || !Array.isArray(fields)) return;

    const seenIds = new Set();
    const seenOrders = new Set();

    for (const f of fields) {
      if (!f.fieldId) {
        throw new AppError('Invalid field reference: fieldId is required.', 400);
      }

      const fieldIdStr = f.fieldId.toString();
      if (seenIds.has(fieldIdStr)) {
        throw new AppError(`Duplicate field reference found for ID: ${fieldIdStr}`, 400);
      }
      seenIds.add(fieldIdStr);

      if (f.order === undefined || f.order === null) {
        f.order = fields.indexOf(f) + 1;
      }

      // Validate regex pattern if provided
      if (f.validation && f.validation.pattern) {
        try {
          new RegExp(f.validation.pattern);
        } catch (err) {
          throw new AppError(`Invalid validation regex pattern in field ${fieldIdStr}: ${err.message}`, 400);
        }
      }
    }
  }

  async createTemplate(data) {
    const { key, entity, fields } = data;

    const exists = await TemplateRepository.findOne({ key });
    if (exists) throw new AppError(`Template with key '${key}' already exists.`, 409);

    this.validateTemplateFields(fields);

    return TemplateRepository.create({
      ...data,
      status: 'draft',
      version: 1
    });
  }

  async updateTemplate(id, data) {
    const template = await TemplateRepository.findById(id);
    if (!template) throw new AppError('Template not found', 404);

    if (data.fields) {
      this.validateTemplateFields(data.fields);
    }

    const updated = await TemplateRepository.updateById(id, data);
    return updated;
  }

  async publishTemplate(id) {
    const template = await TemplateRepository.findById(id);
    if (!template) throw new AppError('Template not found', 404);

    if (template.status === 'archived') {
      throw new AppError('Cannot publish an archived template. Restore it first.', 400);
    }
    if (template.fields.length === 0) {
      throw new AppError('Cannot publish a template with no fields defined.', 400);
    }

    template.status = 'active';
    await template.save();
    return template;
  }

  async archiveTemplate(id) {
    const updated = await TemplateRepository.updateById(id, { status: 'archived' });
    if (!updated) throw new AppError('Template not found', 404);
    return updated;
  }

  async restoreTemplate(id) {
    const template = await TemplateRepository.findById(id);
    if (!template) throw new AppError('Template not found', 404);
    if (template.status !== 'archived') {
      throw new AppError('Only archived templates can be restored.', 400);
    }

    template.status = 'draft';
    await template.save();
    return template;
  }

  async deleteDraftTemplate(id) {
    const template = await TemplateRepository.findById(id);
    if (!template) throw new AppError('Template not found', 404);
    if (template.status !== 'draft') {
      throw new AppError('Only draft templates can be deleted.', 400);
    }
    return TemplateRepository.deleteById(id);
  }

  async getTemplate(id) {
    const query = mongoose.isValidObjectId(id) ? { _id: id } : { key: id };
    const template = await TemplateRepository.findOne(query);
    if (!template) throw new AppError('Template not found', 404);
    return template;
  }

  async listTemplates() {
    return TemplateRepository.find({});
  }

  // ─── Form blueprint API ─────────────────────────────────────────────────────
  async getTemplateForm(id) {
    const query = mongoose.isValidObjectId(id) ? { _id: id } : { key: id };
    const template = await TemplateRepository.findOne(query);
    if (!template) throw new AppError('Template not found', 404);

    const formFields = template.fields
      .map(tField => {
        const fieldDef = tField.fieldId;
        if (!fieldDef || fieldDef.status === 'archived') return null;

        return {
          fieldId: fieldDef._id,
          key: fieldDef.key,
          label: fieldDef.label,
          type: fieldDef.type,
          options: fieldDef.options || [],
          lookup: fieldDef.lookup || null,
          required: tField.required || false,
          unique: tField.unique || false,
          readOnly: tField.readOnly || false,
          hidden: tField.hidden || false,
          width: tField.width || 12,
          placeholder: tField.placeholder || '',
          helperText: tField.helperText || '',
          defaultValue: tField.defaultValue !== undefined ? tField.defaultValue : null,
          validation: tField.validation || {}
        };
      })
      .filter(Boolean);

    return {
      template: {
        id: template._id,
        label: template.label
      },
      fields: formFields
    };
  }

  async lookup(fieldKey, search = "", schoolId) {
    const field = await FieldRepository.findOne({
      key: fieldKey,
      type: "lookup",
      status: "active"
    });

    if (!field) {
      throw new AppError("Lookup field not found.", 404);
    }

    const {
      entity,
      displayField,
      valueField
    } = field.lookup;

    if (!entity) {
      throw new AppError('Lookup entity not found.', 404);
    }

    let entityConfig;
    if (entity && typeof entity === 'object' && entity.model) {
      entityConfig = entity;
    } else {
      const entityQuery = mongoose.isValidObjectId(entity) ? { _id: entity } : { key: entity };
      entityConfig = await EntityRepository.findOne({
        ...entityQuery,
        allowLookup: true,
        status: "active"
      });
    }

    if (!entityConfig) {
      throw new AppError("Lookup entity not found.", 404);
    }

    const Model = mongoose.model(entityConfig.model);
    const filter = {};

    if (schoolId && Model.schema.path('schoolId')) {
      filter.schoolId = schoolId;
    }

    const displayKey = (typeof displayField === 'string') 
      ? displayField 
      : (displayField?.field || "name");

    if (search) {
      if (!displayField || typeof displayField === 'string' || displayField.source === 'core') {
        filter[displayKey] = {
          $regex: search,
          $options: "i"
        };
      } else if (displayField.source === 'dynamic') {
        filter["dynamicFields.value"] = {
          $regex: search,
          $options: "i"
        };
      } else if (displayField.source === 'nested' && displayField.path) {
        filter[displayField.path] = {
          $regex: search,
          $options: "i"
        };
      }
    }

    const records = await Model.find(filter).limit(50).lean();

    const getDisplayValue = (record) => {
      let fieldVal = "";
      if (typeof displayField === 'string') {
        fieldVal = record[displayField];
      } else if (displayField) {
        const { field: fieldKey, source, path } = displayField;
        if (source === "dynamic") {
          if (Array.isArray(record.dynamicFields)) {
            const df = record.dynamicFields.find(f => 
              (f.fieldId && (f.fieldId.toString() === fieldKey || (f.fieldId.key && f.fieldId.key === fieldKey)))
            );
            fieldVal = df ? df.value : "";
          }
        } else if (source === "nested" && path) {
          const parts = path.split('.');
          let current = record;
          for (const part of parts) {
            current = current ? current[part] : undefined;
          }
          fieldVal = current;
        } else {
          fieldVal = record[fieldKey || "name"];
        }
      }
      return fieldVal || record.name || "";
    };

    return records.map(record => ({
      value: record[valueField || "_id"],
      label: getDisplayValue(record),
    }));
  }
}

module.exports = new MetadataService();
