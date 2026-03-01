const express = require('express')
const morgan = require('morgan')
const {engine} = require('express-handlebars') ;
const path = require('path');
const route = require('./routes');
const database = require('./config/db')
const methodOverride = require('method-override')
const session = require("express-session");
const flashMessage = require('./app/middleware/flashMessage');
const taskNotifications = require('./app/middleware/taskNotifications');
const { isEmployeePosition, isManagerPosition } = require('./app/middleware/roleUtils');


const app = express()
const port = 3000

database.connect();

app.use(express.urlencoded({
  extended:  true
}
))

app.use(express.json());
app.use(methodOverride('_method'))
app.use(session({
  secret: "my_secret_key",
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 // 1 hour
  }
}))
app.use(flashMessage);

app.use(express.static(path.join(__dirname, 'public')));
// http logger
app.use(morgan('combined'))
app.engine('hbs', engine({
      extname: '.hbs',
      helpers: {
    json: context => JSON.stringify(context)
  }
}));
app.set('view engine',  'hbs');
app.set('views', path.join(__dirname, 'resources/views'));

app.use((req, res, next) => {
    const currentUser = req.session.user || null;
    res.locals.currentUser = currentUser;
    res.locals.isEmployee = currentUser ? isEmployeePosition(currentUser.position) : false;
    res.locals.isManager = currentUser ? isManagerPosition(currentUser.position) : false;
    next();
    });
app.use(taskNotifications);
route (app);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
