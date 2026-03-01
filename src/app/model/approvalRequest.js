const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ApprovalRequest = new Schema(
  {
    requesterID: {
      type: Schema.Types.ObjectId,
      ref: 'Users',
      required: true,
    },
    requestType: {
      type: String,
      enum: ['leave', 'shift_change', 'deadline_extension'],
      required: true,
    },
    taskID: {
      type: Schema.Types.ObjectId,
      ref: 'Tasks',
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    requestedFromDate: { type: Date },
    requestedToDate: { type: Date },
    requestedDate: { type: Date },
    currentTimeStart: { type: String, trim: true },
    currentTimeEnd: { type: String, trim: true },
    requestedTimeStart: { type: String, trim: true },
    requestedTimeEnd: { type: String, trim: true },
    requestedDeadline: { type: Date },
    managerNote: { type: String, trim: true, default: '' },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Users',
    },
    reviewedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('ApprovalRequests', ApprovalRequest);
