const express = require('express');
const SalaryController = require('../app/controllers/SalaryController');
const requireAuth = require('../app/middleware/requireAuth'); // if needed, but router might be protected already in index

const router = express.Router();

router.get('/', SalaryController.index);
router.post('/generate', SalaryController.generate);
router.post('/manager-approve', SalaryController.managerApprove);
router.post('/director-approve', SalaryController.directorApprove);
router.post('/director-reject', SalaryController.directorReject);
router.post('/:id/adjust', SalaryController.adjustPay);

module.exports = router;
