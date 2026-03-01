const mongoose = require('mongoose');

async function connect (){
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/database');
        console.log('Database connected successfully!')
    }
    catch (error){
        console.error('Database connection error:', error.message);
    }
}

module.exports  = {connect}
