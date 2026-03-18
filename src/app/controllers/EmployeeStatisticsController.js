const User = require('../model/user');
const Distribution = require('../model/distribution');
const { Parser } = require('@json2csv/plainjs');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const { isEmployeePosition } = require('../middleware/roleUtils');
const { toTaskDateTime } = require('../../util/dateTime');
const { getStartOfWeek, getStartOfMonth, getStartOfQuarter } = require('../../util/timePeriods');
const asyncHandler = require('express-async-handler');

dayjs.extend(customParseFormat);

const STAT_PERIODS = new Set(['all', 'week', 'month', 'quarter']);
const COMPLETE_STATUS = 'completed';
const CHECKED_IN_STATUS = 'checked_in';
const LATE_WINDOW_MINUTES = 15;

function normalizeStatPeriod(value) {
  const period = String(value || 'all').toLowerCase();
  return STAT_PERIODS.has(period) ? period : 'all';
}

function getPeriodRange(period) {
  const now = new Date();
  if (period === 'week') {
    return {
      start: getStartOfWeek(now),
      end: now,
      label: 'This week',
    };
  }
  if (period === 'month') {
    return {
      start: getStartOfMonth(now),
      end: now,
      label: 'This month',
    };
  }
  if (period === 'quarter') {
    return {
      start: getStartOfQuarter(now),
      end: now,
      label: 'This quarter',
    };
  }
  return {
    start: null,
    end: null,
    label: 'All time',
  };
}

class EmployeeStatisticsController {
  constructor() {
    this.statistics = this.statistics.bind(this);
    this.statisticsExport = this.statisticsExport.bind(this);
  }

