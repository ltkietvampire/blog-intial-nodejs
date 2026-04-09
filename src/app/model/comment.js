const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CommentSchema = new Schema({
    taskID: { 
        type: Schema.Types.ObjectId, 
        ref: 'Tasks', 
        required: true 
    },
    userID: { 
        type: Schema.Types.ObjectId, 
        ref: 'Users', 
        required: true 
    },
    content: { 
        type: String, 
        required: true 
    },
    attachments: [{ 
        type: String 
    }],
}, { 
    timestamps: true 
});

module.exports = mongoose.model('Comments', CommentSchema);
