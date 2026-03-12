const { syncLeaveBusyStatuses } = require('../services/leaveStatusService');

async function leaveBusySync(req, res, next) {
  try {
    await syncLeaveBusyStatuses();
  } catch (error) {
    // Ignore sync errors and continue request flow.
  }
  return next();
}

module.exports = leaveBusySync;
