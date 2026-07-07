const express = require('express');
const router = express.Router();
const authController = require('../../application/controllers/auth.controller');
const { validateLoginInput } = require('../../application/validators/auth.validator');

router.post('/register', authController.register);
router.post('/login', validateLoginInput, authController.login);
router.get('/verifyToken', authController.verifyToken);

// Dev routes
router.get('/dev/users', authController.devGetUsers);
router.post('/dev/users', authController.devCreateUser);

module.exports = router;