  async buildStatistics(period) {
    const normalizedPeriod = normalizeStatPeriod(period);
    const periodRange = getPeriodRange(normalizedPeriod);
    const distributionFilter = {};
    if (periodRange.start && periodRange.end) {
      distributionFilter.assignedAt = {
        $gte: periodRange.start,
        $lte: periodRange.end,
      };
    }

    const [users, distributions] = await Promise.all([
      User.find({}).lean(),
      Distribution.find(distributionFilter)
        .populate('employeeID')
        .populate('taskID')
        .lean(),
    ]);

    const employees = users.filter((user) => isEmployeePosition(user));
    const reportByUser = new Map();
    const skippedStatuses = new Set(['skipped', 'missed', 'ignored', 'abandoned']);
    const lateStatuses = new Set(['late', 'late_checkin']);
    const now = dayjs();
    const today = now.startOf('day');

    for (const user of employees) {
      reportByUser.set(String(user._id), {
        ...user,
        assignedTasks: 0,
        workHours: 0,
        lateCount: 0,
        lateMinutes: 0,
        skippedCount: 0,
      });
    }

    for (const record of distributions) {
      if (!record.employeeID || !record.taskID) {
        continue;
      }

      const employeeId = String(record.employeeID._id || record.employeeID);
      const row = reportByUser.get(employeeId);

      if (!row) {
        continue;
      }

      row.assignedTasks += 1;
      const estimatedHours = Number(record.taskID.estimated_total_hours || 0);
      row.workHours += Number.isFinite(estimatedHours) ? estimatedHours : 0;

      const status = String(record.status || '').toLowerCase();
      const isCompleted = status === COMPLETE_STATUS;

      const baseDate = record.taskID.deadline || record.taskID.createdAt || record.assignedAt || now.toDate();
      const deadline = dayjs(record.taskID.deadline).startOf('day');
      const startAt = toTaskDateTime(baseDate, record.taskID.dateStart);
      const endAt = toTaskDateTime(baseDate, record.taskID.dateEnd || record.taskID.dateStart);
      const checkInAt = dayjs(record.checkInAt);
      const hasCheckedIn = checkInAt.isValid();
      const hasTaskWindow = Boolean(startAt && endAt);

      const overdueByEndTime = !isCompleted && endAt && now.isAfter(endAt);
      const overdueByDate = !isCompleted && deadline.isValid() && deadline.isBefore(today, 'day');
      const checkInAfterEnd = hasCheckedIn && endAt && checkInAt.isAfter(endAt);
      const isSkipped = skippedStatuses.has(status) || overdueByEndTime || overdueByDate || checkInAfterEnd;

      if (isSkipped) {
        row.skippedCount += 1;
        continue;
      }

      let lateMinutesForTask = 0;

      if (hasTaskWindow) {
        if (hasCheckedIn && checkInAt.isAfter(startAt)) {
          lateMinutesForTask = checkInAt.diff(startAt, 'minute');
        } else if (!hasCheckedIn && !isCompleted && now.isAfter(startAt)) {
          const lateEnd = now.isAfter(endAt) ? endAt : now;
          if (lateEnd.isAfter(startAt)) {
            lateMinutesForTask = lateEnd.diff(startAt, 'minute');
          }
        }
      }

      const missedCheckIn = Boolean(
        !isCompleted &&
        startAt &&
        status !== CHECKED_IN_STATUS &&
        status !== COMPLETE_STATUS &&
        !hasCheckedIn &&
        now.isAfter(startAt.add(LATE_WINDOW_MINUTES, 'minute'))
      );

      const isLate = lateMinutesForTask > 0 || lateStatuses.has(status) || missedCheckIn;

      if (isLate) {
        row.lateCount += 1;
        row.lateMinutes += lateMinutesForTask;
      }
    }

    const report = Array.from(reportByUser.values())
      .map((row) => {
        const lateHours = Math.floor(row.lateMinutes / 60);
        const lateRemainMinutes = row.lateMinutes % 60;

        return {
          ...row,
          workHours: Number(row.workHours.toFixed(2)),
          lateText: row.lateMinutes > 0 ? `${lateHours}h ${lateRemainMinutes}m` : '0m',
        };
      })
      .sort((a, b) => b.workHours - a.workHours);

    const totals = report.reduce((acc, item) => {
      acc.workHours += item.workHours;
      acc.assignedTasks += item.assignedTasks;
      acc.lateCount += item.lateCount;
      acc.skippedCount += item.skippedCount;
      return acc;
    }, { workHours: 0, assignedTasks: 0, lateCount: 0, skippedCount: 0 });

    const periodOptions = [
      { value: 'all', label: 'All time', selected: normalizedPeriod === 'all' },
      { value: 'week', label: 'This week', selected: normalizedPeriod === 'week' },
      { value: 'month', label: 'This month', selected: normalizedPeriod === 'month' },
      { value: 'quarter', label: 'This quarter', selected: normalizedPeriod === 'quarter' },
    ];

    return {
      report,
      totals: {
        ...totals,
        workHours: Number(totals.workHours.toFixed(2)),
      },
      period: normalizedPeriod,
      periodLabel: periodRange.label,
      periodOptions,
    };
  }

  statistics = asyncHandler(async (req, res) => {
      const statData = await this.buildStatistics(req.query.period);
      res.render('employee-statistics', {
        report: statData.report,
        totals: statData.totals,
        periodLabel: statData.periodLabel,
        periodOptions: statData.periodOptions,
        selectedPeriod: statData.period,
        generatedAt: new Date().toLocaleString('vi-VN'),
      });
  });

  statisticsExport = asyncHandler(async (req, res) => {
      const statData = await this.buildStatistics(req.query.period);
      const rows = statData.report;
      const fields = [
        { label: 'Employee', value: 'name' },
        { label: 'Email', value: 'email' },
        { label: 'Role', value: 'role' },
        { label: 'Position', value: 'position' },
        { label: 'Assigned tasks', value: 'assignedTasks' },
        { label: 'Total work hours', value: 'workHours' },
        { label: 'Late time', value: 'lateText' },
        { label: 'Late count', value: 'lateCount' },
        { label: 'Skipped tasks', value: 'skippedCount' },
        { label: 'Max work hours/day', value: 'maxtime' },
      ];
      const parser = new Parser({ fields });
      const csv = `\uFEFF${parser.parse(rows)}`;
      const dateTag = new Date().toISOString().slice(0, 10);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="employee-statistics-${statData.period}-${dateTag}.csv"`);
      return res.send(csv);
  });
}

module.exports = new EmployeeStatisticsController();
