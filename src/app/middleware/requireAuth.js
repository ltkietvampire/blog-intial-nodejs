function requireAuth(req, res, next) {
  if (req.session && req.session.user && req.session.user._id) {
    return next();
  }

  return res.redirect('/login');
}

module.exports = requireAuth;
