const Users = require('../model/user')
const Tasks = require('../model/task')
const Distributions = require('../model/distribution')
const {multipleMongooseToObject} = require('../../until/mongoose')
const {calcHours} = require('../../until/calhours')
const task = require('../model/task')

class TasksController {
    async index(req, res, next) {
        const users = await Users.find({})
        const tasks = await Tasks.find({})
        const positions = await Users.distinct('position')
        const data = await Distributions.find()
            .populate('employeeID')
            .populate('taskID'); 
        res.render('tasks', {
            users: multipleMongooseToObject(users),
            position: positions,
            data: multipleMongooseToObject(data),
            tasks: multipleMongooseToObject(tasks)
        } )
    }

    store(req,res){
        const task = req.body;
        task.estimated_total_hours = calcHours(task.dateStart, task.dateEnd);
        const tasks = new Tasks(task);
        tasks.save()
        res.redirect('/tasks')
    }
    update(req, res){
        const task = req.body;
        task.estimated_total_hours = calcHours(task.dateStart, task.dateEnd);
        Tasks.updateOne({_id: req.params.id}, task)
            .then(() => res.redirect('/tasks'))
            .catch(() => res.send('error'))
    }
    delete(req, res){
        Tasks.deleteOne({_id: req.params.id})
            .then(() => res.redirect('/tasks'))
            .catch(() => res.send('error'))
    }
    sendTask(req,res){
        const formData = {
            employeeID : req.params.idEmp,
            taskID     : req.params.idTask
        }
        const distributions = new Distributions(formData);
        distributions.save()
        Tasks.updateOne({_id: req.params.idTask}, {assignee: true})
            .then(() => res.redirect('/tasks'))
            .catch(() => res.send('lỗi'))
        
    }
    deleteDis(req,res){
        Distributions.deleteOne({_id: req.params.idDis})
        .then(function (){
            Tasks.updateOne({_id: req.params.idTask}, {assignee: false})
                .then(() => res.redirect('/tasks'))
                .catch(() => res.send('lỗi'))    
        
        })
        .catch(()=> res.send('error'))
        

    }
}

module.exports = new TasksController;