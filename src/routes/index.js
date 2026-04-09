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
const adminRouter = require('./admin')
const commentsRouter = require('./comments')
const apiRouter = require('./api')
const requireAuth = require('../app/middleware/requireAuth')
const requireManager = require('../app/middleware/requireManager')
const requireEmployee = require('../app/middleware/requireEmployee')
const SystemConfigService = require('../app/services/SystemConfigService')
const AuditService = require('../app/services/AuditService')

function route(app) {

    app.use(async (req, res, next) => {
        if (req.path.startsWith('/login') || req.path.startsWith('/logout')) return next();
        try {
            const isMaintenanceMode = await SystemConfigService.getConfig('maintenanceMode', false);
            if (isMaintenanceMode && !res.locals.isAdmin) {
                return res.status(503).send('<div style="text-align:center; padding: 50px; font-family: sans-serif;"><h1>Hệ thống đang được bảo trì</h1><p>Vui lòng kiên nhẫn và quay lại sau.</p></div>');
            }
        } catch (err) { }
        next();
    });

    app.use('/login', loginRouter)
    app.use('/dashboard', requireAuth, requireEmployee, dashboardRouter)
    app.use('/auth', requireAuth, authRouter)
    app.use('/approvals', requireAuth, approvalsRouter)
    app.use('/employee', requireAuth, requireManager, employeeRouter)
    app.use('/my-task', requireAuth, requireEmployee, myTaskRouter)
    app.use('/api/tasks', requireAuth, commentsRouter)
    app.use('/api', requireAuth, apiRouter)
    app.use('/tasks', requireAuth, requireManager, tasksRouter)
    app.use('/salary', requireAuth, requireManager, salaryRouter)
    app.use('/announcements', requireAuth, requireManager, announcementsRouter)
    app.use('/admin', adminRouter)
    app.use('/', siteRouter)


    app.get("/logout", async (req, res) => {
        const userId = req.user?._id || res.locals.currentUser?._id;
        if (userId) {
            await AuditService.log('LOGOUT', userId, `Đăng xuất hệ thống`);
        }
        res.clearCookie('token');
        res.redirect("/login");
    });
}

module.exports = route
