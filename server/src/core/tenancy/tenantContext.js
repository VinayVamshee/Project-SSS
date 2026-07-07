// core/tenancy/tenantContext.js
const School = require('../../domain/models/School');
const AppError = require('../error/AppError');

// Local memory cache for resolved tenant slugs to reduce DB queries
const tenantCache = {};

const tenantContext = async (req, res, next) => {
  try {
    const slug = req.headers['x-tenant-slug'];
    if (!slug) {
      // Fallback or request rejection
      return next(new AppError('Missing x-tenant-slug header context', 400));
    }

    // Check memory cache first
    if (tenantCache[slug]) {
      req.tenant = tenantCache[slug];
      return next();
    }

    // Lookup in database
    const school = await School.findOne({ slug });
    if (!school) {
      return next(new AppError(`Tenant school with slug '${slug}' not found`, 404));
    }

    if (school.subscription?.status === 'suspended') {
      return next(new AppError('Tenant account has been suspended', 403));
    }

    // Store in cache and attach
    tenantCache[slug] = school;
    req.tenant = school;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  tenantContext,
  tenantCache // Export cache to allow invalidation if school gets updated
};
