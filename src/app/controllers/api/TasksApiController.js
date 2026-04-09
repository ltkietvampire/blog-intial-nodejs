const Tasks = require('../../model/task');
const dayjs = require('dayjs');
const { calcHours } = require('../../../util/calhours');
const { toMinuteOfDay, toDateOnly, startOfToday } = require('../../../util/dateTime');
const {
    TASK_STATUS,
    normalizeRecurrence,
    toPositiveInt,
    toPriority
} = require('../../../util/taskUtils');

class TasksApiController {
    async storeTask(req, res) {
        try {
            if (!req.user || !req.user._id) {
                return res.status(401).json({ ok: false, error: 'Unauthorized' });
            }

            let rawData = req.body;
            
            // 1. If N8N sent it as raw string, parse it
            if (typeof rawData === 'string') {
                try { rawData = JSON.parse(rawData); } catch(e) {}
            }
            
            // 2. If it was Form-url-encoded by accident, the keys might be the JSON string...
            if (rawData && Object.keys(rawData).length === 1 && typeof Object.keys(rawData)[0] === 'string' && Object.keys(rawData)[0].startsWith('{')) {
                try { rawData = JSON.parse(Object.keys(rawData)[0]); } catch(e) {}
            }

            // 3. Support nested formats
            if (rawData && rawData.body && typeof rawData.body === 'object') {
                rawData = rawData.body;
            }
            if (rawData && rawData.params && typeof rawData.params === 'object') {
                rawData = rawData.params;
            }
            
            const task = { ...rawData };
            
            const startMinutes = toMinuteOfDay(task.dateStart);
            const endMinutes = toMinuteOfDay(task.dateEnd);
            const deadlineDate = toDateOnly(task.deadline);
            
            if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes) || endMinutes <= startMinutes) {
                return res.status(400).json({ ok: false, error: 'Invalid start/end time.' });
            }



            task.estimated_total_hours = calcHours(task.dateStart, task.dateEnd);
            task.recurrence_type = normalizeRecurrence(task.recurrence_type);
            task.priority = toPriority(task.priority, 3);
            task.required_people = toPositiveInt(task.required_people, 1);
            task.deadline = deadlineDate;
            
            // Bot creates an unassigned task
            task.assigned_people_count = 0;
            task.assignee = false;
            task.task_status = TASK_STATUS.ACTIVE;
            task.completedAt = null;
            task.archivedAt = null;

            const newTask = new Tasks(task);
            await newTask.save();
            
            return res.json({ 
                ok: true, 
                message: 'Task created successfully.', 
                task: newTask 
            });
            
        } catch (error) {
            console.error('API Task Store Error:', error);
            return res.status(500).json({ ok: false, error: 'Unable to create task. Please try again later.' });
        }
    }
}

module.exports = new TasksApiController();
