const mongoose = require('mongoose');

async function connect (){
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/database');
        console.log('kết nối thành công !')
    }
    catch (error){
        console.error('Lỗi kết nối:', error.message);
    }
}

module.exports  = {connect}