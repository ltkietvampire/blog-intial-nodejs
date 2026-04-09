function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function flashMessage(req, res, next) {
  const flashData = req.cookies.flash ? JSON.parse(req.cookies.flash) : { success: [], error: [] };
  
  req.flash = (type, message) => {
    const key = type === 'success' ? 'success' : 'error';
    flashData[key].push(String(message || '').trim());
    res.cookie('flash', JSON.stringify(flashData), { httpOnly: true, path: '/' });
  };

  res.locals.flash = {
    success: toArray(flashData.success).filter(Boolean),
    error: toArray(flashData.error).filter(Boolean),
  };
  
  if (req.cookies.flash) {
      res.clearCookie('flash', { path: '/' });
  }

  next();
}

module.exports = flashMessage;
