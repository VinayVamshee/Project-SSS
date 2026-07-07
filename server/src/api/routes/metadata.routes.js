const express = require('express');
const router = express.Router();
const metadataController = require('../../application/controllers/metadata.controller');
const { protect, restrictTo } = require('../middlewares/authMiddleware');
const {
  validateEntityInput,
  validateFieldInput,
  validateTemplateInput
} = require('../../application/validators/metadata.validator');

router.use(protect);

// ─── Entity Registry Routes ──────────────────────────────────────────────────
router.get('/entities', metadataController.getAllEntities);
router.get('/entities/:id', metadataController.getEntity);
router.post('/entities', restrictTo('admin', 'developer'), validateEntityInput, metadataController.createEntity);
router.put('/entities/:id', restrictTo('admin', 'developer'), validateEntityInput, metadataController.updateEntity);
router.patch('/entities/:id/archive', restrictTo('admin', 'developer'), metadataController.archiveEntity);
router.patch('/entities/:id/activate', restrictTo('admin', 'developer'), metadataController.activateEntity);
router.delete('/entities/:id', restrictTo('admin', 'developer'), metadataController.deleteEntity);

// ─── Field Registry Routes ───────────────────────────────────────────────────
router.get('/fields', metadataController.listFields);
router.get('/fields/:id', metadataController.getField);
router.post('/fields', restrictTo('admin', 'developer'), validateFieldInput, metadataController.createField);
router.put('/fields/:id', restrictTo('admin', 'developer'), validateFieldInput, metadataController.updateField);
router.patch('/fields/:id/archive', restrictTo('admin', 'developer'), metadataController.archiveField);
router.patch('/fields/:id/activate', restrictTo('admin', 'developer'), metadataController.activateField);
router.delete('/fields/:id', restrictTo('admin', 'developer'), metadataController.deleteDraftField);

// ─── Template Routes ──────────────────────────────────────────────────────────
router.get('/templates', metadataController.listTemplates);
router.get('/templates/:id/form', metadataController.getTemplateForm);
router.get('/templates/:id', metadataController.getTemplate);
router.post('/templates', restrictTo('admin', 'developer'), validateTemplateInput, metadataController.createTemplate);
router.put('/templates/:id', restrictTo('admin', 'developer'), validateTemplateInput, metadataController.updateTemplate);
router.patch('/templates/:id/publish', restrictTo('admin', 'developer'), metadataController.publishTemplate);
router.patch('/templates/:id/archive', restrictTo('admin', 'developer'), metadataController.archiveTemplate);
router.patch('/templates/:id/restore', restrictTo('admin', 'developer'), metadataController.restoreTemplate);
router.delete('/templates/:id', restrictTo('admin', 'developer'), metadataController.deleteDraftTemplate);

// ─── Generic Lookup ───────────────────────────────────────────────────────────
router.get('/lookup', metadataController.lookup);

module.exports = router;
