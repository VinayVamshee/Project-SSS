const express = require('express');
const router = express.Router();
const schoolController = require('../controllers/school.controller');

router.get('/tenant-config', schoolController.getTenantConfig);
router.post('/masters', schoolController.createSchool);
router.get('/masters', schoolController.getSchool);
router.get('/get-all-masters', schoolController.getAllSchools);
router.put('/masters/:id', schoolController.updateSchool);
router.put('/masters/set-in-use/:id', schoolController.setInUse);
router.delete('/masters/:id', schoolController.deleteSchool);

module.exports = router;
