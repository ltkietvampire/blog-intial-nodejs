const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SystemConfig = new Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, required: true },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SystemConfig', SystemConfig);
