const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Salary = new Schema(
  {
    employeeID: {
      type: Schema.Types.ObjectId,
      ref: 'Users',
      required: true,
    },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    totalHours: { type: Number, default: 0, min: 0 },
    hourlyRate: { type: Number, default: 0, min: 0 },
    bonus: { type: Number, default: 0, min: 0 },
    deduction: { type: Number, default: 0, min: 0 },
    totalPay: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['draft', 'pending', 'paid'],
      default: 'draft',
    },
    managerApprovedBy: { type: Schema.Types.ObjectId, ref: 'Users' },
    managerApprovedAt: { type: Date },
    directorApprovedBy: { type: Schema.Types.ObjectId, ref: 'Users' },
    directorApprovedAt: { type: Date },
    rejectedBy: { type: Schema.Types.ObjectId, ref: 'Users' },
    rejectedAt: { type: Date },
    rejectReason: { type: String, trim: true },
  },
  {
    timestamps: true,
  }
);

Salary.index({ employeeID: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Salaries', Salary);
