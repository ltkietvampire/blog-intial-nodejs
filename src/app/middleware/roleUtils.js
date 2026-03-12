function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const ROLE_VALUES = new Set(['employee', 'manager']);
const MANAGER_KEYWORDS = [
  'manager',
  'quan ly',
  'truong nhom',
  'supervisor',
  'lead',
  'admin',
  'director',
  'giam doc',
  'owner',
  'ceo',
];

function normalizeRole(value) {
  const role = normalizeText(value);
  return ROLE_VALUES.has(role) ? role : '';
}

function parseIdentity(value) {
  if (value && typeof value === 'object') {
    return {
      role: normalizeRole(value.role),
    };
  }

  return {
    role: normalizeRole(value),
  };
}

function inferRoleFromPosition(position) {
  const normalized = normalizeText(position);
  if (MANAGER_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return 'manager';
  }
  return 'employee';
}

function resolveRole(value) {
  return parseIdentity(value).role;
}

function isEmployeePosition(value) {
  return resolveRole(value) === 'employee';
}

function isManagerPosition(value) {
  return resolveRole(value) === 'manager';
}

module.exports = {
  normalizeText,
  normalizeRole,
  inferRoleFromPosition,
  resolveRole,
  isEmployeePosition,
  isManagerPosition,
};
