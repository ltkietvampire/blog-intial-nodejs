const Users = require('../model/user')
const {multipleMongooseToObject} = require('../../until/mongoose')
const Distributions = require('../model/distribution')
const Tasks = require('../model/task')

class SiteController {
    async index(req, res, next) {
        const users = await Users.find({})
        const data = await Distributions.find()
            .populate('employeeID')
            .populate('taskID');
      
        res.render('home', {
            users: multipleMongooseToObject(users),
            data: multipleMongooseToObject(data)
        } )
    }
        

    search(req,res){
        res.render('search');
    }
}

module.exports = new SiteController;