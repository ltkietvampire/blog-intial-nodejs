const Salary = require('../model/salary');
const Distribution = require('../model/distribution');
const User = require('../model/user');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const { combineDateTime } = require('../../until/dateTime');
const { getStartOfWeek, getEndOfWeek } = require('../../until/timePeriods');

dayjs.extend(customParseFormat);

function toFixedNumber(value, digits = 2) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return 0;
  }
  return Number(num.toFixed(digits));
}

function calcTaskHours(task, distribution) {
  if (!task) {
    return 0;
  }

  const checkInAt = dayjs(distribution.checkInAt);
  const baseDateKey = checkInAt.isValid()
    ? checkInAt.format('YYYY-MM-DD')
    : dayjs(task.deadline || task.createdAt || new Date()).format('YYYY-MM-DD');

  const startAt = combineDateTime(baseDateKey, task.dateStart);
  const endAt = combineDateTime(baseDateKey, task.dateEnd || task.dateStart);
  if (startAt && endAt && endAt.isAfter(startAt)) {
    const hours = endAt.diff(startAt, 'minute') / 60;
    return toFixedNumber(hours, 2);
  }

  const estimated = Number(task.estimated_total_hours || 0);
  if (Number.isFinite(estimated) && estimated > 0) {
    return toFixedNumber(estimated, 2);
  }

  return 0;
}

class SalaryController {
  async index(req, res) {
    const dateParam = String(req.query.date || '').trim();
    const targetDate = dayjs(dateParam || new Date());
    const start = getStartOfWeek(targetDate.toDate());
    const end = getEndOfWeek(targetDate.toDate());

    const [employees, distributions, existing] = await Promise.all([
      User.find({ role: 'employee' }).lean(),
      Distribution.find({
        checkInAt: { $gte: start, $lte: end },
      })
        .populate('taskID')
        .lean(),
      Salary.find({ periodStart: start, periodEnd: end }).lean(),
    ]);

    const hoursByEmployee = new Map();
    for (const row of distributions) {
      if (!row.employeeID || !row.checkInAt) {
        continue;
      }
      const hours = calcTaskHours(row.taskID, row);
      if (hours <= 0) {
        continue;
      }
      const key = String(row.employeeID);
      hoursByEmployee.set(key, (hoursByEmployee.get(key) || 0) + hours);
    }

    const existingByEmployee = new Map();
    existing.forEach((record) => {
      existingByEmployee.set(String(record.employeeID), record);
    });

    const rows = employees.map((employee) => {
      const employeeId = String(employee._id);
      const record = existingByEmployee.get(employeeId);
      const computedHours = toFixedNumber(hoursByEmployee.get(employeeId) || 0, 2);
      const hourlyRate = toFixedNumber(employee.hourlyRate || 0, 2);
      const totalPay = toFixedNumber(computedHours * hourlyRate, 2);

      if (record) {
        return {
          employee,
          totalHours: toFixedNumber(record.totalHours, 2),
          hourlyRate: toFixedNumber(record.hourlyRate, 2),
          totalPay: toFixedNumber(record.totalPay, 2),
          status: record.status || 'pending',
          hasRecord: true,
        };
      }

      return {
        employee,
        totalHours: computedHours,
        hourlyRate,
        totalPay,
        status: 'not_generated',
        hasRecord: false,
      };
    });

    const totals = rows.reduce(
      (acc, row) => {
        acc.totalHours += row.totalHours;
        acc.totalPay += row.totalPay;
        return acc;
      },
      { totalHours: 0, totalPay: 0 }
    );

    res.render('salary', {
      rows,
      totals: {
        totalHours: toFixedNumber(totals.totalHours, 2),
        totalPay: toFixedNumber(totals.totalPay, 2),
      },
      dateInput: targetDate.isValid() ? targetDate.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
      periodStartISO: dayjs(start).format('YYYY-MM-DD'),
      periodEndISO: dayjs(end).format('YYYY-MM-DD'),
      periodLabel: `${dayjs(start).format('DD/MM/YYYY')} - ${dayjs(end).format('DD/MM/YYYY')}`,
      hasRecords: existing.length > 0,
    });
  }

  async generate(req, res) {
    const periodStart = dayjs(String(req.body.periodStart || '').trim());
    const periodEnd = dayjs(String(req.body.periodEnd || '').trim());

    if (!periodStart.isValid() || !periodEnd.isValid()) {
      req.flash('error', 'Invalid payroll period.');
      return res.redirect('/salary');
    }

    const start = periodStart.startOf('day').toDate();
    const end = periodEnd.endOf('day').toDate();

    const [employees, distributions, existing] = await Promise.all([
      User.find({ role: 'employee' }).lean(),
      Distribution.find({
        checkInAt: { $gte: start, $lte: end },
      })
        .populate('taskID')
        .lean(),
      Salary.find({ periodStart: start, periodEnd: end }).lean(),
    ]);

    const existingIds = new Set(existing.map((row) => String(row.employeeID)));

    const hoursByEmployee = new Map();
    for (const row of distributions) {
      if (!row.employeeID || !row.checkInAt) {
        continue;
      }
      const hours = calcTaskHours(row.taskID, row);
      if (hours <= 0) {
        continue;
      }
      const key = String(row.employeeID);
      hoursByEmployee.set(key, (hoursByEmployee.get(key) || 0) + hours);
    }

    const newRecords = employees
      .filter((employee) => !existingIds.has(String(employee._id)))
      .map((employee) => {
        const totalHours = toFixedNumber(hoursByEmployee.get(String(employee._id)) || 0, 2);
        const hourlyRate = toFixedNumber(employee.hourlyRate || 0, 2);
        const totalPay = toFixedNumber(totalHours * hourlyRate, 2);

        return {
          employeeID: employee._id,
          periodStart: start,
          periodEnd: end,
          totalHours,
          hourlyRate,
          totalPay,
          status: 'pending',
        };
      });

    if (!newRecords.length) {
      req.flash('error', 'Payroll for this week is already generated.');
      return res.redirect(`/salary?date=${periodStart.format('YYYY-MM-DD')}`);
    }

    await Salary.insertMany(newRecords);
    req.flash('success', `Generated payroll for ${newRecords.length} employee(s).`);
    return res.redirect(`/salary?date=${periodStart.format('YYYY-MM-DD')}`);
  }
}

module.exports = new SalaryController();
