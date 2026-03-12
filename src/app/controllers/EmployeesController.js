const User = require('../model/user')
const bcrypt = require("bcrypt");
const Distribution = require('../model/distribution')
const { Parser } = require('@json2csv/plainjs');
const { z } = require('zod');
const {multipleMongooseToObject} = require('../../until/mongoose')
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const { isEmployeePosition, normalizeRole } = require('../middleware/roleUtils');
const { isValidPhone } = require('../../until/validators');
const { toTaskDateTime } = require('../../until/dateTime');
const { getStartOfWeek, getStartOfMonth, getStartOfQuarter } = require('../../until/timePeriods');

dayjs.extend(customParseFormat);

const saltRound = 10
const USER_STATUS_VALUES = ['status-active', 'status-busy', 'status-off'];
const USER_STATUSES = new Set(USER_STATUS_VALUES);
const USER_ROLE_VALUES = ['employee', 'manager'];
const STAT_PERIODS = new Set(['all', 'week', 'month', 'quarter']);
const COMPLETE_STATUS = 'completed';
const CHECKED_IN_STATUS = 'checked_in';
const LATE_WINDOW_MINUTES = 15;

function normalizeStatus(value) {
    const status = String(value || '').trim();
    return USER_STATUSES.has(status) ? status : 'status-active';
}

function clampMaxTime(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return 8;
    }
    return Math.min(8, Math.max(0, parsed));
}

function clampHourlyRate(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return 0;
    }
    return Math.max(0, parsed);
}

function normalizeStatPeriod(value) {
    const period = String(value || 'all').toLowerCase();
    return STAT_PERIODS.has(period) ? period : 'all';
}

const emailSchema = z.string().trim().email().transform((value) => value.toLowerCase());
const phoneSchema = z.string().trim().refine(isValidPhone, {
    message: 'Invalid phone number',
});

const employeeCreateSchema = z.object({
    name: z.string().trim().min(1),
    role: z.preprocess(
        (value) => String(value || '').trim().toLowerCase(),
        z.enum(USER_ROLE_VALUES)
    ),
    position: z.string().trim().min(1),
    hourlyRate: z.coerce.number().min(0).optional(),
    email: emailSchema,
    password: z.string().min(6),
    SDT: phoneSchema,
    maxtime: z.coerce.number().optional(),
    trangthai: z.preprocess(
        (value) => String(value || '').trim(),
        z.enum(USER_STATUS_VALUES).optional()
    ),
});

const employeeUpdateSchema = z.object({
    name: z.string().trim().min(1).optional(),
    role: z.preprocess(
        (value) => String(value || '').trim().toLowerCase(),
        z.enum(USER_ROLE_VALUES).optional()
    ),
    position: z.string().trim().min(1).optional(),
    hourlyRate: z.coerce.number().min(0).optional(),
    email: emailSchema.optional(),
    SDT: phoneSchema.optional(),
    maxtime: z.coerce.number().optional(),
    trangthai: z.preprocess(
        (value) => String(value || '').trim(),
        z.enum(USER_STATUS_VALUES).optional()
    ),
});

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

