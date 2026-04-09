const express = require('express')
const router = express.Router()

const EmployeeController = require ('../app/controllers/EmployeesController')
const EmployeeStatisticsController = require('../app/controllers/EmployeeStatisticsController')

router.post('/store', EmployeeController.store);
router.post('/bulk-delete', EmployeeController.bulkDelete);
router.post('/bulk-status', EmployeeController.bulkUpdateStatus);
router.delete('/:id', EmployeeController.delete);
router.put('/:id', EmployeeController.update);
router.get('/statistics/export-salary', EmployeeStatisticsController.salaryExport);
router.get('/statistics/export', EmployeeStatisticsController.statisticsExport);
router.get('/statistics', EmployeeStatisticsController.statistics);
router.get('/', EmployeeController.index);



module.exports = router;
