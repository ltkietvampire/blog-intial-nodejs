const dayjs = require('dayjs');
const ApprovalRequest = require('../model/approvalRequest');
const Distribution = require('../model/distribution');
const Task = require('../model/task');
const { syncLeaveBusyStatuses } = require('../services/leaveStatusService');
const {
  toDateOnly,
  toMinuteOfDay,
  toDateText,
} = require('../../util/dateTime');
const { mapRequestRow } = require('../../util/approvalUtils');
const asyncHandler = require('express-async-handler');
const ApprovalService = require('../services/ApprovalService');

class ApprovalsController {
  constructor() {
    this.managerIndex = this.managerIndex.bind(this);
    this.employeeIndex = this.employeeIndex.bind(this);
    this.createRequest = this.createRequest.bind(this);
    this.approve = this.approve.bind(this);
    this.reject = this.reject.bind(this);
  }

  managerIndex = asyncHandler(async (req, res) => {
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
        pendingRequests: pendingRows.map(mapRequestRow),
        historyRequests: recentRows.map(mapRequestRow),
      });
  });

  employeeIndex = asyncHandler(async (req, res) => {
      const userId = req.user?._id;
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
        requestRows: rows.map(mapRequestRow),
        assignedTasks,
        todayDate: dayjs().format('YYYY-MM-DD'),
      });
  });

  createRequest = asyncHandler(async (req, res) => {
      const userId = req.user?._id;
      if (!userId) {
        return res.redirect('/login');
      }

      await ApprovalService.createRequest(userId, req.body);
      
      req.flash('success', 'Request submitted successfully. Waiting for manager review.');
      return res.redirect('/approvals/my');
  });

  approve = asyncHandler(async (req, res) => {
      const managerId = req.user?._id;
      const requestId = req.params.id;

      await ApprovalService.approveRequest(requestId, managerId, req.body.managerNote);

      req.flash('success', 'Request approved successfully.');
      return res.redirect('/approvals');
  });

  reject = asyncHandler(async (req, res) => {
      const managerId = req.user?._id;
      const requestId = req.params.id;
      
      await ApprovalService.rejectRequest(requestId, managerId, req.body.managerNote);

      req.flash('success', 'Request rejected.');
      return res.redirect('/approvals');
  });
}

module.exports = new ApprovalsController();
