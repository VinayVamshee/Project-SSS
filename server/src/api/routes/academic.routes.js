const express = require('express');
const router = express.Router();
const academicController = require('../../application/controllers/academic.controller');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.get('/years', academicController.getAcademicYears);
router.get('/classes', academicController.getClasses);
router.get('/subjects', academicController.getSubjects);
router.get('/curriculums', academicController.getCurriculums);

module.exports = router;
