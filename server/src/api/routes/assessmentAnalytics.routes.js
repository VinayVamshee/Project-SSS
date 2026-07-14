const express = require('express');
const router = express.Router();
const controller = require('../../application/controllers/assessmentAnalytics.controller');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.get('/dashboard', controller.getDashboard);
router.get('/student/:studentId', controller.getStudentAnalytics);
router.get('/subject', controller.getSubjectAnalytics);
router.get('/class', controller.getClassAnalytics);
router.get('/assessment', controller.getAssessmentAnalytics);

module.exports = router;
