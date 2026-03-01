const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const User = new Schema(
  {
    name: { type: String, default: 'no name', trim: true },
    position: { type: String, required: true, trim: true },
    maxtime: { type: Number, default: 8, min: 0, max: 8 },
    trangthai: {
      type: String,
      enum: ['status-active', 'status-busy', 'status-off'],
      default: 'status-active',
    },
    email: { type: String, required: true, trim: true },
    password: { type: String, required: true },
    SDT: { type: String, required: true, trim: true },
    avatar: { type: String, default: 'https://i.pravatar.cc/300' },
    cover: { type: String, default: 'https://i.pravatar.cc/300' },
    introduce: { type: String, default: 'khong co gi' },
    state: { type: String, default: 'chua co' },
    totalWorkingHours: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Users', User);
