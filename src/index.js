const express = require('express')
const morgan = require('morgan')
const {engine} = require('express-handlebars') ;
const path = require('path');
const route = require('./routes');
const database = require('./config/db')
const methodOverride = require('method-override')


const app = express()
const port = 3000

database.connect();

app.use(express.urlencoded({
  extended:  true
}
))

app.use(express.json());
app.use(methodOverride('_method'))


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

route (app);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
