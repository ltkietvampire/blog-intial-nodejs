const { isDirectorPosition } = require('./roleUtils');

function requireDirector(req, res, next) {
  const user = req.user;
  if (!user?._id) {
    return res.redirect('/login');
  }

  if (isDirectorPosition(user)) {
    return next();
  }

  if (typeof req.flash === 'function') {
    req.flash('error', 'Bạn không có quyền truy cập vào khu vực này (Chỉ dành cho Giám đốc).');
  }
  return res.redirect('/dashboard');
}

module.exports = requireDirector;
