const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Announcement = new Schema(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Users', required: true },
    isActive: { type: Boolean, default: true },
    seenBy: [{ type: Schema.Types.ObjectId, ref: 'Users', default: [] }],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Announcements', Announcement);
