const Users = require('../model/user')
const {multipleMongooseToObject} = require('../../util/mongoose')
const Distributions = require('../model/distribution')
const Tasks = require('../model/task')
const { isEmployeePosition, isManagerPosition } = require('../middleware/roleUtils');
const asyncHandler = require('express-async-handler');

class SiteController {
    index = asyncHandler(async (req, res, next) => {
        const currentUser = req.user;
        if (!currentUser?._id) {
            return res.redirect('/login');
        }

        if (isEmployeePosition(currentUser)) {
            return res.redirect('/dashboard');
        }

        const users = await Users.find({}).lean()
        const data = await Distributions.find()
            .populate('employeeID')
            .populate({ path: 'taskID' });

        const dataRows = multipleMongooseToObject(data).filter((row) => Boolean(row.taskID));
        const employeeUsers = users.filter((user) => isEmployeePosition(user));
        const managerUsers = users.filter((user) => isManagerPosition(user));

        res.render('home', {
            users: users,
            employeeUsers,
            managerUsers,
            data: dataRows
        } )
    });
}

module.exports = new SiteController;
