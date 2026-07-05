const express = require('express');
const router = express.Router();
const studentController = require('../controllers/student.controller');

// Student CRUD
router.post('/addStudent', studentController.addStudent);
router.get('/getStudent', studentController.getStudents);
router.put('/updateStudent/:id', studentController.updateStudent);

// Promotions & enrollment management
router.put('/updateAcademicYearStatus/:id', studentController.updateAcademicYearStatus);
router.post('/pass-students-to', studentController.passStudentsTo);
router.post('/drop-academic-year', studentController.dropAcademicYear);

// EAV Field Definitions (PersonalInformationList registry)
router.get('/GetFieldDefinitions', studentController.getFieldDefinitions);
router.post('/AddFieldDefinition', studentController.addFieldDefinition);
router.put('/UpdateFieldDefinition/:id', studentController.updateFieldDefinition);
router.delete('/DeleteFieldDefinition/:id', studentController.deleteFieldDefinition);

// Legacy route aliases for backward compatibility
router.post('/AddAdditionalPersonalInformation', studentController.addFieldDefinition);
router.get('/GetPersonalInformationList', studentController.getFieldDefinitions);
router.delete('/DeletePersonalInfo/:id', studentController.deleteFieldDefinition);

module.exports = router;
