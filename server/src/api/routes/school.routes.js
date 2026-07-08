const express = require('express');
const router = express.Router();
const schoolController = require('../../application/controllers/school.controller');
const { protect } = require('../middlewares/authMiddleware');


router.get('/get-all-masters', schoolController.getAllSchools);

router.post('/masters', protect, schoolController.createSchool);
router.get('/masters', protect, schoolController.getSchool);
router.put('/masters/:id', protect, schoolController.updateSchool);
router.put('/masters/set-in-use/:id', protect, schoolController.setInUse);
router.delete('/masters/:id', protect, schoolController.deleteSchool);
router.get('/tenant-config', schoolController.getTenantConfig);

module.exports = router;
