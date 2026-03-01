const express = require('express');
const router = express.Router();

const MyTaskController = require('../app/controllers/MyTaskController');

router.post('/:distributionId/check-in', MyTaskController.checkIn);
router.post('/:distributionId/complete', MyTaskController.complete);
router.get('/schedule', MyTaskController.schedule);
router.get('/', MyTaskController.index);

module.exports = router;
