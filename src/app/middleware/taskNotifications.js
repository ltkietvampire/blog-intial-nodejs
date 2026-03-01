const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const Distribution = require('../model/distribution');

dayjs.extend(customParseFormat);

const COMPLETE_STATUS = 'completed';
const LATE_STATUS = 'late';
const CHECKIN_WINDOW_MINUTES = 15;

function parseTaskDateTime(dateValue, timeValue) {
  const dateText = dayjs(dateValue).format('YYYY-MM-DD');
  const rawTime = String(timeValue || '').trim();
  if (!dayjs(dateText, 'YYYY-MM-DD', true).isValid() || !rawTime) {
    return null;
  }
  const parsed = dayjs(
    `${dateText} ${rawTime}`,
    ['YYYY-MM-DD HH:mm', 'YYYY-MM-DD HH:mm:ss'],
    true
  );
  return parsed.isValid() ? parsed : null;
}

function createNotification({ type, title, detail, taskName, priority }) {
  return {
    type,
    title,
    detail,
    taskName,
    link: '/my-task',
    tagClass:
      type === 'overdue'
        ? 'text-bg-danger'
        : type === 'late'
          ? 'text-bg-warning'
          : 'text-bg-primary',
    priority,
  };
}

async function taskNotifications(req, res, next) {
  res.locals.taskNotifications = { totalCount: 0, urgentCount: 0, items: [] };

  try {
    const userId = req.session?.user?._id;
    if (!userId) {
      return next();
    }

    const now = dayjs();
    const today = now.startOf('day');
    const tomorrow = today.add(1, 'day');

    const rows = await Distribution.find({ employeeID: userId })
      .populate({
        path: 'taskID',
        match: { task_status: { $ne: 'archived' } },
      })
      .sort({ assignedAt: -1 })
      .limit(120)
      .lean();

    const notifications = [];
    const dedupe = new Set();

    for (const row of rows) {
      const task = row.taskID;
      if (!task) continue;

      const status = String(row.status || '').toLowerCase();
      const isCompleted = status === COMPLETE_STATUS;
      const taskName = task.name_task || 'Task';
      const deadline = dayjs(task.deadline).startOf('day');
      const startAt = parseTaskDateTime(task.deadline || task.createdAt || now, task.dateStart);
      const endAt = parseTaskDateTime(task.deadline || task.createdAt || now, task.dateEnd || task.dateStart);
      const baseKey = String(row._id);
      const overdueByEndTime = !isCompleted && endAt && now.isAfter(endAt);
      const overdueByDate = !isCompleted && deadline.isValid() && deadline.isBefore(today, 'day');
      const isOverdue = Boolean(overdueByEndTime || overdueByDate);

      // Upcoming should not appear if this task is already overdue.
      if (!isCompleted && !isOverdue && deadline.isValid() && (deadline.isSame(today, 'day') || deadline.isSame(tomorrow, 'day'))) {
        const key = `${baseKey}:upcoming`;
        if (!dedupe.has(key)) {
          dedupe.add(key);
          notifications.push(
            createNotification({
              type: 'upcoming',
              title: deadline.isSame(today, 'day') ? 'Task due today' : 'Task due tomorrow',
              detail: `Due: ${deadline.format('DD/MM/YYYY')}`,
              taskName,
              priority: 3,
            })
          );
        }
      }

      const missedCheckIn =
        !isCompleted &&
        startAt &&
        status !== LATE_STATUS &&
        status !== 'checked_in' &&
        // Trigger late only after passing the first 15 minutes from dateStart.
        now.isAfter(startAt.add(CHECKIN_WINDOW_MINUTES, 'minute'));

      if (status === LATE_STATUS || missedCheckIn) {
        const key = `${baseKey}:late`;
        if (!dedupe.has(key)) {
          dedupe.add(key);
          notifications.push(
            createNotification({
              type: 'late',
              title: 'Late warning',
              detail: startAt ? `Start: ${startAt.format('HH:mm DD/MM/YYYY')}` : 'Late check-in detected',
              taskName,
              priority: 1,
            })
          );
        }
      }

      if (isOverdue) {
        const key = `${baseKey}:overdue`;
        if (!dedupe.has(key)) {
          dedupe.add(key);
          notifications.push(
            createNotification({
              type: 'overdue',
              title: 'Task not completed',
              detail: endAt
                ? `Past end time: ${endAt.format('HH:mm DD/MM/YYYY')}`
                : `Overdue: ${deadline.isValid() ? deadline.format('DD/MM/YYYY') : '--'}`,
              taskName,
              priority: 0,
            })
          );
        }
      }
    }

    notifications.sort((a, b) => a.priority - b.priority);
    const items = notifications.slice(0, 12);
    const urgentCount = notifications.filter((item) => item.type === 'overdue' || item.type === 'late').length;

    res.locals.taskNotifications = {
      totalCount: notifications.length,
      urgentCount,
      items,
    };
  } catch (error) {
    res.locals.taskNotifications = { totalCount: 0, urgentCount: 0, items: [] };
  }

  return next();
}

module.exports = taskNotifications;
