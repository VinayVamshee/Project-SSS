// core/audit/auditLogger.js
const Audit = require('./Audit');
const logger = require('../logger/logger');

const logAudit = async (action, entityName, entityId, changedFields, req) => {
  try {
    const actorId = req.user?._id || req.user?.id;
    const schoolId = req.tenant?._id || req.tenant?.id;

    if (!actorId || !schoolId) {
      // Skip audit logging if context is not established (e.g. public routes or incomplete sessions)
      return;
    }

    const auditEntry = new Audit({
      action,
      entityName,
      entityId,
      changedFields,
      actorId,
      schoolId
    });

    await auditEntry.save();
    logger.info(`Audit logged: ${action} on ${entityName} (${entityId}) by User ${actorId}`);
  } catch (error) {
    logger.error(`Failed to write audit log: ${error.message}`);
  }
};

module.exports = {
  logAudit
};
