const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AuditLog = new Schema(
  {
    action: { type: String, required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'Users', required: true },
    targetUser: { type: Schema.Types.ObjectId, ref: 'Users', default: null },
    details: { type: String, default: '' },
    ipAddress: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditLog', AuditLog);
