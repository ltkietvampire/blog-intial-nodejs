const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Task = new Schema({
  name_task: { type: String, default: 'no name' },
  description_task: { type: String, default: 'No description' },
  estimated_total_hours: { type: Number, min: 0, require: true},
  priority: { type: Number, default: 1 },
  deadline: { type: Date, min: Date.now },
  assignee: { type: Boolean, default: false},
  dateStart: { type: String,  require: true},
  dateEnd: { type: String,},  
},
{
  timestamps: true,
}
);

module.exports = mongoose.model('Tasks', Task);