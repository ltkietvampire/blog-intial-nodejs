const Distribution = require('../model/distribution');
const User = require('../model/user');
const Task = require('../model/task');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const { isEmployeePosition } = require('../middleware/roleUtils');
const { combineDateTime, toDateText, toDateTimeText } = require('../../until/dateTime');

dayjs.extend(customParseFormat);

const CHECK_IN_STATUS = 'checked_in';
const LATE_STATUS = 'late';
const COMPLETE_STATUS = 'completed';
const CHECK_IN_WINDOW_MINUTES = 15;
const COMPLETE_WINDOW_MINUTES = 15;
const TASK_STATUS_ARCHIVED = 'archived';

function getDateKey(value) {
    const date = dayjs(value);
    if (!date.isValid()) {
        return '';
    }
    return date.format('YYYY-MM-DD');
}

function toDateTimeTextLocal(value) {
    return toDateTimeText(value, { format: 'DD/MM/YYYY HH:mm:ss', fallback: '' });
}

function getStatusLabel(status) {
    switch (status) {
        case COMPLETE_STATUS:
            return 'Completed';
        case CHECK_IN_STATUS:
            return 'Checked in';
        case LATE_STATUS:
            return 'Late check-in';
        default:
            return 'In progress';
    }
}

function getStatusClass(status) {
    switch (status) {
        case COMPLETE_STATUS:
            return 'status-completed';
        case CHECK_IN_STATUS:
            return 'status-checkin';
        case LATE_STATUS:
            return 'status-late';
        default:
            return 'status-working';
    }
}

class MyTaskController {
    constructor() {
        this.index = this.index.bind(this);
        this.schedule = this.schedule.bind(this);
        this.checkIn = this.checkIn.bind(this);
        this.complete = this.complete.bind(this);
        this.syncNonRecurringTaskLifecycle = this.syncNonRecurringTaskLifecycle.bind(this);
    }

    async resolveUser(req) {
        if (!req.session?.user?._id) {
            return null;
        }

        const user = await User.findById(req.session.user._id).lean();
        if (!user) {
            return null;
        }

        user.totalWorkingHours = Number(user.totalWorkingHours || 0);
        req.session.user.role = user.role;
        req.session.user.position = user.position;
        req.session.user.totalWorkingHours = user.totalWorkingHours;

        return user;
    }

    buildTaskRecord(distribution, now, todayKey) {
        const task = distribution.taskID;
        if (!task) {
            return null;
        }

        const status = String(distribution.status || 'working').toLowerCase();
        const isCompleted = status === COMPLETE_STATUS;
        const deadlineKey = getDateKey(task.deadline || task.createdAt || now.toDate());
        const startAt = combineDateTime(deadlineKey, task.dateStart);
        const endAt = combineDateTime(deadlineKey, task.dateEnd || task.dateStart);

        const checkInStart = startAt
            ? startAt.subtract(CHECK_IN_WINDOW_MINUTES, 'minute')
            : null;
        const checkInEnd = startAt
            ? startAt.add(CHECK_IN_WINDOW_MINUTES, 'minute')
            : null;
        const completeStart = endAt
            ? endAt.subtract(COMPLETE_WINDOW_MINUTES, 'minute')
            : null;

        const isOverdueByTime = !isCompleted && endAt ? now.isAfter(endAt) : false;
        const isOverdueByDate = !isCompleted && deadlineKey ? deadlineKey < todayKey : false;
        const isOverdue = isOverdueByTime || isOverdueByDate;

        const canCheckIn = Boolean(
            !isCompleted &&
            status !== CHECK_IN_STATUS &&
            status !== LATE_STATUS &&
            checkInStart &&
            checkInEnd &&
            !now.isBefore(checkInStart) &&
            !now.isAfter(checkInEnd)
        );

        const canComplete = Boolean(
            !isCompleted &&
            completeStart &&
            !now.isBefore(completeStart)
        );

        const hoursValue = Number(task.estimated_total_hours || 0);
        const estimatedHours = Number.isFinite(hoursValue) ? Number(hoursValue.toFixed(2)) : 0;

        let section = 'today';
        if (isOverdue) {
            section = 'overdue';
        } else if (deadlineKey > todayKey) {
            section = 'upcoming';
        } else if (deadlineKey < todayKey && isCompleted) {
            return null;
        }

        return {
            distributionId: distribution._id,
            taskId: task._id,
            name: task.name_task || 'No name',
            description: task.description_task || 'No description',
            deadlineText: toDateText(task.deadline),
            dateStart: task.dateStart || '--:--',
            dateEnd: task.dateEnd || '--:--',
            estimatedHours,
            status,
            statusLabel: getStatusLabel(status),
            statusClass: getStatusClass(status),
            canCheckIn,
            canComplete,
            checkInAtText: toDateTimeTextLocal(distribution.checkInAt),
            completedAtText: toDateTimeTextLocal(distribution.completedAt),
            section,
            sortTime: startAt ? startAt.valueOf() : 0,
        };
    }

