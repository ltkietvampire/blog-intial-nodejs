
const searchRouter = require('./search')
const siteRouter = require('./site')
const loginRouter = require('./login')
const employeeRouter = require('./employee')
const tasksRouter = require('./tasks')
const authRouter = require('./auth')
const statisticRouter = require('./statistics')
const myTaskRouter = require('./my-task')
const dashboardRouter = require('./dashboard')
const approvalsRouter = require('./approvals')
const requireAuth = require('../app/middleware/requireAuth')
const requireManager = require('../app/middleware/requireManager')
const requireEmployee = require('../app/middleware/requireEmployee')


function route(app){

    app.use('/search', searchRouter)
    app.post('/search', (req, res) => {
        console.log(req.body)
        res.render('search')
    })
    app.use('/login', loginRouter)
    app.use('/dashboard', requireAuth, requireEmployee, dashboardRouter)
    app.use('/auth', requireAuth, authRouter)
    app.use('/approvals', requireAuth, approvalsRouter)
    app.use('/statistic', requireAuth, requireManager, statisticRouter)
    app.use('/employee', requireAuth, requireManager, employeeRouter)
    app.use('/my-task', requireAuth, requireEmployee, myTaskRouter)
    app.use('/tasks', requireAuth, requireManager, tasksRouter)
    app.use('/', siteRouter)
    app.get("/logout", (req, res) => {
        req.session.destroy(() => {
            res.redirect("/login");
        });
    });
}

module.exports = route
