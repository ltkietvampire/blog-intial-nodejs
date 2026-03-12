const express = require('express');
const SalaryController = require('../app/controllers/SalaryController');

const router = express.Router();

router.get('/', SalaryController.index);
router.post('/generate', SalaryController.generate);

module.exports = router;
