const dayjs = require('dayjs');
const isoWeek = require('dayjs/plugin/isoWeek');
const quarterOfYear = require('dayjs/plugin/quarterOfYear');

dayjs.extend(isoWeek);
dayjs.extend(quarterOfYear);

function getStartOfWeek(date) {
  return dayjs(date).isoWeekday(1).startOf('day').toDate();
}

function getEndOfWeek(date) {
  return dayjs(date).isoWeekday(7).endOf('day').toDate();
}

function getStartOfMonth(date) {
  return dayjs(date).startOf('month').startOf('day').toDate();
}

function getStartOfQuarter(date) {
  return dayjs(date).startOf('quarter').startOf('day').toDate();
}

module.exports = {
  getStartOfWeek,
  getEndOfWeek,
  getStartOfMonth,
  getStartOfQuarter,
};
