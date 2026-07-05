const express = require('express');
const router = express.Router();
const questionController = require('../controllers/question.controller');

// Questions
router.get('/questions', questionController.getQuestions);
router.post('/questions', questionController.addQuestion);
router.delete('/questions', questionController.deleteQuestion);
router.put('/questions', questionController.updateQuestion);
router.get('/questions/duplicates', questionController.getDuplicates);

// Templates
router.get('/get-all-templates', questionController.getAllTemplates);
router.post('/save-template', questionController.saveTemplate);
router.delete('/delete-template/:id', questionController.deleteTemplate);

module.exports = router;
