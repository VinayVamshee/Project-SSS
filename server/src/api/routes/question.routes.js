const express = require('express');
const router = express.Router();
const questionController = require('../../application/controllers/question.controller');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

// Questions
router.get('/questions', questionController.getQuestions);
router.post('/questions', questionController.addQuestion);
router.delete('/questions', questionController.deleteQuestion);
router.put('/questions', questionController.updateQuestion);
router.get('/questions/duplicates', questionController.getDuplicates);
router.post('/questions/clone', questionController.cloneQuestion);
router.post('/questions/transfer', questionController.transferQuestion);

// Templates
router.get('/get-all-templates', questionController.getAllTemplates);
router.post('/save-template', questionController.saveTemplate);
router.delete('/delete-template/:id', questionController.deleteTemplate);

module.exports = router;
