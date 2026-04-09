const Announcement = require('../model/announcement');
const asyncHandler = require('express-async-handler');
const { z } = require('zod');

class AnnouncementsController {
  constructor() {
    this.index = this.index.bind(this);
    this.store = this.store.bind(this);
    this.markSeen = this.markSeen.bind(this);
    this.delete = this.delete.bind(this);
  }

  index = asyncHandler(async (req, res) => {
    const rows = await Announcement.find({})
      .populate('createdBy')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.render('announcements', {
      announcements: rows.map((row) => ({
        ...row,
        createdByName: row.createdBy?.name || 'Unknown',
        createdAtText: row.createdAt ? new Date(row.createdAt).toLocaleString('vi-VN') : '--',
        isSeen: false,
      })),
    });
  });

  store = asyncHandler(async (req, res) => {
      const userId = req.user?._id;
      if (!userId) {
        return res.redirect('/login');
      }

      const { title, message } = z.object({
          title: z.string().trim().min(3, "Title must be at least 3 characters"),
          message: z.string().trim().min(5, "Message must be at least 5 characters")
      }).parse(req.body);

      await Announcement.create({
        title,
        message,
        createdBy: userId,
        isActive: true,
      });

      req.flash('success', 'Announcement sent to all employees.');
      return res.redirect('/announcements');
  });

  markSeen = asyncHandler(async (req, res) => {
      const userId = req.user?._id;
      if (!userId) {
        return res.status(401).json({ ok: false });
      }

      const { id: announcementId } = z.object({
          id: z.string().trim().min(1, 'Missing announcement ID')
      }).parse(req.params);

      await Announcement.exists({ _id: announcementId });

      return res.json({ ok: true });
  });

  delete = asyncHandler(async (req, res) => {
      const userId = req.user?._id;
      if (!userId) {
        return res.redirect('/login');
      }

      const { id: announcementId } = z.object({
          id: z.string().trim().min(1, 'Missing announcement ID')
      }).parse(req.params);

      await Announcement.findByIdAndDelete(announcementId);

      req.flash('success', 'Announcement deleted successfully.');
      return res.redirect('back');
  });
}

module.exports = new AnnouncementsController();
