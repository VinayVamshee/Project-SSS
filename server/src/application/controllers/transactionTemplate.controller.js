const TransactionTemplate = require('../../domain/models/TransactionTemplate');
const AppError = require('../../core/errors/AppError');
const { sendSuccess } = require('../../core/errors/apiResponse');

const getAll = async (req, res, next) => {
  try {
    const filter = {};

    if (req.query.status) filter.status = req.query.status;
    if (req.query.transactionType) filter.transactionType = req.query.transactionType;
    if (req.query.category) filter.category = req.query.category;

    const isDev = req.user?.isDev;
    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'developer';
    if (!isDev && !isAdmin) {
      filter.status = 'active';
    }

    const templates = await TransactionTemplate.find(filter)
      .sort({ category: 1, label: 1 })
      .lean();

    return sendSuccess(res, templates);
  } catch (err) {
    next(err);
  }
};

const getOne = async (req, res, next) => {
  try {
    const { id } = req.params;
    const byKey = req.query.by === 'key';

    const query = byKey ? { key: id } : { _id: id };
    const template = await TransactionTemplate.findOne(query).lean();

    if (!template) {
      return next(new AppError('Transaction template not found', 404));
    }

    return sendSuccess(res, template);
  } catch (err) {
    next(err);
  }
};

const processFields = (fields) => {
  return (fields || []).map((f, idx) => ({
    id: f.id || `fld_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
    key: f.key,
    label: f.label,
    type: f.type,
    required: f.required ?? false,
    placeholder: f.placeholder || '',
    helperText: f.helperText || '',
    defaultValue: f.defaultValue ?? null,
    readonly: f.readonly ?? false,
    hidden: f.hidden ?? false,
    grid: f.grid || 12,
    options: f.options || [],
    currency: f.currency || 'INR',
    precision: f.precision || 2,
    min: f.min ?? null,
    max: f.max ?? null,
    minDate: f.minDate ?? null,
    maxDate: f.maxDate ?? null,
    validationPattern: f.validationPattern || '',
    validationMessage: f.validationMessage || '',
    maxLength: f.maxLength ?? null,
    lookup: f.lookup ? {
      provider: f.lookup.provider,
      displayField: f.lookup.displayField || 'name',
      valueField: f.lookup.valueField || '_id',
      allowSearch: f.lookup.allowSearch ?? true,
      allowClear: f.lookup.allowClear ?? true,
      multiple: f.lookup.multiple ?? false,
      dependsOn: f.lookup.dependsOn || null,
      refreshOnChange: f.lookup.refreshOnChange ?? false
    } : null
  }));
};

const create = async (req, res, next) => {
  try {
    const {
      key, label, transactionType, category,
      description, icon, color, fields
    } = req.body;

    const processedFields = processFields(fields);

    const template = await TransactionTemplate.create({
      key,
      label,
      transactionType,
      category,
      description,
      icon,
      color,
      fields: processedFields,
      status: 'draft',
      version: 1,
      createdBy: req.user?.username || req.user?.email || 'system'
    });

    return sendSuccess(res, template, 201);
  } catch (err) {
    if (err.code === 11000) {
      return next(new AppError(`A template with key '${req.body.key}' already exists`, 409));
    }
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;

    const immutableRootFields = ['key', 'transactionType'];
    for (const f of immutableRootFields) {
      if (req.body[f] !== undefined) {
        return next(new AppError(
          `Field '${f}' is immutable after creation. To change it, create a new template.`, 400
        ));
      }
    }

    const template = await TransactionTemplate.findById(id);
    if (!template) {
      return next(new AppError('Transaction template not found', 404));
    }

    const editableRootFields = ['label', 'description', 'icon', 'color', 'category'];
    for (const f of editableRootFields) {
      if (req.body[f] !== undefined) template[f] = req.body[f];
    }

    if (req.body.fields !== undefined) {
      const existingFieldMap = {};
      template.fields.forEach(f => { existingFieldMap[f.id] = f; });

      const updatedFields = req.body.fields.map((incoming, idx) => {
        const existing = existingFieldMap[incoming.id];

        if (existing) {
          const immutableFieldProps = ['id', 'key', 'type'];
          for (const prop of immutableFieldProps) {
            if (incoming[prop] !== undefined && String(incoming[prop]) !== String(existing[prop])) {
              throw new AppError(
                `Field property '${prop}' on field id '${incoming.id}' is immutable.`, 400
              );
            }
          }

          return {
            id:          existing.id,
            key:         existing.key,
            type:        existing.type,
            label:       incoming.label       ?? existing.label,
            placeholder: incoming.placeholder ?? existing.placeholder,
            helperText:  incoming.helperText    ?? existing.helperText,
            required:    incoming.required    ?? existing.required,
            defaultValue: incoming.defaultValue ?? existing.defaultValue,
            readonly:    incoming.readonly    ?? existing.readonly,
            hidden:      incoming.hidden      ?? existing.hidden,
            grid:        incoming.grid        ?? existing.grid,
            options:     incoming.options     ?? existing.options,
            currency:    incoming.currency    ?? existing.currency,
            precision:   incoming.precision   ?? existing.precision,
            min:         incoming.min         ?? existing.min,
            max:         incoming.max         ?? existing.max,
            minDate:     incoming.minDate     ?? existing.minDate,
            maxDate:     incoming.maxDate     ?? existing.maxDate,
            validationPattern: incoming.validationPattern ?? existing.validationPattern,
            validationMessage: incoming.validationMessage ?? existing.validationMessage,
            maxLength:   incoming.maxLength   ?? existing.maxLength,
            lookup:      incoming.lookup ? {
              provider:        incoming.lookup.provider        ?? existing.lookup?.provider,
              displayField:    incoming.lookup.displayField    ?? existing.lookup?.displayField ?? 'name',
              valueField:      incoming.lookup.valueField      ?? existing.lookup?.valueField ?? '_id',
              allowSearch:     incoming.lookup.allowSearch     ?? existing.lookup?.allowSearch ?? true,
              allowClear:      incoming.lookup.allowClear      ?? existing.lookup?.allowClear ?? true,
              multiple:        incoming.lookup.multiple        ?? existing.lookup?.multiple ?? false,
              dependsOn:       incoming.lookup.dependsOn       ?? existing.lookup?.dependsOn ?? null,
              refreshOnChange: incoming.lookup.refreshOnChange ?? existing.lookup?.refreshOnChange ?? false
            } : existing.lookup
          };
        }

        return {
          id:          incoming.id || `fld_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
          key:         incoming.key,
          label:       incoming.label,
          type:        incoming.type,
          required:    incoming.required ?? false,
          placeholder: incoming.placeholder || '',
          helperText:  incoming.helperText || '',
          defaultValue: incoming.defaultValue ?? null,
          readonly:    incoming.readonly ?? false,
          hidden:      incoming.hidden ?? false,
          grid:        incoming.grid || 12,
          options:     incoming.options || [],
          currency:    incoming.currency || 'INR',
          precision:   incoming.precision || 2,
          min:         incoming.min ?? null,
          max:         incoming.max ?? null,
          minDate:     incoming.minDate ?? null,
          maxDate:     incoming.maxDate ?? null,
          validationPattern: incoming.validationPattern || '',
          validationMessage: incoming.validationMessage || '',
          maxLength:   incoming.maxLength ?? null,
          lookup:      incoming.lookup ? {
            provider: incoming.lookup.provider,
            displayField: incoming.lookup.displayField || 'name',
            valueField: incoming.lookup.valueField || '_id',
            allowSearch: incoming.lookup.allowSearch ?? true,
            allowClear: incoming.lookup.allowClear ?? true,
            multiple: incoming.lookup.multiple ?? false,
            dependsOn: incoming.lookup.dependsOn || null,
            refreshOnChange: incoming.lookup.refreshOnChange ?? false
          } : null
        };
      });

      template.fields = updatedFields;
    }

    template.updatedBy = req.user?.username || req.user?.email || 'system';
    template.version += 1;

    await template.save();
    return sendSuccess(res, template);
  } catch (err) {
    if (err instanceof AppError) return next(err);
    next(err);
  }
};

