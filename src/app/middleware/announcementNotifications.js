const Announcement = require('../model/announcement');

async function announcementNotifications(req, res, next) {
  res.locals.announcementNotifications = { totalCount: 0, items: [] };

  try {
    const currentUser = req.user;
    if (!currentUser?._id) {
      return next();
    }

    // Role-based filtering: null (public) OR matches user's role
    const filter = { 
      isActive: true,
      $or: [
        { targetRole: null },
        { targetRole: currentUser.role }
      ]
    };

    const [rows, unseenCount] = await Promise.all([
      Announcement.find(filter)
        .populate('createdBy')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Announcement.countDocuments(filter),
    ]);

    const items = rows.map((row) => ({
      title: row.title,
      detail: row.message,
      createdAtText: row.createdAt ? new Date(row.createdAt).toLocaleString('vi-VN') : '--',
      createdByName: row.createdBy?.name || 'Manager',
      link: '#',
      isSeen: false,
      id: String(row._id),
    }));

    res.locals.announcementNotifications = {
      totalCount: unseenCount,
      items,
    };
  } catch (error) {
    res.locals.announcementNotifications = { totalCount: 0, items: [] };
  }

  return next();
}

module.exports = announcementNotifications;
