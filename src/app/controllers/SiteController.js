const Users = require('../model/user')
const {multipleMongooseToObject} = require('../../until/mongoose')
const Distributions = require('../model/distribution')
const Tasks = require('../model/task')
const { isEmployeePosition, isManagerPosition } = require('../middleware/roleUtils');

class SiteController {
    async index(req, res, next) {
        const currentUser = req.session?.user;
        if (!currentUser?._id) {
            return res.redirect('/login');
        }

        if (isEmployeePosition(currentUser)) {
            return res.redirect('/dashboard');
        }

        const users = await Users.find({}).lean()
        const data = await Distributions.find()
            .populate('employeeID')
            .populate({
                path: 'taskID',
                match: { task_status: { $ne: 'archived' } },
            });

        const dataRows = multipleMongooseToObject(data).filter((row) => Boolean(row.taskID));
        const employeeUsers = users.filter((user) => isEmployeePosition(user));
        const managerUsers = users.filter((user) => isManagerPosition(user));

        res.render('home', {
            users: users,
            employeeUsers,
            managerUsers,
            data: dataRows
        } )
    }
        

    search(req,res){
        res.render('search');
    }
}

module.exports = new SiteController;
