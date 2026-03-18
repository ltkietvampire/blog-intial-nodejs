const jwt = require('jsonwebtoken');
const User = require('../model/user');
const { normalizeRole, isEmployeePosition, isManagerPosition } = require('./roleUtils');

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
      return next();
    }

    const userId = payload?.sub || payload?._id;
    if (!userId) {
      return next();
    }

    const user = await User.findById(userId)
      .select('name role position avatar totalWorkingHours')
      .lean();

    if (!user) {
      res.clearCookie('token');
      req.user = null;
      res.locals.currentUser = null;
      res.locals.isEmployee = false;
      res.locals.isManager = false;
      return next();
    }

    const normalizedUser = {
      _id: user._id,
      name: user.name,
      role: normalizeRole(user.role),
      position: user.position,
      avatar: user.avatar,
      totalWorkingHours: user.totalWorkingHours || 0,
    };

    req.user = normalizedUser;
    res.locals.currentUser = normalizedUser;
    res.locals.isEmployee = isEmployeePosition(normalizedUser);
    res.locals.isManager = isManagerPosition(normalizedUser);
  } catch (error) {
  }

  return next();
}

module.exports = syncSessionUser;