class EmployeeController {
    constructor() {
        this.index = this.index.bind(this);
        this.statistics = this.statistics.bind(this);
        this.statisticsExport = this.statisticsExport.bind(this);
        this.store = this.store.bind(this);
        this.update = this.update.bind(this);
        this.delete = this.delete.bind(this);
        this.bulkDelete = this.bulkDelete.bind(this);
        this.bulkUpdateStatus = this.bulkUpdateStatus.bind(this);
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

    async index(req, res, next) {
        User.find({})
            .then (Users => {
                res.render('employees', {
                    userss: multipleMongooseToObject(Users)
                })
                })
            .catch(next)
    }

    async statistics(req, res) {
        try {
            const statData = await this.buildStatistics(req.query.period);
            res.render('employee-statistics', {
                report: statData.report,
                totals: statData.totals,
                periodLabel: statData.periodLabel,
                periodOptions: statData.periodOptions,
                selectedPeriod: statData.period,
                generatedAt: new Date().toLocaleString('vi-VN'),
            });
        } catch (error) {
            res.status(500).send('error');
        }
    }

    async statisticsExport(req, res) {
        try {
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
        } catch (error) {
            return res.status(500).send('error');
        }
    }

    async store(req,res){
        try {
            const parsed = employeeCreateSchema.safeParse(req.body);
            if (!parsed.success) {
                req.flash('error', 'Invalid employee data. Please review your input.');
                return res.redirect('/employee');
            }

            const users = parsed.data;
            users.maxtime = clampMaxTime(users.maxtime);
            users.hourlyRate = clampHourlyRate(users.hourlyRate);
            users.trangthai = normalizeStatus(users.trangthai);
            users.role = normalizeRole(users.role);

            const emailExists = await User.findOne({ email: users.email }).lean();
            if (emailExists) {
                req.flash('error', 'Email already exists. Please use another email.');
                return res.redirect('/employee');
            }

            users.password = await bcrypt.hash(users.password, saltRound);
            const user = new User(users);
            await user.save();
            req.flash('success', 'Employee created successfully.');
            res.redirect('/employee');
        } catch (error) {
            req.flash('error', 'Unable to create employee right now. Please try again later.');
            res.redirect('/employee');
        }
    }
    async update(req, res){
        try {
            const parsed = employeeUpdateSchema.safeParse(req.body);
            if (!parsed.success) {
                req.flash('error', 'Invalid update data.');
                return res.redirect('/employee');
            }

            const payload = parsed.data;
            if (payload.email) {
                const emailExists = await User.findOne({
                    _id: { $ne: req.params.id },
                    email: payload.email,
                }).lean();
                if (emailExists) {
                    req.flash('error', 'Email already exists. Please use another email.');
                    return res.redirect('/employee');
                }
            }
            if (payload.trangthai !== undefined) {
                payload.trangthai = normalizeStatus(payload.trangthai);
            }
            if (payload.role !== undefined) {
                payload.role = normalizeRole(payload.role);
            }
            if (payload.hourlyRate !== undefined) {
                payload.hourlyRate = clampHourlyRate(payload.hourlyRate);
            }
            if (payload.maxtime !== undefined) {
                payload.maxtime = clampMaxTime(payload.maxtime);
            }

            await User.updateOne({_id: req.params.id}, payload);
            if (req.session?.user?._id && String(req.session.user._id) === String(req.params.id)) {
                if (payload.position !== undefined) {
                    req.session.user.position = payload.position;
                }
                if (payload.role !== undefined) {
                    req.session.user.role = payload.role;
                }
                if (payload.hourlyRate !== undefined) {
                    req.session.user.hourlyRate = payload.hourlyRate;
                }
            }
            req.flash('success', 'Employee updated successfully.');
            res.redirect('/employee');
        } catch (error) {
            req.flash('error', 'Unable to update employee.');
            res.redirect('/employee');
        }
    }
    async delete(req, res){
        try {
            await User.deleteOne({_id: req.params.id});
            req.flash('success', 'Employee deleted successfully.');
            res.redirect('/employee');
        } catch (error) {
            req.flash('error', 'Unable to delete employee.');
            res.redirect('/employee');
        }
    }

    async bulkDelete(req, res) {
        try {
            const idsRaw = Array.isArray(req.body.ids) ? req.body.ids : [req.body.ids];
            const ids = idsRaw
                .map((id) => String(id || '').trim())
                .filter(Boolean);

            if (!ids.length) {
                req.flash('error', 'Please select at least one employee to delete.');
                return res.redirect('/employee');
            }

            const result = await User.deleteMany({ _id: { $in: ids } });
            const deletedCount = Number(result.deletedCount) || 0;

            if (!deletedCount) {
                req.flash('error', 'No employees were deleted.');
                return res.redirect('/employee');
            }

            req.flash('success', `Deleted ${deletedCount} employee(s) successfully.`);
            return res.redirect('/employee');
        } catch (error) {
            req.flash('error', 'Unable to delete selected employees.');
            return res.redirect('/employee');
        }
    }

    async bulkUpdateStatus(req, res) {
        try {
            const idsRaw = Array.isArray(req.body.ids) ? req.body.ids : [req.body.ids];
            const ids = idsRaw
                .map((id) => String(id || '').trim())
                .filter(Boolean);

            const rawStatus = String(req.body.trangthai || '').trim();
            if (!USER_STATUSES.has(rawStatus)) {
                req.flash('error', 'Invalid status for bulk update.');
                return res.redirect('/employee');
            }
            const targetStatus = rawStatus;
            if (!ids.length) {
                req.flash('error', 'Please select at least one employee to update.');
                return res.redirect('/employee');
            }

            const result = await User.updateMany(
                { _id: { $in: ids } },
                { trangthai: targetStatus }
            );
            const modifiedCount = Number(result.modifiedCount) || Number(result.nModified) || 0;

            if (!modifiedCount) {
                req.flash('error', 'No employee status was changed.');
                return res.redirect('/employee');
            }

            req.flash('success', `Updated status for ${modifiedCount} employee(s).`);
            return res.redirect('/employee');
        } catch (error) {
            req.flash('error', 'Unable to update status for selected employees.');
            return res.redirect('/employee');
        }
    }
}

module.exports = new EmployeeController;
