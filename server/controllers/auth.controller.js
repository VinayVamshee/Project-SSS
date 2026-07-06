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

        const user = new User({ username, password, role: type, schoolId: req.schoolId });
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

exports.devCreateUser = async (req, res) => {
    try {
        const { username, password, role, schoolId } = req.body;

        if (!username || !password || !role) {
            return res.status(400).json({ message: 'Username, password, and role are required' });
        }

        const targetSchoolId = schoolId || req.schoolId;
        if (!targetSchoolId) {
            return res.status(400).json({ message: 'A school context or schoolId is required' });
        }

        const exists = await User.findOne({ username, schoolId: targetSchoolId }).setOptions({ bypassTenant: true });
        if (exists) {
            return res.status(400).json({ message: 'User already exists in this school' });
        }

        const user = new User({
            username,
            password,
            role,
            schoolId: targetSchoolId
        });
        
        await user.save();
        res.status(201).json({ message: 'User created successfully', user });
    } catch (err) {
        res.status(500).json({ message: 'Failed to create user', error: err.message });
    }
};

exports.devGetUsers = async (req, res) => {
    try {
        const { schoolId } = req.query;
        const targetSchoolId = schoolId || req.schoolId;

        if (!targetSchoolId) {
            return res.status(400).json({ message: 'A schoolId or school context is required' });
        }

        const users = await User.find({ schoolId: targetSchoolId }).setOptions({ bypassTenant: true });
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch users', error: err.message });
    }
};

exports.devUpdateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, password, role, schoolId } = req.body;

        if (!username || !password || !role || !schoolId) {
            return res.status(400).json({ message: 'Username, password, role, and schoolId are required' });
        }

        const exists = await User.findOne({ 
            username, 
            schoolId, 
            _id: { $ne: id } 
        }).setOptions({ bypassTenant: true });
        
        if (exists) {
            return res.status(400).json({ message: 'Username already taken in this school' });
        }

        const updated = await User.findByIdAndUpdate(
            id,
            { username, password, role, schoolId },
            { new: true }
        ).setOptions({ bypassTenant: true });

        if (!updated) return res.status(404).json({ message: 'User not found' });
        res.json({ message: 'User updated successfully', user: updated });
    } catch (err) {
        res.status(500).json({ message: 'Failed to update user', error: err.message });
    }
};


