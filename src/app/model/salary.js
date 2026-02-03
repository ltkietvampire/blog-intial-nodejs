const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Salary = new Schema({
  dateStart: { type: Date, require: true },
  totalTimes: { type: Date, min: Date.now },
});

module.exports = mongoose.model('Salarys', Salary); 