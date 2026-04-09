const express = require('express')
const router = express.Router()

const TasksController = require ('../app/controllers/TasksController')



router.post('/store', TasksController.store);
router.get('/:id/suggestions', TasksController.suggestEmployees);
router.get('/:id/comments', TasksController.getComments);
router.post('/:id/comments', TasksController.addComment);
router.post('/:idTask/:idEmp', TasksController.sendTask);
router.delete('/:idTask/:idDis', TasksController.deleteDis);
router.put('/:id', TasksController.update);
router.delete('/:id', TasksController.delete);
router.get('/', TasksController.index);


module.exports = router;
