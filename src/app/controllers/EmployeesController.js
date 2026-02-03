const User = require('../model/user')
const {multipleMongooseToObject} = require('../../until/mongoose')

class EmployeeController {
    async index(req, res, next) {
        User.find({})
            .then (Users => {
                res.render('employees', {
                    userss: multipleMongooseToObject(Users)
                })
                })
            }

    store(req,res){
        const users = req.body;
        users.trangthai = 'status-active';

        const user = new User(users);
        user.save()
        res.redirect('/employee')
    }
    update(req, res){
        User.updateOne({_id: req.params.id}, req.body)
            .then(() => res.redirect('/employee'))
            .catch(() => res.send('error'))
    }
    delete(req, res){
        User.deleteOne({_id: req.params.id})
            .then(() => res.redirect('/employee'))
            .catch(() => res.send('error'))
    }
}

module.exports = new EmployeeController;