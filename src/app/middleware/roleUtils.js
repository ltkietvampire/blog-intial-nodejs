function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function isEmployeePosition(position) {
  const normalized = normalizeText(position);
  return normalized.includes('nhan vien') || normalized.includes('employee') || normalized === 'staff';
}

function isManagerPosition(position) {
  return !isEmployeePosition(position);
}

module.exports = {
  normalizeText,
  isEmployeePosition,
  isManagerPosition,
};
