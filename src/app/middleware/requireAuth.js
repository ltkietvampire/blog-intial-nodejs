function requireAuth(req, res, next) {
  if (req.user?._id) {
    return next();
  }

  const wantsJson = req.xhr || (req.headers.accept || '').indexOf('json') > -1;
  if (wantsJson) {
      return res.status(401).json({ ok: false, error: 'Unauthorized: Missing or invalid token' });
  }

  return res.redirect('/login');
}

module.exports = requireAuth;
