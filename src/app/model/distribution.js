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
  assignedAt: { type: Date, default: Date.now },
  checkInAt: { type: Date },
  completedAt: { type: Date },
});

module.exports = mongoose.model('Distributions', Distribution);
