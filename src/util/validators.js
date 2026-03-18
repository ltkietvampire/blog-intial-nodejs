function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isValidPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15;
}

module.exports = {
  normalizeEmail,
  isValidPhone,
};
