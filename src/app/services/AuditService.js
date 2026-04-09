const AuditLog = require('../model/AuditLog');

class AuditService {
  async log(action, performedBy, details = '', targetUser = null, ipAddress = '') {
    try {
      const logEntry = new AuditLog({
        action,
        performedBy,
        targetUser,
        details,
        ipAddress,
      });
      await logEntry.save();
    } catch (err) {
      console.error('AuditLog Error:', err);
    }
  }

  async getRecentLogs(limit = 100) {
    return await AuditLog.find({})
      .populate('performedBy', 'name email role')
      .populate('targetUser', 'name email role')
      .sort({ createdAt: -1 })
      .lean();
  }
}

module.exports = new AuditService();
