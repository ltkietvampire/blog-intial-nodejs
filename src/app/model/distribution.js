const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Distribution = new Schema({
  employeeID: {
    type: Schema.Types.ObjectId,
    ref: "Users",
    required: true
  },  
  taskID: {
    type: Schema.Types.ObjectId,
    ref: "Tasks",
    required: true
  },
  status: { type: String, default: 'working'},
});

module.exports = mongoose.model('Distributions', Distribution);