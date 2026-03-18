const { toDateText, toDateTimeText } = require('./dateTime');

function getTypeLabel(type) {
  if (type === 'leave') return 'Leave request';
  if (type === 'shift_change') return 'Shift change';
  if (type === 'deadline_extension') return 'Deadline extension';
  return type || 'Unknown';
}

function getStatusLabel(status) {
  if (status === 'approved') return 'Approved';
  if (status === 'rejected') return 'Rejected';
  return 'Pending';
}

function getStatusClass(status) {
  if (status === 'approved') return 'text-bg-success';
  if (status === 'rejected') return 'text-bg-danger';
  return 'text-bg-warning';
}

function toDateTimeTextLocal(value) {
  return toDateTimeText(value, { format: 'DD/MM/YYYY HH:mm', fallback: '--' });
}

function mapRequestRow(row) {
  const requester = row.requesterID || {};
  const task = row.taskID || {};
  const reviewer = row.reviewedBy || {};

  return {
    ...row,
    requesterName: requester.name || 'Unknown',
    requesterEmail: requester.email || '--',
    taskName: task.name_task || '--',
    taskDeadlineText: toDateText(task.deadline),
    requestTypeLabel: getTypeLabel(row.requestType),
    statusLabel: getStatusLabel(row.status),
    statusClass: getStatusClass(row.status),
    requestedFromDateText: toDateText(row.requestedFromDate),
    requestedToDateText: toDateText(row.requestedToDate),
    requestedDateText: toDateText(row.requestedDate),
    requestedDeadlineText: toDateText(row.requestedDeadline),
    createdAtText: toDateTimeTextLocal(row.createdAt),
    reviewedAtText: toDateTimeTextLocal(row.reviewedAt),
    reviewedByName: reviewer.name || '--',
  };
}

module.exports = {
  mapRequestRow,
  getTypeLabel,
  getStatusLabel,
  getStatusClass,
  toDateTimeTextLocal,
};
