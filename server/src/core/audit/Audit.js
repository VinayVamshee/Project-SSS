// core/audit/Audit.js
const mongoose = require('mongoose');

const auditSchema = new mongoose.Schema({
  action: { type: String, enum: ['CREATE', 'UPDATE', 'DELETE'], required: true },
  entityName: { type: String, required: true },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
  changedFields: { type: Map, of: mongoose.Schema.Types.Mixed },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true }
}, { timestamps: true });

// Indexing for quick audit trail searches per tenant
auditSchema.index({ schoolId: 1, createdAt: -1 });
auditSchema.index({ entityName: 1, entityId: 1 });

module.exports = mongoose.model('Audit', auditSchema);
