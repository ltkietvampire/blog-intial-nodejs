const Users = require('../model/user');
const Tasks = require('../model/task');
const Distributions = require('../model/distribution');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const { multipleMongooseToObject } = require('../../until/mongoose');
const { calcHours } = require('../../until/calhours');
const { toMinuteOfDay, toDateOnly } = require('../../until/dateTime');

dayjs.extend(customParseFormat);

const RECURRENCE_TYPES = new Set(['none', 'daily', 'weekly', 'monthly']);
const TASK_STATUS = {
    ACTIVE: 'active',
    COMPLETED: 'completed',
    ARCHIVED: 'archived',
};
const RECURRENCE_LABELS = {
    none: 'No recurrence',
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
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

function occursOnDate(taskMeta, date) {
    if (!taskMeta || !taskMeta.startDate || !date) {
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

function findFirstScheduleConflictDate(taskA, taskB, horizonDays = 365) {
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
        if (occursOnDate(metaA, date) && occursOnDate(metaB, date)) {
            return date;
        }
    }

    return null;
}

class TasksController {
    constructor() {
        this.index = this.index.bind(this);
        this.store = this.store.bind(this);
        this.update = this.update.bind(this);
        this.delete = this.delete.bind(this);
        this.sendTask = this.sendTask.bind(this);
        this.deleteDis = this.deleteDis.bind(this);
        this.syncTaskAssignmentState = this.syncTaskAssignmentState.bind(this);
        this.autoArchiveCompletedOneTimeTasks = this.autoArchiveCompletedOneTimeTasks.bind(this);
    }

    async autoArchiveCompletedOneTimeTasks() {
        const oneTimeTasks = await Tasks.find({
            $or: [
                { recurrence_type: 'none' },
                { recurrence_type: { $exists: false } },
                { recurrence_type: null },
            ],
            task_status: { $ne: TASK_STATUS.ARCHIVED },
        }).select('_id required_people completedAt').lean();

        for (const task of oneTimeTasks) {
            const requiredPeople = toPositiveInt(task.required_people, 1);
            const [assignedCount, completedCount] = await Promise.all([
                Distributions.countDocuments({ taskID: task._id }),
                Distributions.countDocuments({ taskID: task._id, status: TASK_STATUS.COMPLETED }),
            ]);

            if (assignedCount >= requiredPeople && completedCount >= requiredPeople) {
                const now = new Date();
                await Tasks.updateOne(
                    { _id: task._id },
                    {
                        task_status: TASK_STATUS.ARCHIVED,
                        completedAt: task.completedAt || now,
                        archivedAt: now,
                    }
                );
            }
        }
    }

    async syncTaskAssignmentState(taskId) {
        const task = await Tasks.findById(taskId).lean();
        if (!task) {
            return;
        }

        const assignedCount = await Distributions.countDocuments({ taskID: taskId });
        const requiredPeople = toPositiveInt(task.required_people, 1);

        await Tasks.updateOne(
            { _id: taskId },
            {
                assigned_people_count: assignedCount,
                assignee: assignedCount >= requiredPeople,
            }
        );
    }

    async index(req, res) {
        try {
            await this.autoArchiveCompletedOneTimeTasks();

            const [users, tasks, archivedTasks, positions, data] = await Promise.all([
                Users.find({}),
                Tasks.find({ task_status: { $ne: TASK_STATUS.ARCHIVED } }),
                Tasks.find({ task_status: TASK_STATUS.ARCHIVED }).sort({ archivedAt: -1, updatedAt: -1 }),
                Users.distinct('position'),
                Distributions.find({})
                    .populate('employeeID')
                    .populate({
                        path: 'taskID',
                        match: { task_status: { $ne: TASK_STATUS.ARCHIVED } },
                    }),
            ]);

            const userRows = multipleMongooseToObject(users);
            const taskRows = multipleMongooseToObject(tasks);
            const archivedTaskRows = multipleMongooseToObject(archivedTasks);
            const distributionRows = multipleMongooseToObject(data).filter((row) => Boolean(row.taskID));

            const assignedMap = {};
            for (const row of distributionRows) {
                if (!row.taskID || !row.taskID._id) {
                    continue;
                }
                const taskId = String(row.taskID._id);
                assignedMap[taskId] = (assignedMap[taskId] || 0) + 1;
            }

            const normalizedTasks = taskRows.map((task) => {
                const taskId = String(task._id);
                const assignedCount = Number.isFinite(task.assigned_people_count)
                    ? task.assigned_people_count
                    : (assignedMap[taskId] || 0);
                const requiredPeople = toPositiveInt(task.required_people, 1);
                return {
                    ...task,
                    recurrence_type: normalizeRecurrence(task.recurrence_type),
                    task_status: normalizeTaskStatus(task.task_status),
                    required_people: requiredPeople,
                    assigned_people_count: assignedCount,
                    assignee: assignedCount >= requiredPeople,
                };
            });

            const normalizedArchivedTasks = archivedTaskRows.map((task) => {
                const requiredPeople = toPositiveInt(task.required_people, 1);
                const assignedCount = Number.isFinite(task.assigned_people_count)
                    ? task.assigned_people_count
                    : 0;

                return {
                    ...task,
                    recurrence_type: normalizeRecurrence(task.recurrence_type),
                    recurrence_label: getRecurrenceLabel(task.recurrence_type),
                    task_status: normalizeTaskStatus(task.task_status),
                    required_people: requiredPeople,
                    assigned_people_count: assignedCount,
                    deadlineText: task.deadline ? new Date(task.deadline).toLocaleDateString('vi-VN') : '--',
                    completedAtText: task.completedAt ? new Date(task.completedAt).toLocaleString('vi-VN') : '--',
                    archivedAtText: task.archivedAt ? new Date(task.archivedAt).toLocaleString('vi-VN') : '--',
                };
            });

            res.render('tasks', {
                users: userRows,
                position: positions,
                data: distributionRows,
                tasks: normalizedTasks,
                archivedTasks: normalizedArchivedTasks,
            });
        } catch (error) {
            res.send('error');
        }
    }

    async store(req, res) {
        try {
            const task = { ...req.body };
            const startMinutes = toMinuteOfDay(task.dateStart);
            const endMinutes = toMinuteOfDay(task.dateEnd);
            const deadlineDate = toDateOnly(task.deadline);

            if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes) || endMinutes <= startMinutes) {
                req.flash('error', 'Invalid start/end time.');
                return res.redirect('/tasks');
            }
            if (!deadlineDate || deadlineDate < startOfToday()) {
                req.flash('error', 'Deadline must be today or later.');
                return res.redirect('/tasks');
            }

            task.estimated_total_hours = calcHours(task.dateStart, task.dateEnd);
            task.recurrence_type = normalizeRecurrence(task.recurrence_type);
            task.priority = toPriority(task.priority, 3);
            task.required_people = toPositiveInt(task.required_people, 1);
            task.deadline = deadlineDate;
            task.assigned_people_count = 0;
            task.assignee = false;
            task.task_status = TASK_STATUS.ACTIVE;
            task.completedAt = null;
            task.archivedAt = null;

            const tasks = new Tasks(task);
            await tasks.save();
            req.flash('success', 'Task created successfully.');
            res.redirect('/tasks');
        } catch (error) {
            req.flash('error', 'Unable to create task. Please try again later.');
            res.redirect('/tasks');
        }
    }

    async update(req, res) {
        try {
            const task = { ...req.body };
            const existingTask = await Tasks.findById(req.params.id).lean();
            if (!existingTask) {
                req.flash('error', 'Task not found for update.');
                return res.redirect('/tasks');
            }

            const startMinutes = toMinuteOfDay(task.dateStart);
            const endMinutes = toMinuteOfDay(task.dateEnd);
            const deadlineDate = toDateOnly(task.deadline);
            if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes) || endMinutes <= startMinutes) {
                req.flash('error', 'Invalid start/end time.');
                return res.redirect('/tasks');
            }
            if (!deadlineDate || deadlineDate < startOfToday()) {
                req.flash('error', 'Deadline must be today or later.');
                return res.redirect('/tasks');
            }

            task.estimated_total_hours = calcHours(task.dateStart, task.dateEnd);
            task.recurrence_type = normalizeRecurrence(task.recurrence_type);
            task.priority = toPriority(task.priority, existingTask.priority || 3);
            task.required_people = toPositiveInt(task.required_people, 1);
            task.deadline = deadlineDate;
            task.task_status = task.task_status
                ? normalizeTaskStatus(task.task_status)
                : normalizeTaskStatus(existingTask.task_status);

            const assignedCount = await Distributions.countDocuments({ taskID: req.params.id });
            task.assigned_people_count = assignedCount;
            task.assignee = assignedCount >= task.required_people;

            await Tasks.updateOne({ _id: req.params.id }, task);
            req.flash('success', 'Task updated successfully.');
            res.redirect('/tasks');
        } catch (error) {
            req.flash('error', 'Unable to update task.');
            res.redirect('/tasks');
        }
    }

    async delete(req, res) {
        try {
            await Promise.all([
                Tasks.deleteOne({ _id: req.params.id }),
                Distributions.deleteMany({ taskID: req.params.id }),
            ]);
            req.flash('success', 'Task deleted successfully.');
            res.redirect('/tasks');
        } catch (error) {
            req.flash('error', 'Unable to delete task.');
            res.redirect('/tasks');
        }
    }

    async sendTask(req, res) {
        try {
            const task = await Tasks.findById(req.params.idTask).lean();
            if (!task) {
                req.flash('error', 'Task not found for assignment.');
                return res.redirect('/tasks');
            }
            if (normalizeTaskStatus(task.task_status) !== TASK_STATUS.ACTIVE) {
                req.flash('error', 'This task is no longer active.');
                return res.redirect('/tasks');
            }

            const taskMeta = getTaskScheduleMeta(task);
            if (!taskMeta) {
                req.flash('error', 'Task has invalid schedule/deadline, so it cannot be assigned.');
                return res.redirect('/tasks');
            }

            const requiredPeople = toPositiveInt(task.required_people, 1);
            const currentAssignedCount = await Distributions.countDocuments({ taskID: task._id });
            if (currentAssignedCount >= requiredPeople) {
                await this.syncTaskAssignmentState(task._id);
                req.flash('error', 'Task already has enough assignees.');
                return res.redirect('/tasks');
            }

            const existed = await Distributions.findOne({
                taskID: task._id,
                employeeID: req.params.idEmp,
            }).lean();

            const employeeSchedules = await Distributions.find({
                employeeID: req.params.idEmp,
                status: { $ne: TASK_STATUS.COMPLETED },
            })
                .populate({
                    path: 'taskID',
                    match: {
                        _id: { $ne: task._id },
                        task_status: { $ne: TASK_STATUS.ARCHIVED },
                    },
                })
                .lean();

            const existingTasks = employeeSchedules
                .map((row) => row.taskID)
                .filter(Boolean);

            for (const scheduledTask of existingTasks) {
                const conflictDate = findFirstScheduleConflictDate(task, scheduledTask, 365);
                if (!conflictDate) {
                    continue;
                }

                const conflictTaskName = scheduledTask.name_task || 'task khac';
                req.flash(
                    'error',
                    `Cannot assign. Schedule overlaps with "${conflictTaskName}" on ${conflictDate.format('DD/MM/YYYY')} (${scheduledTask.dateStart || '--:--'}-${scheduledTask.dateEnd || '--:--'}).`
                );
                return res.redirect('/tasks');
            }

            if (!existed) {
                const distribution = new Distributions({
                    employeeID: req.params.idEmp,
                    taskID: task._id,
                });
                await distribution.save();
                req.flash('success', 'Task assigned successfully.');
            } else {
                req.flash('error', 'This employee is already assigned to the task.');
            }

            await this.syncTaskAssignmentState(task._id);
            return res.redirect('/tasks');
        } catch (error) {
            req.flash('error', 'Unable to assign task.');
            return res.redirect('/tasks');
        }
    }

    async deleteDis(req, res) {
        try {
            const deleted = await Distributions.findOneAndDelete({
                _id: req.params.idDis,
                taskID: req.params.idTask,
            }).lean();

            if (deleted) {
                await this.syncTaskAssignmentState(req.params.idTask);
                req.flash('success', 'Task assignment removed.');
            } else {
                req.flash('error', 'Assignment not found.');
            }

            res.redirect('/tasks');
        } catch (error) {
            req.flash('error', 'Unable to remove assignment.');
            res.redirect('/tasks');
        }
    }
}

module.exports = new TasksController();
