
const searchRouter = require('./search')
const siteRouter = require('./site')
const signUpRouter = require('./signUp')
const employeeRouter = require('./employee')
const tasksRouter = require('./tasks')


function route(app){

    app.use('/search', searchRouter)
    app.post('/search', (req, res) => {
        console.log(req.body)
        res.render('search')
    })
    app.use('/signup', signUpRouter)
    app.use('/employee', employeeRouter)
    app.use('/tasks', tasksRouter)
    app.use('/', siteRouter)
}

module.exports = route