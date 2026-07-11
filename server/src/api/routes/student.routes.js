const express = require('express');
const router = express.Router();
const studentController = require('../../application/controllers/student.controller');
const { protect } = require('../middlewares/authMiddleware');
const dynamicValidator = require('../middlewares/dynamicValidator');
const { validateAddStudent } = require('../../application/validators/student.validator');

router.use(protect);

router.post('/addStudent', validateAddStudent, dynamicValidator('StudentEnrollment'), studentController.addStudent);
router.get('/getStudent', studentController.getStudents);
router.put('/updateStudent/:id', dynamicValidator('StudentEnrollment'), studentController.updateStudent);

router.put('/updateAcademicYearStatus/:id', studentController.updateAcademicYearStatus);
router.post('/pass-students-to', studentController.passStudentsTo);
router.post('/drop-academic-year', studentController.dropAcademicYear);
router.post('/dev/bulk-import-students', studentController.bulkImportStudents);


module.exports = router;
