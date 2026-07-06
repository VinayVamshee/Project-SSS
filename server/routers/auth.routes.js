const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/verifyToken', authController.verifyToken);
router.post('/dev/users', authController.devCreateUser);
router.get('/dev/users', authController.devGetUsers);
router.put('/dev/users/:id', authController.devUpdateUser);

module.exports = router;
