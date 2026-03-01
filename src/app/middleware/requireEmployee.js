const { isEmployeePosition } = require('./roleUtils');

function requireEmployee(req, res, next) {
  const user = req.session?.user;
  if (!user?._id) {
    return res.redirect('/login');
  }

  if (isEmployeePosition(user.position)) {
    return next();
  }

  if (typeof req.flash === 'function') {
    req.flash('error', 'This page is for employees only.');
  }
  return res.redirect('/');
}

module.exports = requireEmployee;
