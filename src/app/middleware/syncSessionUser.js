const jwt = require('jsonwebtoken');
const User = require('../model/user');
const { normalizeRole, isEmployeePosition, isManagerPosition, isDirectorPosition, isAdminPosition } = require('./roleUtils');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';

function readToken(req) {
  const cookieToken = req.cookies?.token;
  if (cookieToken) return cookieToken;

  const header = String(req.get('authorization') || '');
  if (header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim();
  }

  return '';
}

async function syncSessionUser(req, res, next) {
  try {
    const token = readToken(req);
    if (!token) {
      req.user = null;
      res.locals.currentUser = null;
      res.locals.isEmployee = false;
      res.locals.isManager = false;
      res.locals.isDirector = false;
      res.locals.isAdmin = false;
      return next();
    }

    let payload = null;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      res.clearCookie('token');
      req.user = null;
      res.locals.currentUser = null;
      res.locals.isEmployee = false;
      res.locals.isManager = false;
      res.locals.isDirector = false;
      res.locals.isAdmin = false;
      return next();
    }

    const userId = payload?.sub || payload?._id;
    if (!userId) {
      return next();
    }

    const user = await User.findById(userId)
      .select('name role position avatar totalWorkingHours isBanned')
      .lean();

    if (!user || user.isBanned) {
      res.clearCookie('token');
      req.user = null;
      res.locals.currentUser = null;
      res.locals.isEmployee = false;
      res.locals.isManager = false;
      res.locals.isDirector = false;
      res.locals.isAdmin = false;
      return next();
    }

    const normalizedUser = {
      _id: user._id,
      name: user.name,
      role: normalizeRole(user.role),
      position: user.position,
      avatar: user.avatar,
      totalWorkingHours: user.totalWorkingHours || 0,
      isBanned: user.isBanned,
    };

    res.locals.jwtToken = token;
    req.user = normalizedUser;
    res.locals.currentUser = normalizedUser;
    res.locals.isEmployee = isEmployeePosition(normalizedUser);
    res.locals.isManager = isManagerPosition(normalizedUser);
    res.locals.isDirector = isDirectorPosition(normalizedUser);
    res.locals.isAdmin = isAdminPosition(normalizedUser);
  } catch (error) {
  }

  return next();
}

module.exports = syncSessionUser;
