function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const ROLE_VALUES = new Set(['employee', 'manager']);

function normalizeRole(value) {
  const role = normalizeText(value);
  return ROLE_VALUES.has(role) ? role : '';
}

function getRoleValue(value) {
  if (value && typeof value === 'object') {
    return value.role;
  }
  return value;
}

function isEmployeePosition(value) {
  return normalizeRole(getRoleValue(value)) === 'employee';
}

function isManagerPosition(value) {
  return normalizeRole(getRoleValue(value)) === 'manager';
}

module.exports = {
  normalizeText,
  normalizeRole,
  isEmployeePosition,
  isManagerPosition,
};
