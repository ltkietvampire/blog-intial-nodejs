const Users = require('../model/user')
const {multipleMongooseToObject} = require('../../until/mongoose')
const Distributions = require('../model/distribution')
const Tasks = require('../model/task')
const { isEmployeePosition } = require('../middleware/roleUtils');

class SiteController {
    async index(req, res, next) {
        const currentUser = req.session?.user;
        if (!currentUser?._id) {
            return res.redirect('/login');
        }

        if (isEmployeePosition(currentUser.position)) {
            return res.redirect('/dashboard');
        }

        const users = await Users.find({})
        const data = await Distributions.find()
            .populate('employeeID')
            .populate({
                path: 'taskID',
                match: { task_status: { $ne: 'archived' } },
            });

        const dataRows = multipleMongooseToObject(data).filter((row) => Boolean(row.taskID));

        res.render('home', {
            users: multipleMongooseToObject(users),
            data: dataRows
        } )
    }
        

    search(req,res){
        res.render('search');
    }
}

module.exports = new SiteController;
