const jwt = require('jsonwebtoken');
const User = require('../../domain/auth/models/User');
const AppError = require('../../core/errors/AppError');

const SECRET = process.env.SECRET || process.env.JWT_SECRET;

const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return next(
        new AppError(
          "You are not logged in. Please log in to get access.",
          401
        )
      );
    }

    const decoded = jwt.verify(token, SECRET);

    if (decoded.isDev) {
      req.user = decoded;
      return next();
    }

    const currentUser = await User.findById(decoded.id || decoded._id);

    if (!currentUser) {
      return next(
        new AppError(
          "The user belonging to this token no longer exists.",
          401
        )
      );
    }

    req.user = currentUser;
    next();
  } catch (error) {
    next(error);
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (req.user && req.user.isDev) {
      return next();
    }

    const userRole = req.user?.role;
    
    // template-admin custom logic
    if (userRole === 'template-admin') {
      const url = req.originalUrl || '';
      const isWriteMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
      
      if (url.includes('/templates')) {
        if (req.method === 'DELETE') {
          return next(new AppError('Permission Denied: template-admin is restricted from deleting templates.', 403));
        }
        return next(); // Allow other write operations on templates
      }
      
      const isMetadataNonTemplate = url.includes('/entities') || url.includes('/fields');
      const isSystemAdminWrite = url.includes('/schools') || url.includes('/users');
      
      if ((isMetadataNonTemplate || isSystemAdminWrite) && isWriteMethod) {
        return next(new AppError('Permission Denied: template-admin is restricted from modifying entities, fields, schools, or users.', 403));
      }
    }

    const allowed = req.user && (
      roles.includes(userRole) || 
      (userRole === 'template-admin' && roles.includes('viewer'))
    );

    if (!allowed) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }

    next();
  };
};

module.exports = {
  protect,
  restrictTo
};
