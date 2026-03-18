
const siteRouter = require('./site')
const loginRouter = require('./login')
const employeeRouter = require('./employee')
const tasksRouter = require('./tasks')
const authRouter = require('./auth')
const myTaskRouter = require('./my-task')
const dashboardRouter = require('./dashboard')
const approvalsRouter = require('./approvals')
const salaryRouter = require('./salary')
const announcementsRouter = require('./announcements')
const requireAuth = require('../app/middleware/requireAuth')
const requireManager = require('../app/middleware/requireManager')
const requireEmployee = require('../app/middleware/requireEmployee')


function route(app){

    app.use('/login', loginRouter)
    app.use('/dashboard', requireAuth, requireEmployee, dashboardRouter)
    app.use('/auth', requireAuth, authRouter)
    app.use('/approvals', requireAuth, approvalsRouter)
    app.use('/employee', requireAuth, requireManager, employeeRouter)
    app.use('/my-task', requireAuth, requireEmployee, myTaskRouter)
    app.use('/tasks', requireAuth, requireManager, tasksRouter)
    app.use('/salary', requireAuth, requireManager, salaryRouter)
    app.use('/announcements', requireAuth, requireManager, announcementsRouter)
    app.use('/', siteRouter)


    app.get("/logout", (req, res) => {
        res.clearCookie('token');
        res.redirect("/login");
    });
}

module.exports = route
