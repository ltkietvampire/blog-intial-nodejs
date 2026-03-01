const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Task = new Schema({
  name_task: { type: String, default: 'no name' },
  description_task: { type: String, default: 'No description' },
  estimated_total_hours: { type: Number, min: 0, require: true},
  priority: { type: Number, default: 1 },
  deadline: { type: Date, min: Date.now-1 },
  recurrence_type: {
    type: String,
    enum: ['none', 'daily', 'weekly', 'monthly'],
    default: 'none',
  },
  task_status: {
    type: String,
    enum: ['active', 'completed', 'archived'],
    default: 'active',
  },
  completedAt: { type: Date },
  archivedAt: { type: Date },
  required_people: { type: Number, default: 1, min: 1 },
  assigned_people_count: { type: Number, default: 0, min: 0 },
  assignee: { type: Boolean, default: false},
  dateStart: { type: String,  require: true},
  dateEnd: { type: String,},  
},
{
  timestamps: true,
}
);

module.exports = mongoose.model('Tasks', Task);
