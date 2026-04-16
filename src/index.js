require('dotenv').config();
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
const chatbotConfigMiddleware = require('./app/middleware/chatbotConfigMiddleware');
const { isEmployeePosition, isManagerPosition } = require('./app/middleware/roleUtils');
const { i18next, middleware } = require('./config/i18n');

const app = express()
const port = 3000

database.connect();

// Backward compatibility for Express 5: res.redirect('back')
app.use((req, res, next) => {
    const originalRedirect = res.redirect;
    res.redirect = function(...args) {
        let pathIdx = args.length === 2 ? 1 : 0;
        if (args[pathIdx] === 'back') {
            args[pathIdx] = req.get('Referrer') || '/';
        }
        return originalRedirect.apply(this, args);
    };
    next();
});
app.use(express.urlencoded({
  extended:  true
}
))

app.use(express.json());
app.use(methodOverride('_method'))
app.use(cookieParser());
app.use(middleware.handle(i18next));
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
    eq: (a, b) => a === b,
    or: (a, b) => a || b,
    sum: (a, b) => (Number(a) || 0) + (Number(b) || 0),
    t: function (key, options) {
      if (options && options.data && options.data.root && options.data.root.t) {
        return options.data.root.t(key);
      }
      return key;
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
app.use(chatbotConfigMiddleware);
const errorHandler = require('./app/middleware/errorHandler');
route(app);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
