const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const ApprovalRequest = require('../model/approvalRequest');
const Distribution = require('../model/distribution');
const Task = require('../model/task');

dayjs.extend(customParseFormat);

function toDateOnly(value) {
  const parsed = dayjs(String(value || '').trim(), 'YYYY-MM-DD', true);
  return parsed.isValid() ? parsed.startOf('day').toDate() : null;
}

function toMinuteOfDay(value) {
  const parsed = dayjs(String(value || '').trim(), 'HH:mm', true);
  if (!parsed.isValid()) {
    return NaN;
  }
  return parsed.hour() * 60 + parsed.minute();
}

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

function toDateText(value) {
  const d = dayjs(value);
  return d.isValid() ? d.format('DD/MM/YYYY') : '--';
}

function toDateTimeText(value) {
  const d = dayjs(value);
  return d.isValid() ? d.format('DD/MM/YYYY HH:mm') : '--';
}

class ApprovalsController {
  constructor() {
    this.managerIndex = this.managerIndex.bind(this);
    this.employeeIndex = this.employeeIndex.bind(this);
    this.createRequest = this.createRequest.bind(this);
    this.approve = this.approve.bind(this);
    this.reject = this.reject.bind(this);
  }

  mapRequestRow(row) {
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
      createdAtText: toDateTimeText(row.createdAt),
      reviewedAtText: toDateTimeText(row.reviewedAt),
      reviewedByName: reviewer.name || '--',
    };
  }

  async managerIndex(req, res) {
    try {
      const [pendingRows, recentRows] = await Promise.all([
        ApprovalRequest.find({ status: 'pending' })
          .populate('requesterID')
          .populate('taskID')
          .sort({ createdAt: -1 })
          .lean(),
        ApprovalRequest.find({ status: { $in: ['approved', 'rejected'] } })
          .populate('requesterID')
          .populate('taskID')
          .populate('reviewedBy')
          .sort({ reviewedAt: -1, updatedAt: -1 })
          .limit(40)
          .lean(),
      ]);

      return res.render('approvals-manager', {
        pendingRequests: pendingRows.map((row) => this.mapRequestRow(row)),
        historyRequests: recentRows.map((row) => this.mapRequestRow(row)),
      });
    } catch (error) {
      req.flash('error', 'Unable to load Approval Center.');
      return res.redirect('/');
    }
  }

  async employeeIndex(req, res) {
    try {
      const userId = req.session?.user?._id;
      if (!userId) {
        return res.redirect('/login');
      }

      const [rows, distributions] = await Promise.all([
        ApprovalRequest.find({ requesterID: userId })
          .populate('taskID')
          .populate('reviewedBy')
          .sort({ createdAt: -1 })
          .limit(80)
          .lean(),
        Distribution.find({ employeeID: userId })
          .populate({
            path: 'taskID',
            match: { task_status: { $ne: 'archived' } },
          })
          .lean(),
      ]);

      const assignedTasks = distributions
        .map((row) => row.taskID)
        .filter(Boolean)
        .map((task) => ({
          _id: task._id,
          name_task: task.name_task,
          deadlineText: toDateText(task.deadline),
        }));

      return res.render('approvals-employee', {
        requestRows: rows.map((row) => this.mapRequestRow(row)),
        assignedTasks,
        todayDate: dayjs().format('YYYY-MM-DD'),
      });
    } catch (error) {
      req.flash('error', 'Unable to load request page.');
      return res.redirect('/dashboard');
    }
  }

  async createRequest(req, res) {
    try {
      const userId = req.session?.user?._id;
      if (!userId) {
        return res.redirect('/login');
      }

      const requestType = String(req.body.requestType || '').trim();
      const reason = String(req.body.reason || '').trim();
      if (!['leave', 'shift_change', 'deadline_extension'].includes(requestType)) {
        req.flash('error', 'Invalid request type.');
        return res.redirect('/approvals/my');
      }
      if (reason.length < 6) {
        req.flash('error', 'Reason must be at least 6 characters.');
        return res.redirect('/approvals/my');
      }

      const payload = {
        requesterID: userId,
        requestType,
        reason,
        status: 'pending',
      };

      if (requestType === 'leave') {
        const fromDate = toDateOnly(req.body.requestedFromDate);
        const toDate = toDateOnly(req.body.requestedToDate);
        if (!fromDate || !toDate || toDate < fromDate) {
          req.flash('error', 'Invalid leave date range.');
          return res.redirect('/approvals/my');
        }
        payload.requestedFromDate = fromDate;
        payload.requestedToDate = toDate;
      }

      if (requestType === 'shift_change') {
        const requestedDate = toDateOnly(req.body.requestedDate);
        const currentStart = String(req.body.currentTimeStart || '').trim();
        const currentEnd = String(req.body.currentTimeEnd || '').trim();
        const requestedStart = String(req.body.requestedTimeStart || '').trim();
        const requestedEnd = String(req.body.requestedTimeEnd || '').trim();

        const currentStartMin = toMinuteOfDay(currentStart);
        const currentEndMin = toMinuteOfDay(currentEnd);
        const requestedStartMin = toMinuteOfDay(requestedStart);
        const requestedEndMin = toMinuteOfDay(requestedEnd);

        if (
          !requestedDate
          || !Number.isFinite(currentStartMin)
          || !Number.isFinite(currentEndMin)
          || !Number.isFinite(requestedStartMin)
          || !Number.isFinite(requestedEndMin)
          || currentEndMin <= currentStartMin
          || requestedEndMin <= requestedStartMin
        ) {
          req.flash('error', 'Invalid shift change information.');
          return res.redirect('/approvals/my');
        }

        payload.requestedDate = requestedDate;
        payload.currentTimeStart = currentStart;
        payload.currentTimeEnd = currentEnd;
        payload.requestedTimeStart = requestedStart;
        payload.requestedTimeEnd = requestedEnd;
      }

      if (requestType === 'deadline_extension') {
        const taskId = String(req.body.taskID || '').trim();
        const requestedDeadline = toDateOnly(req.body.requestedDeadline);
        if (!taskId || !requestedDeadline) {
          req.flash('error', 'Invalid deadline extension information.');
          return res.redirect('/approvals/my');
        }

        const distribution = await Distribution.findOne({
          employeeID: userId,
          taskID: taskId,
        })
          .populate('taskID')
          .lean();

        if (!distribution || !distribution.taskID) {
          req.flash('error', 'You are not assigned to this task.');
          return res.redirect('/approvals/my');
        }

        const currentDeadline = toDateOnly(distribution.taskID.deadline);
        if (!currentDeadline || requestedDeadline <= currentDeadline) {
          req.flash('error', 'New deadline must be later than current deadline.');
          return res.redirect('/approvals/my');
        }

        payload.taskID = taskId;
        payload.requestedDeadline = requestedDeadline;
      }

      await ApprovalRequest.create(payload);
      req.flash('success', 'Request submitted successfully. Waiting for manager review.');
      return res.redirect('/approvals/my');
    } catch (error) {
      req.flash('error', 'Unable to submit request right now.');
      return res.redirect('/approvals/my');
    }
  }

  async approve(req, res) {
    try {
      const managerId = req.session?.user?._id;
      const requestId = req.params.id;

      const row = await ApprovalRequest.findOne({ _id: requestId, status: 'pending' })
        .populate('taskID')
        .lean();
      if (!row) {
        req.flash('error', 'Request does not exist or has already been processed.');
        return res.redirect('/approvals');
      }

      if (row.requestType === 'deadline_extension' && row.taskID && row.requestedDeadline) {
        await Task.updateOne(
          { _id: row.taskID._id || row.taskID },
          { deadline: row.requestedDeadline }
        );
      }

      await ApprovalRequest.updateOne(
        { _id: requestId, status: 'pending' },
        {
          status: 'approved',
          managerNote: String(req.body.managerNote || '').trim(),
          reviewedBy: managerId,
          reviewedAt: new Date(),
        }
      );

      req.flash('success', 'Request approved successfully.');
      return res.redirect('/approvals');
    } catch (error) {
      req.flash('error', 'Unable to approve request.');
      return res.redirect('/approvals');
    }
  }

  async reject(req, res) {
    try {
      const managerId = req.session?.user?._id;
      const requestId = req.params.id;
      const managerNote = String(req.body.managerNote || '').trim();
      if (managerNote.length < 3) {
        req.flash('error', 'Please enter a rejection note of at least 3 characters.');
        return res.redirect('/approvals');
      }

      const result = await ApprovalRequest.updateOne(
        { _id: requestId, status: 'pending' },
        {
          status: 'rejected',
          managerNote,
          reviewedBy: managerId,
          reviewedAt: new Date(),
        }
      );

      const modified = Number(result.modifiedCount) || Number(result.nModified) || 0;
      if (modified < 1) {
        req.flash('error', 'Request does not exist or has already been processed.');
        return res.redirect('/approvals');
      }

      req.flash('success', 'Request rejected.');
      return res.redirect('/approvals');
    } catch (error) {
      req.flash('error', 'Unable to reject request.');
      return res.redirect('/approvals');
    }
  }
}

module.exports = new ApprovalsController();
