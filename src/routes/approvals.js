const express = require('express');
const router = express.Router();

const ApprovalsController = require('../app/controllers/ApprovalsController');
const requireManager = require('../app/middleware/requireManager');
const requireEmployee = require('../app/middleware/requireEmployee');

router.get('/', requireManager, ApprovalsController.managerIndex);
router.get('/my', requireEmployee, ApprovalsController.employeeIndex);
router.post('/request', ApprovalsController.createRequest); // All authenticated users can submit requests
router.post('/:id/approve', requireManager, ApprovalsController.approve);
router.post('/:id/reject', requireManager, ApprovalsController.reject);

module.exports = router;
