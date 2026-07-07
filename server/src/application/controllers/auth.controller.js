const AuthService = require('../services/AuthService');

exports.register = async (req, res) => {
  try {
    if (!req.schoolId) return res.status(400).json({ message: 'Registering users requires a tenant context' });
    const user = await AuthService.register(req.schoolId, req.body);
    res.status(201).json({ message: 'User registered successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { token, user } = await AuthService.login(req.schoolId, req.body);
    res.json({ token, school: req.school, user });
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

exports.verifyToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = await AuthService.verifyToken(token, req.schoolId);
    res.json({ valid: true, user: decoded });
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

exports.devGetUsers = async (req, res) => {
  try {
    const schoolId = req.query.schoolId || req.schoolId;
    const users = await AuthService.devGetUsers(schoolId);
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users', error: error.message });
  }
};

exports.devCreateUser = async (req, res) => {
  try {
    const schoolId = req.body.schoolId || req.schoolId;
    const user = await AuthService.devCreateUser(schoolId, req.body);
    res.status(201).json({ message: 'User created successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create user', error: error.message });
  }
};
