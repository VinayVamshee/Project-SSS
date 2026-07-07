const User = require('../../domain/auth/models/User');
const jwt = require('jsonwebtoken');

const SECRET = process.env.SECRET;

class AuthService {
  async register(schoolId, data) {
    const { username, password, type = 'viewer' } = data;
    const exists = await User.findOne({ username, schoolId });
    if (exists) throw new Error('User already exists');

    const user = new User({ username, password, role: type, schoolId });
    await user.save();
    return user;
  }

  async login(schoolId, data) {
    const { username, password } = data;

    let user = await User.findOne({ username, isDev: true }).setOptions({ bypassTenant: true });

    if (!user) {
      if (!schoolId) throw new Error('Login requires a tenant context');
      user = await User.findOne({ username, schoolId });
    }

    if (!user || user.password !== password) {
      throw new Error('Invalid credentials');
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role, isDev: user.isDev, schoolId: user.schoolId },
      SECRET,
      { expiresIn: '7d' }
    );

    return { token, user };
  }

  async verifyToken(token, schoolId) {
    if (!token) throw new Error("Unauthorized");
    const decoded = jwt.verify(token, SECRET);
    if (schoolId && decoded.schoolId !== schoolId) {
      throw new Error("Forbidden: Tenant context mismatch");
    }
    return decoded;
  }

  async devGetUsers(schoolId) {
    if (!schoolId) throw new Error('A schoolId is required');
    return User.find({ schoolId }).setOptions({ bypassTenant: true });
  }

  async devCreateUser(schoolId, data) {
    const { username, password, role } = data;
    const exists = await User.findOne({ username, schoolId }).setOptions({ bypassTenant: true });
    if (exists) throw new Error('Username already taken in this school');

    const user = new User({ username, password, role, schoolId });
    await user.save();
    return user;
  }
}

module.exports = new AuthService();
