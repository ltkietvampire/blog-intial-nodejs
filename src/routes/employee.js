const express = require('express')
const router = express.Router()

const EmployeeController = require ('../app/controllers/EmployeesController')

router.post('/store', EmployeeController.store);
router.delete('/:id', EmployeeController.delete);
router.put('/:id', EmployeeController.update);
router.get('/', EmployeeController.index);



module.exports = router;
