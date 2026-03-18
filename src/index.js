const express = require('express')
const morgan = require('morgan')
const {engine} = require('express-handlebars') ;
const path = require('path');
const route = require('./routes');
const database = require('./config/db')
const methodOverride = require('method-override')
const cookieParser = require('cookie-parser');
const flashMessage = require('./app/middleware/flashMessage');
const taskNotifications = require('./app/middleware/taskNotifications');
const approvalNotifications = require('./app/middleware/approvalNotifications');
const announcementNotifications = require('./app/middleware/announcementNotifications');
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
app.use(cookieParser());
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
    if (!res.locals.currentUser) {
      const currentUser = req.user || null;
      res.locals.currentUser = currentUser;
      res.locals.isEmployee = currentUser ? isEmployeePosition(currentUser) : false;
      res.locals.isManager = currentUser ? isManagerPosition(currentUser) : false;
    }
    next();
    });
app.use(leaveBusySync);
app.use(taskNotifications);
app.use(approvalNotifications);
app.use(announcementNotifications);
const errorHandler = require('./app/middleware/errorHandler');
route(app);
app.use(errorHandler);

app.listen(port, '0.0.0.0', () => {
  console.log(`Example app listening on port ${port}`)
})
