const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');

dayjs.extend(customParseFormat);

function toDateOnly(value) {
  if (!value) return null;
  // If it's already a Date object or ISO string from MongoDB, parse without strict mode first
  const raw = String(value).trim();
  // Try strict YYYY-MM-DD format first (form inputs)
  let parsed = dayjs(raw, 'YYYY-MM-DD', true);
  if (!parsed.isValid()) {
    // Fallback: parse as general date (handles Date objects, ISO strings from MongoDB)
    parsed = dayjs(value);
  }
  return parsed.isValid() ? parsed.startOf('day').toDate() : null;
}

function toMinuteOfDay(value) {
  const parsed = dayjs(String(value || '').trim(), 'HH:mm', true);
  if (!parsed.isValid()) {
    return NaN;
  }
  return parsed.hour() * 60 + parsed.minute();
}

function formatDate(value, format, fallback = '--') {
  const date = dayjs(value);
  if (!date.isValid()) {
    return fallback;
  }
  return date.format(format);
}

function toDateText(value, fallback = '--') {
  return formatDate(value, 'DD/MM/YYYY', fallback);
}

function toDateTimeText(value, options = {}) {
  const format = options.format || 'DD/MM/YYYY HH:mm';
  const fallback = Object.prototype.hasOwnProperty.call(options, 'fallback')
    ? options.fallback
    : '--';
  return formatDate(value, format, fallback);
}

function combineDateTime(dateKey, timeValue) {
  if (!dateKey || !timeValue) {
    return null;
  }

  const rawTime = String(timeValue).trim();
  const isDateValid = dayjs(String(dateKey).trim(), 'YYYY-MM-DD', true).isValid();
  if (!rawTime || !isDateValid) {
    return null;
  }

  const parsed = dayjs(
    `${dateKey} ${rawTime}`,
    ['YYYY-MM-DD HH:mm', 'YYYY-MM-DD HH:mm:ss'],
    true
  );
  if (!parsed.isValid()) {
    return null;
  }
  return parsed;
}

function toTaskDateTime(dateValue, timeValue) {
  const date = dayjs(dateValue);
  if (!date.isValid()) {
    return null;
  }
  return combineDateTime(date.format('YYYY-MM-DD'), timeValue);
}

module.exports = {
  toDateOnly,
  toMinuteOfDay,
  toDateText,
  toDateTimeText,
  combineDateTime,
  toTaskDateTime,
};
