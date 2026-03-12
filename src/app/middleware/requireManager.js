const { isManagerPosition } = require('./roleUtils');

function requireManager(req, res, next) {
  const user = req.session?.user;
  if (!user?._id) {
    return res.redirect('/login');
  }

  if (isManagerPosition(user)) {
    return next();
  }

  if (typeof req.flash === 'function') {
    req.flash('error', 'You do not have permission to access the management area.');
  }
  return res.redirect('/dashboard');
}

module.exports = requireManager;
