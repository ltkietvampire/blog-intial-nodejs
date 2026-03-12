const dayjs = require('dayjs');
const ApprovalRequest = require('../model/approvalRequest');
const User = require('../model/user');

const VALID_USER_STATUSES = new Set(['status-active', 'status-busy', 'status-off']);
const MIN_SYNC_INTERVAL_MS = 30 * 1000;

let lastSyncAt = 0;
let runningPromise = null;

function normalizeRestoreStatus(value) {
  const status = String(value || '').trim();
  return VALID_USER_STATUSES.has(status) ? status : 'status-active';
}

async function runSync() {
  const dayStart = dayjs().startOf('day').toDate();
  const dayEnd = dayjs().endOf('day').toDate();

  const activeLeaveUserIds = await ApprovalRequest.distinct('requesterID', {
    requestType: 'leave',
    status: 'approved',
    requestedFromDate: { $lte: dayEnd },
    requestedToDate: { $gte: dayStart },
  });

  const activeSet = new Set(activeLeaveUserIds.map((id) => String(id)));
  const candidates = await User.find({
    $or: [
      { leaveAutoBusy: true },
      { _id: { $in: activeLeaveUserIds } },
    ],
  })
    .select('_id trangthai leaveAutoBusy statusBeforeLeave')
    .lean();

  if (!candidates.length) {
    return;
  }

  const bulkOps = [];

  for (const user of candidates) {
    const id = String(user._id);
    const hasActiveLeave = activeSet.has(id);
    const isAutoBusy = Boolean(user.leaveAutoBusy);

    if (hasActiveLeave) {
      if (!isAutoBusy || user.trangthai !== 'status-busy') {
        const beforeStatus = isAutoBusy
          ? normalizeRestoreStatus(user.statusBeforeLeave)
          : normalizeRestoreStatus(user.trangthai);

        bulkOps.push({
          updateOne: {
            filter: { _id: user._id },
            update: {
              $set: {
                trangthai: 'status-busy',
                leaveAutoBusy: true,
                statusBeforeLeave: beforeStatus,
              },
            },
          },
        });
      }
      continue;
    }

    if (isAutoBusy) {
      bulkOps.push({
        updateOne: {
          filter: { _id: user._id },
          update: {
            $set: {
              trangthai: normalizeRestoreStatus(user.statusBeforeLeave),
              leaveAutoBusy: false,
            },
            $unset: {
              statusBeforeLeave: 1,
            },
          },
        },
      });
    }
  }

  if (bulkOps.length) {
    await User.bulkWrite(bulkOps, { ordered: false });
  }
}

async function syncLeaveBusyStatuses(options = {}) {
  const force = Boolean(options.force);
  const now = Date.now();

  if (!force && now - lastSyncAt < MIN_SYNC_INTERVAL_MS) {
    return;
  }

  if (runningPromise) {
    await runningPromise;
    return;
  }

  runningPromise = runSync()
    .catch(() => {})
    .finally(() => {
      lastSyncAt = Date.now();
      runningPromise = null;
    });

  await runningPromise;
}

module.exports = {
  syncLeaveBusyStatuses,
};
