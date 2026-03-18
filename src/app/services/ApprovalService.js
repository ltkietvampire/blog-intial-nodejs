const ApprovalRequest = require('../model/approvalRequest');
const Distribution = require('../model/distribution');
const Task = require('../model/task');
const { syncLeaveBusyStatuses } = require('./leaveStatusService');
const { toDateOnly, toMinuteOfDay } = require('../../util/dateTime');
const { z } = require('zod');

class ApprovalService {
  async createRequest(userId, requestData) {
    const { requestType, reason } = z.object({
      requestType: z.enum(['leave', 'shift_change', 'deadline_extension'], {
        errorMap: () => ({ message: 'Invalid request type.' })
      }),
      reason: z.string().trim().min(6, 'Reason must be at least 6 characters.')
    }).parse(requestData);

    const payload = {
      requesterID: userId,
      requestType,
      reason,
      status: 'pending',
    };

    if (requestType === 'leave') {
        const fromDate = toDateOnly(requestData.requestedFromDate);
        const toDate = toDateOnly(requestData.requestedToDate);
        if (!fromDate || !toDate || toDate < fromDate) {
          throw new Error('Invalid leave date range.');
        }
        payload.requestedFromDate = fromDate;
        payload.requestedToDate = toDate;
    }

    if (requestType === 'shift_change') {
      const requestedDate = toDateOnly(requestData.requestedDate);
      const currentStart = String(requestData.currentTimeStart || '').trim();
      const currentEnd = String(requestData.currentTimeEnd || '').trim();
      const requestedStart = String(requestData.requestedTimeStart || '').trim();
      const requestedEnd = String(requestData.requestedTimeEnd || '').trim();

      const currentStartMin = toMinuteOfDay(currentStart);
      const currentEndMin = toMinuteOfDay(currentEnd);
      const requestedStartMin = toMinuteOfDay(requestedStart);
      const requestedEndMin = toMinuteOfDay(requestedEnd);

      if (
        !requestedDate ||
        !Number.isFinite(currentStartMin) ||
        !Number.isFinite(currentEndMin) ||
        !Number.isFinite(requestedStartMin) ||
        !Number.isFinite(requestedEndMin) ||
        currentEndMin <= currentStartMin ||
        requestedEndMin <= requestedStartMin
      ) {
        throw new Error('Invalid shift change information.');
      }

      payload.requestedDate = requestedDate;
      payload.currentTimeStart = currentStart;
      payload.currentTimeEnd = currentEnd;
      payload.requestedTimeStart = requestedStart;
      payload.requestedTimeEnd = requestedEnd;
    }

    if (requestType === 'deadline_extension') {
      const taskId = String(requestData.taskID || '').trim();
      const requestedDeadline = toDateOnly(requestData.requestedDeadline);
      
      if (!taskId || !requestedDeadline) {
        throw new Error('Invalid deadline extension information.');
      }

      const distribution = await Distribution.findOne({
        employeeID: userId,
        taskID: taskId,
      }).populate('taskID').lean();

      if (!distribution || !distribution.taskID) {
        throw new Error('You are not assigned to this task.');
      }

      const currentDeadline = toDateOnly(distribution.taskID.deadline);
      if (!currentDeadline || requestedDeadline <= currentDeadline) {
        throw new Error('New deadline must be later than current deadline.');
      }

      payload.taskID = taskId;
      payload.requestedDeadline = requestedDeadline;
    }

    await ApprovalRequest.create(payload);
  }

  async approveRequest(requestId, managerId, managerNote) {
    const row = await ApprovalRequest.findOne({ _id: requestId, status: 'pending' }).populate('taskID').lean();
    if (!row) {
      throw new Error('Request does not exist or has already been processed.');
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
        managerNote: managerNote || '',
        reviewedBy: managerId,
        reviewedAt: new Date(),
      }
    );

    await syncLeaveBusyStatuses({ force: true });
  }

  async rejectRequest(requestId, managerId, managerNote) {
    if (!managerNote || managerNote.length < 3) {
      throw new Error('Please enter a rejection note of at least 3 characters.');
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
      throw new Error('Request does not exist or has already been processed.');
    }
  }
}

module.exports = new ApprovalService();
