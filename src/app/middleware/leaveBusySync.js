const { syncLeaveBusyStatuses } = require('../services/leaveStatusService');

async function leaveBusySync(req, res, next) {
  try {
    await syncLeaveBusyStatuses();
  } catch (error) {
  }
  return next();
}

module.exports = leaveBusySync;
