const express = require('express');
const router = express.Router();

const ScheduleApiController = require('../app/controllers/api/ScheduleApiController');
const TasksApiController = require('../app/controllers/api/TasksApiController');
const requireManager = require('../app/middleware/requireManager');

// Mapped to /api/schedule
router.get('/schedule', ScheduleApiController.getSchedule);
// Mapped to /api/tasks/stores for n8n chatbot
router.post('/tasks/stores', requireManager, TasksApiController.storeTask);

module.exports = router;