    async syncNonRecurringTaskLifecycle(taskId) {
        const task = await Task.findById(taskId).lean();
        if (!task) {
            return;
        }

        const recurrence = String(task.recurrence_type || 'none').toLowerCase();
        if (recurrence !== 'none') {
            return;
        }

        const requiredPeople = Number.parseInt(task.required_people, 10);
        const required = Number.isFinite(requiredPeople) && requiredPeople > 0 ? requiredPeople : 1;

        const [assignedCount, completedCount] = await Promise.all([
            Distribution.countDocuments({ taskID: taskId }),
            Distribution.countDocuments({ taskID: taskId, status: COMPLETE_STATUS }),
        ]);

        const doneEnough = assignedCount >= required && completedCount >= required;
        if (doneEnough) {
            const now = new Date();
            await Task.updateOne(
                { _id: taskId },
                {
                    task_status: TASK_STATUS_ARCHIVED,
                    completedAt: task.completedAt || now,
                    archivedAt: now,
                }
            );
            return;
        }

        if (String(task.task_status || '').toLowerCase() === TASK_STATUS_ARCHIVED) {
            await Task.updateOne(
                { _id: taskId },
                {
                    task_status: TASK_STATUS_ACTIVE,
                    archivedAt: null,
                }
            );
        }
    }

    async index(req, res) {
        const user = await this.resolveUser(req);
        if (!user) {
            return res.redirect('/login');
        }

        if (!isEmployeePosition(user)) {
            return res.status(403).send('Only employee can access myTask');
        }

        const now = dayjs();
        const todayKey = now.format('YYYY-MM-DD');
        const distributions = await Distribution.find({ employeeID: user._id })
            .populate({
                path: 'taskID',
                match: { task_status: { $ne: TASK_STATUS_ARCHIVED } },
            })
            .lean();

        const grouped = {
            today: [],
            upcoming: [],
            overdue: [],
        };

        for (const distribution of distributions) {
            const row = this.buildTaskRecord(distribution, now, todayKey);
            if (!row) {
                continue;
            }
            grouped[row.section].push(row);
        }

        grouped.today.sort((a, b) => a.sortTime - b.sortTime);
        grouped.upcoming.sort((a, b) => a.sortTime - b.sortTime);
        grouped.overdue.sort((a, b) => b.sortTime - a.sortTime);

        return res.render('my-task', {
            user,
            nowText: now.format('DD/MM/YYYY HH:mm:ss'),
            todayTasks: grouped.today,
            upcomingTasks: grouped.upcoming,
            overdueTasks: grouped.overdue,
        });
    }

    async schedule(req, res) {
        const user = await this.resolveUser(req);
        if (!user) {
            return res.redirect('/login');
        }

        if (!isEmployeePosition(user)) {
            return res.status(403).send('Only employee can access mySchedule');
        }

        const rows = await Distribution.find({ employeeID: user._id })
            .populate({
                path: 'taskID',
                match: { task_status: { $ne: TASK_STATUS_ARCHIVED } },
            })
            .lean();

        const scheduleData = rows.filter((row) => Boolean(row.taskID));

        return res.render('my-schedule', {
            user,
            nowText: dayjs().format('DD/MM/YYYY HH:mm:ss'),
            scheduleData,
        });
    }

