const express = require('express');
const router = express.Router();
const classController = require('../controllers/class.controller');
const examController = require('../controllers/exam.controller');

// Classes
router.post('/AddNewClass', classController.addNewClass);
router.get('/getClasses', classController.getClasses);
router.delete('/deleteClass/:id', classController.deleteClass);

// Subjects
router.put('/updateSubject/:id', classController.updateSubject);
router.post('/AddNewSubject', classController.addNewSubject);
router.get('/getSubjects', classController.getSubjects);
router.delete('/deleteSubject/:id', classController.deleteSubject);

// Link
router.post('/ClassSubjectLink', classController.classSubjectLink);

// Academic Years
router.post('/AddAcademicYear', classController.addAcademicYear);
router.get('/GetAcademicYear', classController.getAcademicYears);
router.delete('/DeleteAcademicYear/:id', classController.deleteAcademicYear);

// Chapters
router.post('/chapters', examController.addChapter);
router.get('/chapters', examController.getChapters);
router.get('/chapters/:classId/:subjectId', examController.getChaptersByClassAndSubject);
router.put('/chapters/:classId/:subjectId/:chapterId', examController.updateChapter);
router.delete('/chapters/:classId/:subjectId/:chapterId', examController.deleteChapter);

// Exams
router.post('/addExams', examController.addExams);
router.get('/getExams', examController.getExams);

// Marks
router.post('/submit-marks', examController.submitMarks);
router.get('/get-marks', examController.getMarks);

module.exports = router;
