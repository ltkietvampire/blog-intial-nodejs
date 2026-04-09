const Salary = require('../model/salary');
const Distribution = require('../model/distribution');
const User = require('../model/user');
const Announcement = require('../model/announcement');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const { combineDateTime } = require('../../util/dateTime');
const asyncHandler = require('express-async-handler');
const { isManagerPosition, isDirectorPosition } = require('../middleware/roleUtils');

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
  index = asyncHandler(async (req, res) => {
    const month = req.query.month ? Number(req.query.month) : dayjs().month() + 1;
    const year = req.query.year ? Number(req.query.year) : dayjs().year();
    const targetDate = dayjs(`${year}-${month}-01`);
    
    if (!targetDate.isValid()) {
      return res.redirect('/salary');
    }

    const start = targetDate.startOf('month').toDate();
    const end = targetDate.endOf('month').toDate();

    const [employees, distributions, existing] = await Promise.all([
      User.find({ role: 'employee' }).lean(),
      Distribution.find({
        checkInAt: { $gte: start, $lte: end },
      }).populate('taskID').lean(),
      Salary.find({ month, year }).populate('managerApprovedBy directorApprovedBy').lean(),
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
          bonus: toFixedNumber(record.bonus || 0, 2),
          deduction: toFixedNumber(record.deduction || 0, 2),
          totalPay: toFixedNumber(record.totalPay, 2),
          status: record.status || 'draft',
          rejectReason: record.rejectReason,
          hasRecord: true,
          _id: record._id,
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

    const currentUser = req.user;
    const isManager = isManagerPosition(currentUser);
    const isDirector = isDirectorPosition(currentUser);
    
    // Check if there are any records in specific statuses
    const hasDrafts = existing.some(r => r.status === 'draft');
    const hasPending = existing.some(r => r.status === 'pending');
    
    // Check for rejections
    const rejectReasons = [...new Set(existing.filter(r => r.status === 'draft' && r.rejectReason).map(r => r.rejectReason))];
    const generalRejectReason = rejectReasons.length > 0 ? rejectReasons[0] : null;

    res.render('salary', {
      rows,
      totals: {
        totalHours: toFixedNumber(totals.totalHours, 2),
        totalPay: toFixedNumber(totals.totalPay, 2),
      },
      monthInput: month,
      yearInput: year,
      periodLabel: `Month ${month} / ${year}`,
      hasRecords: existing.length > 0,
      isManager,
      isDirector,
      canManagerApprove: isManager && hasDrafts,
      canDirectorApprove: isDirector && hasPending,
      generalRejectReason
    });
  });

  generate = asyncHandler(async (req, res) => {
    const month = Number(req.body.month);
    const year = Number(req.body.year);

    if (!month || !year) {
      req.flash('error', 'Invalid month or year.');
      return res.redirect('/salary');
    }

    const targetDate = dayjs(`${year}-${month}-01`);
    const start = targetDate.startOf('month').toDate();
    const end = targetDate.endOf('month').toDate();

    const [employees, distributions, existing] = await Promise.all([
      User.find({ role: 'employee' }).lean(),
      Distribution.find({
        checkInAt: { $gte: start, $lte: end },
      }).populate('taskID').lean(),
      Salary.find({ month, year }).lean(),
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
          month,
          year,
          totalHours,
          hourlyRate,
          bonus: 0,
          deduction: 0,
          totalPay,
          status: 'draft',
        };
      });

    if (!newRecords.length) {
      req.flash('error', 'Payroll for this month is already generated.');
      return res.redirect(`/salary?month=${month}&year=${year}`);
    }

    await Salary.insertMany(newRecords);
    req.flash('success', `Generated payroll for ${newRecords.length} employee(s).`);
    return res.redirect(`/salary?month=${month}&year=${year}`);
  });

  managerApprove = asyncHandler(async (req, res) => {
    const month = Number(req.body.month);
    const year = Number(req.body.year);

    if (!isManagerPosition(req.user)) {
      req.flash('error', 'Unauthorized access.');
      return res.redirect(`/salary?month=${month}&year=${year}`);
    }

    const result = await Salary.updateMany(
      { month, year, status: 'draft' },
      { 
        $set: { 
          status: 'pending',
          managerApprovedBy: req.user._id,
          managerApprovedAt: new Date()
        } 
      }
    );

    req.flash('success', `Manager approved ${result.modifiedCount} salary records.`);
    res.redirect(`/salary?month=${month}&year=${year}`);
  });

  directorApprove = asyncHandler(async (req, res) => {
    const month = Number(req.body.month);
    const year = Number(req.body.year);

    if (!isDirectorPosition(req.user)) {
      req.flash('error', 'Unauthorized access.');
      return res.redirect(`/salary?month=${month}&year=${year}`);
    }

    const result = await Salary.updateMany(
      { month, year, status: 'pending' },
      { 
        $set: { 
          status: 'paid',
          directorApprovedBy: req.user._id,
          directorApprovedAt: new Date()
        } 
      }
    );

    req.flash('success', `Director approved ${result.modifiedCount} salary records to Paid.`);
    res.redirect(`/salary?month=${month}&year=${year}`);
  });

  directorReject = asyncHandler(async (req, res) => {
    const month = Number(req.body.month);
    const year = Number(req.body.year);
    const rejectReason = req.body.rejectReason || 'No reason provided';

    if (!isDirectorPosition(req.user)) {
      req.flash('error', 'Unauthorized access.');
      return res.redirect(`/salary?month=${month}&year=${year}`);
    }

    const result = await Salary.updateMany(
      { month, year, status: 'pending' },
      { 
        $set: { 
          status: 'draft',
          rejectedBy: req.user._id,
          rejectedAt: new Date(),
          rejectReason: rejectReason
        } 
      }
    );

    if (result.modifiedCount > 0) {
      await Announcement.create({
        title: '[ACTION REQUIRED] Payroll Rejected',
        message: `Payroll for Month ${month}/${year} was rejected by Director. Reason: ${rejectReason}.`,
        targetRole: 'manager',
        createdBy: req.user._id,
      });
    }

    req.flash('error', `Director rejected ${result.modifiedCount} salary records back to Draft status.`);
    res.redirect(`/salary?month=${month}&year=${year}`);
  });

  adjustPay = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const bonus = Number(req.body.bonus) || 0;
    const deduction = Number(req.body.deduction) || 0;

    if (!isManagerPosition(req.user)) {
      req.flash('error', 'Unauthorized access.');
      return res.redirect('back');
    }

    const salary = await Salary.findById(id);
    if (!salary) {
      req.flash('error', 'Salary record not found.');
      return res.redirect('back');
    }

    if (salary.status !== 'draft') {
      req.flash('error', 'Cannot adjust salary unless it is in draft status.');
      return res.redirect('back');
    }

    salary.bonus = bonus;
    salary.deduction = deduction;
    
    // totalPay = (totalHours * hourlyRate) + bonus - deduction
    const basePay = (salary.totalHours || 0) * (salary.hourlyRate || 0);
    salary.totalPay = Math.max(0, basePay + bonus - deduction);

    await salary.save();
    req.flash('success', 'Successfully updated bonus, deduction and total pay.');
    
    return res.redirect(`/salary?month=${salary.month}&year=${salary.year}`);
  });
}

module.exports = new SalaryController();
