
const searchRouter = require('./search')
const siteRouter = require('./site')


function route(app){


    app.use('/search', searchRouter)
    app.post('/search', (req, res) => {
        console.log(req.body)
        res.render('search')
    })
    app.use('/', siteRouter)
}

module.exports = route