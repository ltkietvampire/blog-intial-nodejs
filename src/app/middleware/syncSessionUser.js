const User = require('../model/user');
const { normalizeRole } = require('./roleUtils');

async function syncSessionUser(req, res, next) {
  try {
    const sessionUser = req.session?.user;
    if (!sessionUser?._id) {
      return next();
    }

    const user = await User.findById(sessionUser._id)
      .select('name role position avatar totalWorkingHours')
      .lean();

    if (!user) {
      req.session.destroy(() => {});
      return next();
    }

    req.session.user = {
      ...sessionUser,
      name: user.name,
      role: normalizeRole(user.role),
      position: user.position,
      avatar: user.avatar,
      totalWorkingHours: user.totalWorkingHours || 0,
    };
  } catch (error) {
    // Ignore sync errors to avoid breaking request flow.
  }

  return next();
}

module.exports = syncSessionUser;
