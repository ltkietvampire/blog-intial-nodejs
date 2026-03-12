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
const approvalNotifications = require('./app/middleware/approvalNotifications');
const leaveBusySync = require('./app/middleware/leaveBusySync');
const syncSessionUser = require('./app/middleware/syncSessionUser');
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
app.use(syncSessionUser);

app.use(express.static(path.join(__dirname, 'public')));
// http logger
app.use(morgan('combined'))
app.engine('hbs', engine({
  extname: '.hbs',
  helpers: {
    json: (context) => JSON.stringify(context),
    assetPath: (value) => {
      const raw = String(value || '').trim();
      if (!raw) return '';
      if (/^(https?:)?\/\//i.test(raw) || raw.startsWith('/') || raw.startsWith('data:')) {
        return raw;
      }
      return `/${raw.replace(/^\.?\//, '')}`;
    },
  },
}));
app.set('view engine',  'hbs');
app.set('views', path.join(__dirname, 'resources/views'));

app.use((req, res, next) => {
    const currentUser = req.session.user || null;
    res.locals.currentUser = currentUser;
    res.locals.isEmployee = currentUser ? isEmployeePosition(currentUser) : false;
    res.locals.isManager = currentUser ? isManagerPosition(currentUser) : false;
    next();
    });
app.use(leaveBusySync);
app.use(taskNotifications);
app.use(approvalNotifications);
route (app);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
