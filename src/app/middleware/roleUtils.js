function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const ROLE_VALUES = new Set(['employee', 'manager', 'director', 'admin']);

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
  const role = normalizeRole(getRoleValue(value));
  return role === 'manager' || role === 'director' || role === 'admin';
}

function isDirectorPosition(value) {
  const role = normalizeRole(getRoleValue(value));
  return role === 'director' || role === 'admin';
}

function isAdminPosition(value) {
  return normalizeRole(getRoleValue(value)) === 'admin';
}

module.exports = {
  normalizeText,
  normalizeRole,
  isEmployeePosition,
  isManagerPosition,
  isDirectorPosition,
  isAdminPosition,
};
