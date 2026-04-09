const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const { toMinuteOfDay } = require('./dateTime');

dayjs.extend(customParseFormat);

const RECURRENCE_TYPES = new Set(['none', 'daily', 'weekly', 'monthly']);
const RECURRENCE_LABELS = {
  none: 'No recurrence',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};
const TASK_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
};

function normalizeRecurrence(value) {
  const recurrence = String(value || 'none').toLowerCase();
  return RECURRENCE_TYPES.has(recurrence) ? recurrence : 'none';
}

function toPositiveInt(value, fallback = 1) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
}

function normalizeTaskStatus(value) {
  const status = String(value || TASK_STATUS.ACTIVE).toLowerCase();
  if (status === TASK_STATUS.COMPLETED || status === TASK_STATUS.ARCHIVED) {
    return status;
  }
  return TASK_STATUS.ACTIVE;
}

function getRecurrenceLabel(value) {
  const recurrence = normalizeRecurrence(value);
  return RECURRENCE_LABELS[recurrence] || RECURRENCE_LABELS.none;
}

function startOfToday() {
  return dayjs().startOf('day').toDate();
}

function toPriority(value, fallback = 3) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(5, Math.max(1, parsed));
}

function toDayStart(value) {
  const parsed = dayjs(value);
  if (!parsed.isValid()) {
    return null;
  }
  return parsed.startOf('day');
}

function hasTimeOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

function occursOnDate(taskMeta, date, holidaysArr = []) {
  if (!taskMeta || !taskMeta.startDate || !date) {
    return false;
  }
  if (holidaysArr.includes(date.format('DD/MM'))) {
    return false;
  }
  if (date.isBefore(taskMeta.startDate, 'day')) {
    return false;
  }

  const recurrence = taskMeta.recurrenceType;
  if (recurrence === 'daily') {
    return true;
  }
  if (recurrence === 'weekly') {
    const diffDays = date.diff(taskMeta.startDate, 'day');
    return diffDays % 7 === 0;
  }
  if (recurrence === 'monthly') {
    return date.date() === taskMeta.startDate.date();
  }

  return date.isSame(taskMeta.startDate, 'day');
}

function getTaskScheduleMeta(task) {
  if (!task) {
    return null;
  }

  const startMinutes = toMinuteOfDay(task.dateStart);
  const endMinutes = toMinuteOfDay(task.dateEnd || task.dateStart);
  const startDate = toDayStart(task.deadline || task.createdAt);
  if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes) || endMinutes <= startMinutes || !startDate) {
    return null;
  }

  return {
    startMinutes,
    endMinutes,
    startDate,
    recurrenceType: normalizeRecurrence(task.recurrence_type),
  };
}

function findFirstScheduleConflictDate(taskA, taskB, horizonDays = 365, holidaysArr = []) {
  const metaA = getTaskScheduleMeta(taskA);
  const metaB = getTaskScheduleMeta(taskB);
  if (!metaA || !metaB) {
    return null;
  }

  if (!hasTimeOverlap(metaA.startMinutes, metaA.endMinutes, metaB.startMinutes, metaB.endMinutes)) {
    return null;
  }

  let cursor = metaA.startDate.isAfter(metaB.startDate, 'day') ? metaA.startDate : metaB.startDate;
  for (let i = 0; i <= horizonDays; i++) {
    const date = cursor.add(i, 'day');
    if (occursOnDate(metaA, date, holidaysArr) && occursOnDate(metaB, date, holidaysArr)) {
      return date;
    }
  }

  return null;
}

module.exports = {
  TASK_STATUS,
  normalizeRecurrence,
  toPositiveInt,
  normalizeTaskStatus,
  getRecurrenceLabel,
  startOfToday,
  toPriority,
  getTaskScheduleMeta,
  findFirstScheduleConflictDate,
};
