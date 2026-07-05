const tenantStorage = require('./tenantContext');

/**
 * Helper to dynamically inject schoolId filter if tenant context exists.
 * Helps prevent cross-tenant data leaks.
 */
const tenantQuery = (queryObj = {}) => {
  const store = tenantStorage.getStore();
  if (store && store.schoolId) {
    return { ...queryObj, schoolId: store.schoolId };
  }
  return queryObj;
};

module.exports = tenantQuery;
