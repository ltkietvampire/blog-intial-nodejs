const mongoose = require('mongoose');
const fs = require('fs');

const User = require('./src/app/model/user');
const Task = require('./src/app/model/task');
const Distribution = require('./src/app/model/distribution');
const Comment = require('./src/app/model/comment');
const Salary = require('./src/app/model/salary');
const ApprovalRequest = require('./src/app/model/approvalRequest');
const Announcement = require('./src/app/model/announcement');

async function importData() {
    await mongoose.connect('mongodb://127.0.0.1:27017/database');
    console.log('[+] Đã kết nối Thành công tới Database!');

    const seedData = JSON.parse(fs.readFileSync('SEED_DATA.json', 'utf-8'));
    
    const fixOidAndDate = (obj) => {
        if (!obj) return obj;
        if (Array.isArray(obj)) return obj.map(fixOidAndDate);
        if (typeof obj === 'object') {
            if (obj.$oid) return obj.$oid; // Mongoose handles string IDs fine
            if (obj.$date) return new Date(obj.$date);
            const newObj = {};
            for(let key in obj) newObj[key] = fixOidAndDate(obj[key]);
            return newObj;
        }
        return obj;
    }
    
    try {
        console.log("Xóa dữ liệu cũ trong Database...");
        await User.deleteMany({});
        await Task.deleteMany({});
        await Distribution.deleteMany({});
        await Comment.deleteMany({});
        await Salary.deleteMany({});
        await ApprovalRequest.deleteMany({});
        await Announcement.deleteMany({});
        
        console.log("Bắt đầu đẩy dữ liệu KHỚP LOGIC vào các Bảng...");
        await User.insertMany(fixOidAndDate(seedData.users));
        console.log("-> Nhúng dữ liệu Users Xong!");
        
        await Task.insertMany(fixOidAndDate(seedData.tasks));
        console.log("-> Nhúng dữ liệu Tasks Xong!");
        
        await Distribution.insertMany(fixOidAndDate(seedData.distributions));
        console.log("-> Nhúng dữ liệu Distributions Xong!");
        
        await Comment.insertMany(fixOidAndDate(seedData.comments));
        console.log("-> Nhúng dữ liệu Comments Xong!");
        
        await Salary.insertMany(fixOidAndDate(seedData.salaries));
        console.log("-> Nhúng dữ liệu Salaries Xong!");
        
        await ApprovalRequest.insertMany(fixOidAndDate(seedData.approvalRequests));
        console.log("-> Nhúng dữ liệu Approvals Xong!");
        
        await Announcement.insertMany(fixOidAndDate(seedData.announcements));
        console.log("-> Nhúng dữ liệu Announcements Xong!");
        
        console.log("============ HOÀN TẤT ============");
    } catch (e) {
        console.error("Lỗi khi đẩy dữ liệu:", e);
    }
    process.exit();
}
importData();
