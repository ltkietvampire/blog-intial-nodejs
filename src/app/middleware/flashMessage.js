function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function flashMessage(req, res, next) {
  req.flash = (type, message) => {
    const key = type === 'success' ? 'success' : 'error';
    if (!req.session.flash) {
      req.session.flash = { success: [], error: [] };
    }
    if (!Array.isArray(req.session.flash.success)) {
      req.session.flash.success = [];
    }
    if (!Array.isArray(req.session.flash.error)) {
      req.session.flash.error = [];
    }
    req.session.flash[key].push(String(message || '').trim());
  };

  const flash = req.session.flash || {};
  res.locals.flash = {
    success: toArray(flash.success).filter(Boolean),
    error: toArray(flash.error).filter(Boolean),
  };
  delete req.session.flash;

  next();
}

module.exports = flashMessage;