    async checkIn(req, res) {
        const user = await this.resolveUser(req);
        if (!user) {
            req.flash('error', 'Please sign in to continue.');
            return res.redirect('/login');
        }

        if (!isEmployeePosition(user)) {
            return res.status(403).send('Only employee can access myTask');
        }

        const distribution = await Distribution.findOne({
            _id: req.params.distributionId,
            employeeID: user._id,
        }).populate({
            path: 'taskID',
            match: { task_status: { $ne: TASK_STATUS_ARCHIVED } },
        }).lean();

        if (!distribution || !distribution.taskID) {
            req.flash('error', 'Task not found for check-in.');
            return res.redirect('/my-task');
        }

        if (String(distribution.status || '').toLowerCase() === COMPLETE_STATUS) {
            req.flash('error', 'This task is already completed.');
            return res.redirect('/my-task');
        }

        const now = dayjs();
        const deadlineKey = getDateKey(distribution.taskID.deadline || now.toDate());
        const startAt = combineDateTime(deadlineKey, distribution.taskID.dateStart);
        if (!startAt) {
            req.flash('error', 'Task does not have a valid start time.');
            return res.redirect('/my-task');
        }

        const checkInStart = startAt.subtract(CHECK_IN_WINDOW_MINUTES, 'minute');
        const checkInEnd = startAt.add(CHECK_IN_WINDOW_MINUTES, 'minute');
        if (now.isBefore(checkInStart) || now.isAfter(checkInEnd)) {
            req.flash('error', 'You can only check in within 15 minutes around start time.');
            return res.redirect('/my-task');
        }

        const nextStatus = now.isAfter(startAt) ? LATE_STATUS : CHECK_IN_STATUS;
        await Distribution.updateOne(
            {
                _id: distribution._id,
                employeeID: user._id,
                status: { $ne: COMPLETE_STATUS },
            },
            {
                status: nextStatus,
                checkInAt: now.toDate(),
            }
        );

        req.flash('success', 'Check-in successful.');
        return res.redirect('/my-task');
    }

    async complete(req, res) {
        const user = await this.resolveUser(req);
        if (!user) {
            req.flash('error', 'Please sign in to continue.');
            return res.redirect('/login');
        }

        if (!isEmployeePosition(user)) {
            return res.status(403).send('Only employee can access myTask');
        }

        const distribution = await Distribution.findOne({
            _id: req.params.distributionId,
            employeeID: user._id,
        }).populate({
            path: 'taskID',
            match: { task_status: { $ne: TASK_STATUS_ARCHIVED } },
        }).lean();

        if (!distribution || !distribution.taskID) {
            req.flash('error', 'Task not found for completion.');
            return res.redirect('/my-task');
        }

        if (String(distribution.status || '').toLowerCase() === COMPLETE_STATUS) {
            req.flash('error', 'This task was already completed.');
            return res.redirect('/my-task');
        }

        const now = dayjs();
        const deadlineKey = getDateKey(distribution.taskID.deadline || now.toDate());
        const endAt = combineDateTime(deadlineKey, distribution.taskID.dateEnd || distribution.taskID.dateStart);
        if (endAt) {
            const completeStart = endAt.subtract(COMPLETE_WINDOW_MINUTES, 'minute');
            if (now.isBefore(completeStart)) {
                req.flash('error', 'You can only complete task from 15 minutes before end time.');
                return res.redirect('/my-task');
            }
        }

        const updateResult = await Distribution.updateOne(
            {
                _id: distribution._id,
                employeeID: user._id,
                status: { $ne: COMPLETE_STATUS },
            },
            {
                status: COMPLETE_STATUS,
                completedAt: now.toDate(),
            }
        );

        const modifiedCount =
            Number(updateResult?.modifiedCount)
            || Number(updateResult?.nModified)
            || 0;

        if (modifiedCount > 0) {
            const hoursValue = Number(distribution.taskID.estimated_total_hours || 0);
            const totalHours = Number.isFinite(hoursValue) ? Number(hoursValue.toFixed(2)) : 0;
            if (totalHours > 0) {
                await User.updateOne(
                    { _id: user._id },
                    { $inc: { totalWorkingHours: totalHours } }
                );
            }
        }

        // Always re-check lifecycle: supports old mongoose update result shapes
        // and old tasks that may miss default fields.
        await this.syncNonRecurringTaskLifecycle(distribution.taskID._id);

        req.flash('success', 'Task completion updated successfully.');
        return res.redirect('/my-task');
    }
}

module.exports = new MyTaskController();
