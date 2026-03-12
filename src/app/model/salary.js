const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Salary = new Schema(
  {
    employeeID: {
      type: Schema.Types.ObjectId,
      ref: 'Users',
      required: true,
    },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    totalHours: { type: Number, default: 0, min: 0 },
    hourlyRate: { type: Number, default: 0, min: 0 },
    totalPay: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'paid'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

Salary.index({ employeeID: 1, periodStart: 1, periodEnd: 1 }, { unique: true });

module.exports = mongoose.model('Salaries', Salary);
