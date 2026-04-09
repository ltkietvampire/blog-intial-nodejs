const express = require('express');
const router = express.Router();
const TasksController = require('../app/controllers/TasksController');

// These routes are accessible by ALL authenticated roles (manager AND employee)
router.get('/:id/comments', TasksController.getComments);
router.post('/:id/comments', TasksController.addComment);

module.exports = router;
