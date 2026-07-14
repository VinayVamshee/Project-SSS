const express = require('express');
const router = express.Router();
const assessmentController = require('../../application/controllers/assessment.controller');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

// Configuration
router.post('/config', assessmentController.saveConfiguration);
router.get('/config', assessmentController.getConfigurations);

// Marks Entry
router.post('/marks/bulk-save', assessmentController.bulkSaveMarks);
router.get('/marks/register', assessmentController.getMarksRegister);

// Clone academic sessions
router.post('/config/copy-previous', assessmentController.copyPreviousYear);

// Analytics
router.get('/analytics/subject', assessmentController.getSubjectReport);

module.exports = router;