const publish = async (req, res, next) => {
  try {
    const template = await TransactionTemplate.findById(req.params.id);
    if (!template) return next(new AppError('Template not found', 404));

    if (template.status === 'archived') {
      return next(new AppError('Cannot publish an archived template. Restore it first.', 400));
    }

    if (template.fields.length === 0) {
      return next(new AppError('Cannot publish a template with no fields defined.', 400));
    }

    template.status = 'active';
    template.updatedBy = req.user?.username || req.user?.email || 'system';
    await template.save();

    return sendSuccess(res, template);
  } catch (err) {
    next(err);
  }
};

const archive = async (req, res, next) => {
  try {
    const template = await TransactionTemplate.findById(req.params.id);
    if (!template) return next(new AppError('Template not found', 404));

    template.status = 'archived';
    template.updatedBy = req.user?.username || req.user?.email || 'system';
    await template.save();

    return sendSuccess(res, template);
  } catch (err) {
    next(err);
  }
};

const restore = async (req, res, next) => {
  try {
    const template = await TransactionTemplate.findById(req.params.id);
    if (!template) return next(new AppError('Template not found', 404));

    if (template.status !== 'archived') {
      return next(new AppError('Only archived templates can be restored.', 400));
    }

    template.status = 'draft';
    template.updatedBy = req.user?.username || req.user?.email || 'system';
    await template.save();

    return sendSuccess(res, template);
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const template = await TransactionTemplate.findById(req.params.id);
    if (!template) return next(new AppError('Template not found', 404));

    if (template.status !== 'draft') {
      return next(new AppError(
        `Cannot delete a '${template.status}' template. Archive it instead to preserve data integrity.`, 400
      ));
    }

    await template.deleteOne();
    return sendSuccess(res, { message: 'Template deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAll,
  getOne,
  create,
  update,
  publish,
  archive,
  restore,
  remove
};
