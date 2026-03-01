const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const User = require('../model/user');
const Distribution = require('../model/distribution');
const { isEmployeePosition } = require('../middleware/roleUtils');

dayjs.extend(customParseFormat);

const COMPLETE_STATUS = 'completed';
const LATE_STATUS = 'late';

function toTaskDateTime(dateValue, timeValue) {
  const date = dayjs(dateValue).format('YYYY-MM-DD');
  const rawTime = String(timeValue || '').trim();
  if (!rawTime || !dayjs(date, 'YYYY-MM-DD', true).isValid()) {
    return null;
  }

  const parsed = dayjs(
    `${date} ${rawTime}`,
    ['YYYY-MM-DD HH:mm', 'YYYY-MM-DD HH:mm:ss'],
    true
  );
  return parsed.isValid() ? parsed : null;
}

class DashboardController {
  async index(req, res) {
    try {
      const userId = req.session?.user?._id;
      if (!userId) {
        return res.redirect('/login');
      }

      const user = await User.findById(userId).lean();
      if (!user) {
        return res.redirect('/login');
      }

      if (!isEmployeePosition(user.position)) {
        return res.redirect('/');
      }

      const now = dayjs();
      const today = now.startOf('day');
      const weekStart = now.startOf('week').add(1, 'day');
      const weekEnd = weekStart.add(7, 'day');

      const rows = await Distribution.find({ employeeID: userId })
        .populate({
          path: 'taskID',
          match: { task_status: { $ne: 'archived' } },
        })
        .sort({ assignedAt: -1 })
        .lean();

      const stats = {
        assigned: 0,
        today: 0,
        upcoming: 0,
        overdue: 0,
        late: 0,
        completedWeek: 0,
        weeklyHours: 0,
      };

      const urgentRows = [];

      for (const row of rows) {
        const task = row.taskID;
        if (!task) continue;

        const status = String(row.status || '').toLowerCase();
        const isCompleted = status === COMPLETE_STATUS;
        const isLate = status === LATE_STATUS;
        const deadline = dayjs(task.deadline).startOf('day');
        const endAt = toTaskDateTime(task.deadline || task.createdAt || now.toDate(), task.dateEnd || task.dateStart);
        const overdueByDate = !isCompleted && deadline.isValid() && deadline.isBefore(today, 'day');
        const overdueByTime = !isCompleted && endAt && now.isAfter(endAt);
        const isOverdue = overdueByDate || overdueByTime;

        stats.assigned += 1;
        if (isLate) stats.late += 1;
        if (!isCompleted && deadline.isValid() && deadline.isSame(today, 'day')) stats.today += 1;
        if (!isCompleted && deadline.isValid() && deadline.isAfter(today, 'day')) stats.upcoming += 1;
        if (isOverdue) stats.overdue += 1;

        if (row.completedAt) {
          const completedAt = dayjs(row.completedAt);
          if (completedAt.isValid() && !completedAt.isBefore(weekStart) && completedAt.isBefore(weekEnd)) {
            stats.completedWeek += 1;
            const hours = Number(task.estimated_total_hours || 0);
            if (Number.isFinite(hours) && hours > 0) {
              stats.weeklyHours += hours;
            }
          }
        }

        if (isOverdue || isLate || (!isCompleted && deadline.isValid() && deadline.isSame(today, 'day'))) {
          urgentRows.push({
            taskName: task.name_task || 'No name',
            deadlineText: deadline.isValid() ? deadline.format('DD/MM/YYYY') : '--',
            timeText: `${task.dateStart || '--:--'} - ${task.dateEnd || '--:--'}`,
            statusText: isOverdue ? 'Overdue' : (isLate ? 'Late' : 'Today'),
            badgeClass: isOverdue ? 'text-bg-danger' : (isLate ? 'text-bg-warning' : 'text-bg-primary'),
          });
        }
      }

      return res.render('dashboard-employee', {
        user,
        stats: {
          ...stats,
          weeklyHours: Number(stats.weeklyHours.toFixed(2)),
        },
        urgentTasks: urgentRows.slice(0, 8),
        nowText: now.format('DD/MM/YYYY HH:mm:ss'),
      });
    } catch (error) {
      if (typeof req.flash === 'function') {
        req.flash('error', 'Unable to load employee dashboard.');
      }
      return res.redirect('/auth');
    }
  }
}

module.exports = new DashboardController();
