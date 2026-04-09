const { isAdminPosition } = require('./roleUtils');

function requireAdmin(req, res, next) {
  const user = req.user;
  if (!user?._id) {
    return res.redirect('/login');
  }

  if (isAdminPosition(user)) {
    return next();
  }

  if (typeof req.flash === 'function') {
    req.flash('error', 'Bạn không có quyền truy cập vào khu vực này (Chỉ dành cho Admin).');
  }
  return res.redirect('/dashboard');
}

module.exports = requireAdmin;
