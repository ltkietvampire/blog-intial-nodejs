const User = require('../model/user')
const bcrypt = require("bcrypt");
const Distribution = require('../model/distribution')
const { Parser } = require('@json2csv/plainjs');
const { z } = require('zod');
const {multipleMongooseToObject} = require('../../until/mongoose')

const saltRound = 10
const USER_STATUS_VALUES = ['status-active', 'status-busy', 'status-off'];
const USER_STATUSES = new Set(USER_STATUS_VALUES);
const STAT_PERIODS = new Set(['all', 'week', 'month', 'quarter']);

function isValidPhone(value) {
    const digits = String(value || '').replace(/\D/g, '');
    return digits.length >= 8 && digits.length <= 15;
}

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
    position: z.string().trim().min(1),
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
    position: z.string().trim().min(1).optional(),
    email: emailSchema.optional(),
    SDT: phoneSchema.optional(),
    maxtime: z.coerce.number().optional(),
    trangthai: z.preprocess(
        (value) => String(value || '').trim(),
        z.enum(USER_STATUS_VALUES).optional()
    ),
});

function getStartOfWeek(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    return d;
}

function getStartOfMonth(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(1);
    return d;
}

function getStartOfQuarter(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const quarterMonth = Math.floor(d.getMonth() / 3) * 3;
    d.setMonth(quarterMonth, 1);
    return d;
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

class EmployeeController {
    constructor() {
        this.index = this.index.bind(this);
        this.statistics = this.statistics.bind(this);
        this.statisticsExport = this.statisticsExport.bind(this);
        this.store = this.store.bind(this);
        this.update = this.update.bind(this);
        this.delete = this.delete.bind(this);
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

        const reportByUser = new Map();
        const skippedStatuses = new Set(['skipped', 'missed', 'ignored', 'abandoned']);
        const lateStatuses = new Set(['late']);

        for (const user of users) {
            const lateMinutesValue = Number(user.lateMinutes ?? user.totalLateMinutes ?? 0);
            const skippedValue = Number(user.skippedTaskCount ?? user.skippedTasks ?? 0);
            const lateMinutes = Number.isFinite(lateMinutesValue) ? lateMinutesValue : 0;
            const skippedFromUser = Number.isFinite(skippedValue) ? skippedValue : 0;

            reportByUser.set(String(user._id), {
                ...user,
                assignedTasks: 0,
                workHours: 0,
                lateCount: 0,
                lateMinutes,
                skippedCount: skippedFromUser,
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
            if (lateStatuses.has(status)) {
                row.lateCount += 1;
            }
            if (skippedStatuses.has(status)) {
                row.skippedCount += 1;
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
            users.trangthai = normalizeStatus(users.trangthai);

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
            if (payload.maxtime !== undefined) {
                payload.maxtime = clampMaxTime(payload.maxtime);
            }

            await User.updateOne({_id: req.params.id}, payload);
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
}

module.exports = new EmployeeController;
