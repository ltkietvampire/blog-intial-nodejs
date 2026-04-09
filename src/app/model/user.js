const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const User = new Schema(
  {
    name: { type: String, default: 'no name', trim: true },
    role: {
      type: String,
      enum: ['employee', 'manager', 'director', 'admin'],
      required: true,
      default: 'employee',
    },
    position: { type: String, required: true, trim: true },
    hourlyRate: { type: Number, default: 0, min: 0 },
    maxtime: { type: Number, default: 8, min: 0, max: 8 },
    trangthai: {
      type: String,
      enum: ['status-active', 'status-busy', 'status-off'],
      default: 'status-active',
    },
    isBanned: { type: Boolean, default: false },
    leaveAutoBusy: { type: Boolean, default: false },
    statusBeforeLeave: {
      type: String,
      enum: ['status-active', 'status-busy', 'status-off'],
    },
    email: { type: String, required: true, trim: true },
    password: { type: String, required: true },
    SDT: { type: String, required: true, trim: true },
    avatar: { type: String, default: '/img/default-avatar.webp' },
    cover: { type: String, default: '/img/default-avatar.webp' },
    introduce: { type: String, default: 'khong co gi' },
    state: { type: String, default: 'chua co' },
    totalWorkingHours: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Users', User);
