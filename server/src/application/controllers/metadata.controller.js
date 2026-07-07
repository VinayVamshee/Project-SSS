const MetadataService = require('../services/MetadataService');
const { sendSuccess } = require('../../core/errors/apiResponse');

// ─── Entity Registry ────────────────────────────────────────────────────────
exports.createEntity = async (req, res, next) => {
  try {
    const entity = await MetadataService.createEntity(req.body);
    sendSuccess(res, entity, 201);
  } catch (error) {
    next(error);
  }
};

exports.updateEntity = async (req, res, next) => {
  try {
    const entity = await MetadataService.updateEntity(req.params.id, req.body);
    sendSuccess(res, entity);
  } catch (error) {
    next(error);
  }
};

exports.deleteEntity = async (req, res, next) => {
  try {
    await MetadataService.deleteEntity(req.params.id);
    sendSuccess(res, { message: 'Entity deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

exports.archiveEntity = async (req, res, next) => {
  try {
    const entity = await MetadataService.archiveEntity(req.params.id);
    sendSuccess(res, entity);
  } catch (error) {
    next(error);
  }
};

exports.activateEntity = async (req, res, next) => {
  try {
    const entity = await MetadataService.activateEntity(req.params.id);
    sendSuccess(res, entity);
  } catch (error) {
    next(error);
  }
};

exports.getEntity = async (req, res, next) => {
  try {
    const entity = await MetadataService.getEntity(req.params.id);
    sendSuccess(res, entity);
  } catch (error) {
    next(error);
  }
};

exports.getAllEntities = async (req, res, next) => {
  try {
    const entities = await MetadataService.getAllEntities();
    sendSuccess(res, entities);
  } catch (error) {
    next(error);
  }
};

// ─── Field Registry ─────────────────────────────────────────────────────────
exports.createField = async (req, res, next) => {
  try {
    const field = await MetadataService.createField(req.body);
    sendSuccess(res, field, 201);
  } catch (error) {
    next(error);
  }
};

exports.updateField = async (req, res, next) => {
  try {
    const field = await MetadataService.updateField(req.params.id, req.body);
    sendSuccess(res, field);
  } catch (error) {
    next(error);
  }
};

exports.archiveField = async (req, res, next) => {
  try {
    const field = await MetadataService.archiveField(req.params.id);
    sendSuccess(res, field);
  } catch (error) {
    next(error);
  }
};

exports.activateField = async (req, res, next) => {
  try {
    const field = await MetadataService.activateField(req.params.id);
    sendSuccess(res, field);
  } catch (error) {
    next(error);
  }
};

exports.deleteDraftField = async (req, res, next) => {
  try {
    await MetadataService.deleteDraftField(req.params.id);
    sendSuccess(res, { message: 'Draft field deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

exports.getField = async (req, res, next) => {
  try {
    const field = await MetadataService.getField(req.params.id);
    sendSuccess(res, field);
  } catch (error) {
    next(error);
  }
};

exports.listFields = async (req, res, next) => {
  try {
    const fields = await MetadataService.listFields();
    sendSuccess(res, fields);
  } catch (error) {
    next(error);
  }
};

// ─── Template Module ────────────────────────────────────────────────────────
exports.createTemplate = async (req, res, next) => {
  try {
    const template = await MetadataService.createTemplate(req.body);
    sendSuccess(res, template, 201);
  } catch (error) {
    next(error);
  }
};

exports.updateTemplate = async (req, res, next) => {
  try {
    const template = await MetadataService.updateTemplate(req.params.id, req.body);
    sendSuccess(res, template);
  } catch (error) {
    next(error);
  }
};

exports.publishTemplate = async (req, res, next) => {
  try {
    const template = await MetadataService.publishTemplate(req.params.id);
    sendSuccess(res, template);
  } catch (error) {
    next(error);
  }
};

exports.archiveTemplate = async (req, res, next) => {
  try {
    const template = await MetadataService.archiveTemplate(req.params.id);
    sendSuccess(res, template);
  } catch (error) {
    next(error);
  }
};

exports.restoreTemplate = async (req, res, next) => {
  try {
    const template = await MetadataService.restoreTemplate(req.params.id);
    sendSuccess(res, template);
  } catch (error) {
    next(error);
  }
};

exports.deleteDraftTemplate = async (req, res, next) => {
  try {
    await MetadataService.deleteDraftTemplate(req.params.id);
    sendSuccess(res, { message: 'Draft template deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

exports.getTemplate = async (req, res, next) => {
  try {
    const template = await MetadataService.getTemplate(req.params.id);
    sendSuccess(res, template);
  } catch (error) {
    next(error);
  }
};

exports.listTemplates = async (req, res, next) => {
  try {
    const templates = await MetadataService.listTemplates();
    sendSuccess(res, templates);
  } catch (error) {
    next(error);
  }
};

// ─── Form blueprint API ─────────────────────────────────────────────────────
exports.getTemplateForm = async (req, res, next) => {
  try {
    const formBlueprint = await MetadataService.getTemplateForm(req.params.id);
    sendSuccess(res, formBlueprint);
  } catch (error) {
    next(error);
  }
};

exports.lookup = async (req, res, next) => {
  try {
    const data = await MetadataService.lookup(
      req.query.field,
      req.query.search,
      req.schoolId
    );

    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};
