const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const User = new Schema({
  name: { type: String, default: 'no name' },
  position: { type: String, min: 0, require: true},
  maxtime: { type: Number, default: 8 , min: 0},
  trangthai: { type: String, default: 'active' },
},
{
  timestamps: true,
}
);

module.exports = mongoose.model('Users', User);