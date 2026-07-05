const jwt = require('jsonwebtoken');
const User = require('../Models/User');

const SECRET = process.env.SECRET;

exports.register = async (req, res) => {
    try {
        const { username, password, type = 'viewer' } = req.body;

        if (!req.schoolId) {
            return res.status(400).json({ message: 'Registering users requires a tenant context (subdomain/domain)' });
        }

        const exists = await User.findOne({ username, schoolId: req.schoolId });
        if (exists) return res.status(400).json({ message: 'User already exists' });

        const user = new User({ username, password, type, schoolId: req.schoolId });
        await user.save();

        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Registration failed', error: err.message });
    }
};

exports.login = async (req, res) => {
    const { username, password } = req.body;

    try {
        // 1. Try to find a global developer user (not tenant-scoped)
        let user = await User.findOne({ username, isDev: true }).setOptions({ bypassTenant: true });

        // 2. If not a developer, resolve matching tenant-scoped user
        if (!user) {
            if (!req.schoolId) {
                return res.status(400).json({ message: 'Login requires a tenant context (subdomain/domain)' });
            }
            user = await User.findOne({ username, schoolId: req.schoolId });
        }
        if (!user || user.password !== password) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user._id, username: user.username, role: user.role, isDev: user.isDev, schoolId: user.schoolId },
            SECRET,
            { expiresIn: '7d' }
        );

        res.json({ token, school: req.school });
    } catch (err) {
        res.status(500).json({ message: 'Login failed', error: err.message });
    }
};

exports.verifyToken = (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    try {
        const decoded = jwt.verify(token, SECRET);
        if (req.schoolId && decoded.schoolId !== req.schoolId) {
            return res.status(403).json({ message: "Forbidden: Tenant context mismatch" });
        }
        res.json({ valid: true, user: decoded });
    } catch (err) {
        res.status(401).json({ message: "Invalid or expired token" });
    }
};
