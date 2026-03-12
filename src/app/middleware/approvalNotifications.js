const ApprovalRequest = require('../model/approvalRequest');
const { isManagerPosition } = require('./roleUtils');

function getTypeLabel(type) {
  if (type === 'leave') return 'Leave request';
  if (type === 'shift_change') return 'Shift change';
  if (type === 'deadline_extension') return 'Deadline extension';
  return 'Request';
}

async function approvalNotifications(req, res, next) {
  res.locals.approvalNotifications = { totalCount: 0, items: [] };

  try {
    const currentUser = req.session?.user;
    if (!currentUser?._id || !isManagerPosition(currentUser)) {
      return next();
    }

    const [totalCount, rows] = await Promise.all([
      ApprovalRequest.countDocuments({ status: 'pending' }),
      ApprovalRequest.find({ status: 'pending' })
        .populate('requesterID')
        .populate('taskID')
        .sort({ createdAt: -1 })
        .limit(12)
        .lean(),
    ]);

    const items = rows.map((row) => {
      const requesterName = row.requesterID?.name || 'Unknown';
      const typeLabel = getTypeLabel(row.requestType);
      const taskName = row.taskID?.name_task || '';
      const reason = String(row.reason || '').trim();

      return {
        title: `${requesterName} - ${typeLabel}`,
        taskName,
        detail: reason || 'Pending manager review.',
        type: 'pending',
        tagClass: 'text-bg-warning',
        link: '/approvals',
      };
    });

    res.locals.approvalNotifications = { totalCount, items };
  } catch (error) {
    res.locals.approvalNotifications = { totalCount: 0, items: [] };
  }

  return next();
}

module.exports = approvalNotifications;
