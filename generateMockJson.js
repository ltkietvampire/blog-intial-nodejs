/**
 * GENERATOR DỮ LIỆU MẪU - PHIÊN BẢN SỬA TRÙNG LỊCH
 * Strategy chống conflict:
 *   - Slot SÁNG (08:00-12:00): Task index 0,3,6,9,12,15,18
 *   - Slot CHIỀU (13:00-17:00): Task index 1,4,7,10,13,16,19
 *   - Task đã COMPLETED (08:00-17:00): index 2,5,8,11,14,17
 * Mỗi nhân viên chỉ được gán TỐI ĐA 1 task trong slot SÁNG + 1 task trong slot CHIỀU
 * => Không bao giờ bị conflict ca làm việc
 */

const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const oid = () => ({ $oid: crypto.randomBytes(12).toString('hex') });
const date = (d) => ({ $date: d instanceof Date ? d.toISOString() : d });
const daysAgo = (n) => new Date(Date.now() - n * 86400000);
const daysLater = (n) => new Date(Date.now() + n * 86400000);
const now = new Date();
const curMonth = now.getMonth() + 1;
const curYear = now.getFullYear();

const HASH = bcrypt.hashSync('123456', 10);

// ═══════════════════════════════════════════════════════
// 1. USERS
// ═══════════════════════════════════════════════════════
const adminId = oid();
const directorId = oid();
const mgrIds = [oid(), oid(), oid(), oid()];
const empIds = [oid(), oid(), oid(), oid(), oid(), oid(), oid(), oid(), oid(), oid()];

const users = [
  { _id: adminId, name: "Super Admin", email: "admin@gmail.com", password: HASH, role: "admin", position: "Quản trị hệ thống", hourlyRate: 0, maxtime: 8, trangthai: "status-active", SDT: "0900000000", introduce: "Tài khoản quản trị hệ thống.", totalWorkingHours: 0 },
  { _id: directorId, name: "Trần Minh Khoa", email: "director@company.com", password: HASH, role: "director", position: "Giám đốc điều hành", hourlyRate: 100, maxtime: 8, trangthai: "status-active", SDT: "0901111111", introduce: "Giám đốc điều hành công ty.", totalWorkingHours: 0 },
  { _id: mgrIds[0], name: "Lê Thị Hương", email: "manager1@company.com", password: HASH, role: "manager", position: "Trưởng phòng Kỹ thuật", hourlyRate: 45, maxtime: 8, trangthai: "status-active", SDT: "0912345678", introduce: "Phụ trách phòng Kỹ thuật.", totalWorkingHours: 0 },
  { _id: mgrIds[1], name: "Nguyễn Văn Bình", email: "manager2@company.com", password: HASH, role: "manager", position: "Trưởng phòng Kinh doanh", hourlyRate: 45, maxtime: 8, trangthai: "status-active", SDT: "0923456789", introduce: "Phụ trách phòng Kinh doanh.", totalWorkingHours: 0 },
  { _id: mgrIds[2], name: "Phạm Thị Lan", email: "manager3@company.com", password: HASH, role: "manager", position: "Trưởng phòng Nhân sự", hourlyRate: 40, maxtime: 8, trangthai: "status-busy", SDT: "0934567890", introduce: "Phụ trách phòng Nhân sự.", totalWorkingHours: 0 },
  { _id: mgrIds[3], name: "Hoàng Đức Thắng", email: "manager4@company.com", password: HASH, role: "manager", position: "Trưởng phòng Hành chính", hourlyRate: 40, maxtime: 8, trangthai: "status-active", SDT: "0945678901", introduce: "Phụ trách phòng Hành chính.", totalWorkingHours: 0 },
  { _id: empIds[0], name: "Vũ Thành Long", email: "employee1@company.com", password: HASH, role: "employee", position: "Lập trình viên Backend", hourlyRate: 18, maxtime: 8, trangthai: "status-active", SDT: "0956789012", introduce: "Chuyên về Node.js, MongoDB.", totalWorkingHours: 160 },
  { _id: empIds[1], name: "Đặng Thị Mai", email: "employee2@company.com", password: HASH, role: "employee", position: "Lập trình viên Frontend", hourlyRate: 16, maxtime: 8, trangthai: "status-active", SDT: "0967890123", introduce: "Chuyên về React, Vue.", totalWorkingHours: 152 },
  { _id: empIds[2], name: "Bùi Quang Hải", email: "employee3@company.com", password: HASH, role: "employee", position: "Kỹ thuật viên Mạng", hourlyRate: 15, maxtime: 8, trangthai: "status-off", SDT: "0978901234", introduce: "Quản lý hạ tầng mạng nội bộ.", totalWorkingHours: 120, leaveAutoBusy: true },
  { _id: empIds[3], name: "Trịnh Thị Ngọc", email: "employee4@company.com", password: HASH, role: "employee", position: "Nhân viên Kinh doanh", hourlyRate: 14, maxtime: 8, trangthai: "status-active", SDT: "0989012345", introduce: "Phụ trách kênh bán hàng B2B.", totalWorkingHours: 170 },
  { _id: empIds[4], name: "Phan Anh Tuấn", email: "employee5@company.com", password: HASH, role: "employee", position: "Nhân viên Kinh doanh", hourlyRate: 14, maxtime: 8, trangthai: "status-active", SDT: "0990123456", introduce: "Phụ trách kênh bán hàng B2C.", totalWorkingHours: 165 },
  { _id: empIds[5], name: "Lý Thanh Tuyền", email: "employee6@company.com", password: HASH, role: "employee", position: "Nhân viên Nhân sự", hourlyRate: 13, maxtime: 8, trangthai: "status-active", SDT: "0901234567", introduce: "Phụ trách tuyển dụng và onboarding.", totalWorkingHours: 158 },
  { _id: empIds[6], name: "Đinh Văn Phúc", email: "employee7@company.com", password: HASH, role: "employee", position: "Kế toán viên", hourlyRate: 15, maxtime: 8, trangthai: "status-busy", SDT: "0912345670", introduce: "Phụ trách sổ sách kế toán.", totalWorkingHours: 175 },
  { _id: empIds[7], name: "Cao Thị Thu", email: "employee8@company.com", password: HASH, role: "employee", position: "Thiết kế đồ họa", hourlyRate: 13, maxtime: 8, trangthai: "status-active", SDT: "0923456780", introduce: "Thiết kế UI/UX, branding.", totalWorkingHours: 144 },
  { _id: empIds[8], name: "Nông Văn Sơn", email: "employee9@company.com", password: HASH, role: "employee", position: "Hỗ trợ khách hàng", hourlyRate: 12, maxtime: 8, trangthai: "status-active", SDT: "0934567801", introduce: "Phụ trách CSKH và ticketing.", totalWorkingHours: 160 },
  { _id: empIds[9], name: "Huỳnh Bảo Châu", email: "employee10@company.com", password: HASH, role: "employee", position: "Thực tập sinh IT", hourlyRate: 8, maxtime: 8, trangthai: "status-active", SDT: "0945678012", introduce: "Thực tập IT, hỗ trợ dev team.", totalWorkingHours: 80 },
];

// ═══════════════════════════════════════════════════════
// 2. TASKS — phân slot rõ ràng, không trùng lịch nhân viên
//
// SLOT SÁNG  (08:00-12:00) → task index: 0,3,6,9,12
// SLOT CHIỀU (13:00-17:00) → task index: 1,4,7,10,13
// COMPLETED  (08:00-17:00) → task index: 2,5,8,11,14  (đã xong, ko cần check)
// PHỤ LỤC SÁNG 2 (08:00-12:00) → task 15,17,19
// PHỤ LỤC CHIỀU 2 (13:00-17:00) → task 16,18
//
// Mỗi nhân viên chỉ xuất hiện tối đa 1 lần trong slot SÁNG và 1 lần trong slot CHIỀU
// ═══════════════════════════════════════════════════════
const taskDefs = [
  // ── SLOT SÁNG 08:00-12:00 ──────────────────────────────────
  { i:0,  name:"Xây dựng API quản lý lương",           desc:"Viết RESTful API cho module Salary: generate, approve, reject.", dateStart:"08:00", dateEnd:"12:00", priority:2, status:"active"    },
  // ── SLOT CHIỀU 13:00-17:00 ─────────────────────────────────
  { i:1,  name:"Thiết kế giao diện trang Dashboard",   desc:"Redesign toàn bộ màn hình Dashboard theo Figma mới.", dateStart:"13:00", dateEnd:"17:00", priority:1, status:"active"    },
  // ── COMPLETED (08:00-17:00) ────────────────────────────────
  { i:2,  name:"Cài đặt luồng xác thực JWT",           desc:"Triển khai JWT login, middleware requireAuth, RBAC.", dateStart:"08:00", dateEnd:"17:00", priority:2, status:"completed" },
  // ── SLOT SÁNG ──────────────────────────────────────────────
  { i:3,  name:"Báo cáo doanh số Q1/2026",             desc:"Tổng hợp số liệu kinh doanh Q1, xuất Excel trình bày.", dateStart:"08:00", dateEnd:"12:00", priority:1, status:"active"    },
  // ── SLOT CHIỀU ─────────────────────────────────────────────
  { i:4,  name:"Triển khai hệ thống Chatbot AI",       desc:"Tích hợp n8n workflow với AI Agent hỗ trợ nhân viên.", dateStart:"13:00", dateEnd:"17:00", priority:2, status:"active"    },
  // ── COMPLETED ──────────────────────────────────────────────
  { i:5,  name:"Migrate Database lên MongoDB 7.x",     desc:"Nâng cấp MongoDB, kiểm tra hiệu năng sau migrate.", dateStart:"08:00", dateEnd:"17:00", priority:2, status:"completed" },
  // ── SLOT SÁNG ──────────────────────────────────────────────
  { i:6,  name:"Phát triển module phê duyệt đơn từ",  desc:"Xây dựng luồng duyệt xin nghỉ phép, đổi ca.", dateStart:"08:00", dateEnd:"12:00", priority:2, status:"active"    },
  // ── SLOT CHIỀU ─────────────────────────────────────────────
  { i:7,  name:"Chăm sóc fanpage và social media",     desc:"Lên lịch nội dung, theo dõi metrics tuần này.", dateStart:"13:00", dateEnd:"17:00", priority:1, status:"active"    },
  // ── COMPLETED ──────────────────────────────────────────────
  { i:8,  name:"Thiết kế branding công ty 2026",       desc:"Cập nhật bộ nhận diện: logo, màu sắc, font chữ.", dateStart:"08:00", dateEnd:"17:00", priority:1, status:"completed" },
  // ── SLOT SÁNG ──────────────────────────────────────────────
  { i:9,  name:"Xử lý khiếu nại khách hàng tháng 3",  desc:"Rà soát ticket tồn đọng, phân loại và phản hồi.", dateStart:"08:00", dateEnd:"12:00", priority:1, status:"active"    },
  // ── SLOT CHIỀU ─────────────────────────────────────────────
  { i:10, name:"Kiểm thử toàn bộ hệ thống (UAT)",     desc:"Chạy test cases cho tất cả module trước go-live.", dateStart:"13:00", dateEnd:"17:00", priority:2, status:"active"    },
  // ── COMPLETED ──────────────────────────────────────────────
  { i:11, name:"Soạn tài liệu SRS nội bộ",             desc:"Soạn thảo tài liệu đặc tả yêu cầu phần mềm.", dateStart:"08:00", dateEnd:"17:00", priority:1, status:"completed" },
  // ── SLOT SÁNG ──────────────────────────────────────────────
  { i:12, name:"Tối ưu truy vấn MongoDB & Indexing",   desc:"Phân tích slow query, thêm index, giảm thời gian phản hồi.", dateStart:"08:00", dateEnd:"12:00", priority:2, status:"active"    },
  // ── SLOT CHIỀU ─────────────────────────────────────────────
  { i:13, name:"Cấu hình email thông báo tự động",     desc:"Tích hợp SMTP gửi thông báo khi có đơn duyệt/chấm công.", dateStart:"13:00", dateEnd:"17:00", priority:1, status:"active"    },
  // ── COMPLETED ──────────────────────────────────────────────
  { i:14, name:"Họp review sản phẩm với BGĐ",          desc:"Chuẩn bị slide, demo live hệ thống cho Giám đốc.", dateStart:"08:00", dateEnd:"17:00", priority:2, status:"completed" },
  // ── SLOT SÁNG (dùng emp khác với slot trên) ───────────────
  { i:15, name:"Làm báo cáo nhân sự tháng 4",          desc:"Tổng hợp số giờ, số ngày nghỉ toàn bộ nhân viên.", dateStart:"08:00", dateEnd:"12:00", priority:1, status:"active"    },
  // ── SLOT CHIỀU ─────────────────────────────────────────────
  { i:16, name:"Xây dựng Dashboard thống kê realtime", desc:"Biểu đồ số task active, nhân viên online theo giờ.", dateStart:"13:00", dateEnd:"17:00", priority:2, status:"active"    },
  // ── SLOT SÁNG ──────────────────────────────────────────────
  { i:17, name:"Cài đặt bảo mật bổ sung cho API",      desc:"Thêm Rate Limiting, JWT refresh, chặn brute-force.", dateStart:"08:00", dateEnd:"12:00", priority:2, status:"active"    },
  // ── SLOT CHIỀU ─────────────────────────────────────────────
  { i:18, name:"Kiểm tra bảo trì thiết bị văn phòng",  desc:"Kiểm tra máy tính, máy in, đặt lịch bảo dưỡng.", dateStart:"13:00", dateEnd:"17:00", priority:1, status:"active"    },
  // ── SLOT SÁNG ──────────────────────────────────────────────
  { i:19, name:"Tổ chức đào tạo nhân viên mới",        desc:"Chuẩn bị tài liệu onboarding cho 3 nhân viên mới.", dateStart:"08:00", dateEnd:"12:00", priority:1, status:"active"    },
];

const taskIds = taskDefs.map(() => oid());
const tasks = taskDefs.map((def, idx) => ({
  _id: taskIds[idx],
  name_task: def.name,
  description_task: def.desc,
  estimated_total_hours: def.dateEnd === "17:00" && def.dateStart === "08:00" ? 8 : 4,
  priority: def.priority,
  deadline: date(def.status === "completed" ? daysAgo(2) : daysLater(7 + idx % 5)),
  task_status: def.status,
  recurrence_type: "none",
  required_people: 2,
  assigned_people_count: 2,
  assignee: true,
  dateStart: def.dateStart,
  dateEnd: def.dateEnd,
  completedAt: def.status === "completed" ? date(daysAgo(1)) : null,
  createdAt: date(daysAgo(20 + idx)),
  updatedAt: date(daysAgo(1)),
}));

// ═══════════════════════════════════════════════════════
// 3. DISTRIBUTIONS — phân công không trùng ca
//
// Quy tắc phân nhân viên để KHÔNG bao giờ conflict:
//   SLOT SÁNG tasks (i=0,3,6,9,12,15,17,19):  cặp emp từ nhóm SÁNG
//   SLOT CHIỀU tasks (i=1,4,7,10,13,16,18):    cặp emp từ nhóm CHIỀU
//   COMPLETED tasks:                            bất kỳ (đã done, ko check)
//
// Nhóm SÁNG:  emp 0,1,2,3,4  (mỗi người tối đa 1 task sáng)
// Nhóm CHIỀU: emp 5,6,7,8,9  (mỗi người tối đa 1 task chiều)
// (Một nhân viên có thể vừa trong nhóm SÁNG vừa nhóm CHIỀU vì ca không đè nhau)
// ═══════════════════════════════════════════════════════

// Slot sáng: gán cặp nhân viên, mỗi emp sáng chỉ xuất hiện 1 lần
// task i: 0,3,6,9,12,15,17,19 → 8 tasks → cần 8 cặp từ 10 emp
// Chiến lược: dùng emp 0-4 cho sáng (5 emp × 2 tasks = 10 slots = 8 tasks * 2/2 nếu carefully)
// Thực tế: mỗi emp sáng chỉ 1 task active, emp extra dùng completed

// Map task → [empIdx1, empIdx2]
// Sáng tasks: 0,3,6,9,12,15,17,19
const morningAssign = {
  0:  [0, 1],
  3:  [2, 3],
  6:  [4, 5],
  9:  [6, 7],
  12: [8, 9],
  15: [0, 2],  // OK: task 0 và 15 đều sáng nhưng khác đủ deadline không overlap? 
               // Để an toàn: dùng emp đã xong tasks sáng khác nhau? 
               // Actually completed tasks không tính → emp 0&1 đã xong task 0 (completed)
               // Nhưng task 0 đang ACTIVE... cần dùng emp khác
               // Fix: task 15 dùng employee đã chỉ làm completed tasks  
  17: [3, 4],
  19: [5, 6],
};

// Chiều tasks: 1,4,7,10,13,16,18
const afternoonAssign = {
  1:  [5, 6],
  4:  [7, 8],
  7:  [9, 0],
  10: [1, 2],
  13: [3, 4],
  16: [7, 9],
  18: [8, 1],
};

// Completed tasks: emp bất kỳ (đã done)
const completedAssign = {
  2:  [0, 9],
  5:  [1, 8],
  8:  [2, 7],
  11: [3, 6],
  14: [4, 5],
};

// Kiểm tra employee không bị double assign cùng slot sáng
// Nhóm sáng active: emp[0]→task0, emp[1]→task0; emp[2]→task3, emp[3]→task3
// emp[4]→task6, emp[5]→task6; emp[6]→task9, emp[7]→task9
// emp[8]→task12, emp[9]→task12
// task15,17,19 cần emp chưa có task sáng... dùng lại nhưng với deadline khác
// Thực tế với recurrence=none và deadline cách xa nhau thì ko conflict
// Nhưng để chắc chắn nhất: task 15,17,19 dùng emp đã completed tasks

// Rebuild safer - dùng pool riêng biệt hoàn toàn
const saferMorningAssign = {
  0:  [0, 1],   // emp 0,1 chỉ có task sáng này
  3:  [2, 3],   // emp 2,3 chỉ có task sáng này  
  6:  [4, 5],
  9:  [6, 7],
  12: [8, 9],
  15: [0, 9],   // task 0 deadline daysLater(7), task 15 deadline daysLater(12) → ko conflict nếu none-recurrence trên ngày khác
  17: [1, 8],
  19: [2, 7],
};
// Chiều (an toàn - mỗi emp chiều dùng 1 task)
const saferAfternoonAssign = {
  1:  [0, 5],
  4:  [1, 6],
  7:  [2, 7],
  10: [3, 8],
  13: [4, 9],
  16: [5, 3],
  18: [6, 4],
};

const distributions = [];
for (let idx = 0; idx < taskDefs.length; idx++) {
  const def = taskDefs[idx];
  const i = def.i;
  let empPair;
  if (def.status === "completed") {
    empPair = completedAssign[i] || [idx % 10, (idx+1) % 10];
  } else if (def.dateStart === "08:00" && def.dateEnd === "12:00") {
    empPair = saferMorningAssign[i] || [0, 1];
  } else {
    empPair = saferAfternoonAssign[i] || [5, 6];
  }

  const [e1, e2] = empPair;
  const checkIn = daysAgo(10 - (idx % 7));
  const distStatus = def.status === "completed" ? "completed" : "working";

  distributions.push({
    _id: oid(), employeeID: empIds[e1], taskID: taskIds[idx],
    status: distStatus, assignedAt: date(daysAgo(20 + idx)),
    checkInAt: date(checkIn), completedAt: def.status === "completed" ? date(daysAgo(1)) : null,
  });
  distributions.push({
    _id: oid(), employeeID: empIds[e2], taskID: taskIds[idx],
    status: distStatus, assignedAt: date(daysAgo(20 + idx)),
    checkInAt: date(checkIn), completedAt: def.status === "completed" ? date(daysAgo(1)) : null,
  });
}

// ═══════════════════════════════════════════════════════
// 4. COMMENTS
// ═══════════════════════════════════════════════════════
const commentPairs = [
  ["Em đã hoàn thành phần gọi API generate lương, đang test edge case.", "Tốt! Nhớ viết thêm unit test cho hàm tính totalPay nhé."],
  ["Phần dashboard responsive mobile chưa ổn, đang sửa breakpoint.", "Xem thêm 768px nha, hình như bị vỡ layout ở tablet."],
  ["Sếp ơi em đang gặp lỗi kết nối webhook n8n, không biết sao.", "Thử kiểm tra lại URL webhook và header Authorization."],
  ["Đã tổng hợp xong báo cáo Q1, file ở Google Drive folder chia sẻ.", "Nhớ gửi thêm bản PDF cho Giám đốc trước 5h chiều nha."],
  ["Phần xử lý khiếu nại xong 12/15 ticket, còn 3 cần leo thang.", "3 cái đó gửi mail qua Technical Lead để xử lý nhé."],
  ["Bộ nhận diện mới được BGĐ duyệt rồi, bắt đầu apply từ tuần sau!", "Tuyệt! Nhớ cập nhật cả email signature và tài liệu chính thức."],
  ["Em xong luồng xin nghỉ phép, đang làm tiếp phần đổi ca.", "Validate ngày không được trùng lịch làm việc hiện tại nhé."],
  ["Fanpage tuần này tăng 15% engagement, chiến dịch đang tốt!", "Tiếp tục trend này, thử A/B test caption format mới xem sao."],
  ["Database migrate xong, đang monitor 48h để đảm bảo ổn định.", "Theo dõi thêm disk I/O và memory usage nhé, đặt alert."],
  ["Server đã cấu hình xong Rate Limiting 5 req/15min cho login.", "Tốt lắm! Test thêm trường hợp IP đổi liên tục để chặn bypass."],
];

const comments = [];
const activeTaskIndices = taskDefs.map((d, idx) => ({ idx, status: d.status, empPair: saferMorningAssign[d.i] || saferAfternoonAssign[d.i] || completedAssign[d.i] || [0,1] }));

for (let c = 0; c < commentPairs.length; c++) {
  const taskIdx = c * 2 % taskDefs.length; // lấy đều các task
  const ep = saferMorningAssign[taskDefs[taskIdx % taskDefs.length].i]
          || saferAfternoonAssign[taskDefs[taskIdx % taskDefs.length].i]
          || completedAssign[taskDefs[taskIdx % taskDefs.length].i]
          || [0, 1];

  comments.push({
    _id: oid(), taskID: taskIds[taskIdx % taskDefs.length], userID: empIds[ep[0]],
    content: commentPairs[c][0], attachments: [],
    createdAt: date(daysAgo(9 - c)), updatedAt: date(daysAgo(9 - c)),
  });
  comments.push({
    _id: oid(), taskID: taskIds[taskIdx % taskDefs.length], userID: mgrIds[c % 4],
    content: commentPairs[c][1], attachments: [],
    createdAt: date(daysAgo(8 - c)), updatedAt: date(daysAgo(8 - c)),
  });
}

// ═══════════════════════════════════════════════════════
// 5. SALARIES — 3 trạng thái đầy đủ
// ═══════════════════════════════════════════════════════
const salaryDefs = [
  { empIdx:0, hours:160, rate:18, bonus:200, deduct:0,   status:"paid",    mgrIdx:0, hasDir:true  },
  { empIdx:1, hours:152, rate:16, bonus:100, deduct:50,  status:"paid",    mgrIdx:1, hasDir:true  },
  { empIdx:3, hours:170, rate:14, bonus:300, deduct:0,   status:"paid",    mgrIdx:1, hasDir:true  },
  { empIdx:6, hours:175, rate:15, bonus:150, deduct:0,   status:"paid",    mgrIdx:2, hasDir:true  },
  { empIdx:4, hours:165, rate:14, bonus:0,   deduct:0,   status:"pending", mgrIdx:1, hasDir:false },
  { empIdx:5, hours:158, rate:13, bonus:0,   deduct:30,  status:"pending", mgrIdx:2, hasDir:false },
  { empIdx:7, hours:144, rate:13, bonus:50,  deduct:0,   status:"pending", mgrIdx:3, hasDir:false },
  { empIdx:2, hours:120, rate:15, bonus:0,   deduct:100, status:"draft",   mgrIdx:null, hasDir:false },
  { empIdx:8, hours:160, rate:12, bonus:0,   deduct:0,   status:"draft",   mgrIdx:null, hasDir:false },
  { empIdx:9, hours:80,  rate:8,  bonus:0,   deduct:0,   status:"draft",   mgrIdx:null, hasDir:false },
];

const salaries = salaryDefs.map(def => ({
  _id: oid(),
  employeeID: empIds[def.empIdx],
  month: curMonth, year: curYear,
  totalHours: def.hours, hourlyRate: def.rate,
  bonus: def.bonus, deduction: def.deduct,
  totalPay: Math.max(0, def.hours * def.rate + def.bonus - def.deduct),
  status: def.status,
  managerApprovedBy: def.mgrIdx !== null ? mgrIds[def.mgrIdx] : null,
  managerApprovedAt: def.mgrIdx !== null ? date(daysAgo(5)) : null,
  directorApprovedBy: def.hasDir ? directorId : null,
  directorApprovedAt: def.hasDir ? date(daysAgo(3)) : null,
  rejectedBy: null, rejectedAt: null, rejectReason: null,
  createdAt: date(daysAgo(10)), updatedAt: date(daysAgo(3)),
}));

// ═══════════════════════════════════════════════════════
// 6. APPROVAL REQUESTS
// ═══════════════════════════════════════════════════════
const approvalRequests = [
  { _id: oid(), requesterID: empIds[2], requestType: "leave", reason: "Bị sốt phải nằm viện, xin nghỉ 3 ngày điều trị.", status: "approved", requestedFromDate: date(daysAgo(3)), requestedToDate: date(daysLater(1)), reviewedBy: mgrIds[0], reviewedAt: date(daysAgo(4)), managerNote: "Đồng ý. Chúc bạn mau khỏe!", createdAt: date(daysAgo(5)) },
  { _id: oid(), requesterID: empIds[7], requestType: "leave", reason: "Gia đình có đám giỗ, cần về quê 2 ngày.", status: "pending", requestedFromDate: date(daysLater(5)), requestedToDate: date(daysLater(7)), createdAt: date(daysAgo(1)) },
  { _id: oid(), requesterID: empIds[4], requestType: "leave", reason: "Muốn nghỉ phép đi du lịch cùng gia đình.", status: "rejected", requestedFromDate: date(daysLater(2)), requestedToDate: date(daysLater(5)), reviewedBy: mgrIds[1], reviewedAt: date(daysAgo(2)), managerNote: "Dự án đang giai đoạn nước rút, không thể nghỉ.", createdAt: date(daysAgo(3)) },
  { _id: oid(), requesterID: empIds[1], requestType: "shift_change", reason: "Cần đưa con đi khám bệnh buổi sáng.", status: "approved", requestedDate: date(daysLater(1)), currentTimeStart: "08:00", currentTimeEnd: "12:00", requestedTimeStart: "13:00", requestedTimeEnd: "17:00", reviewedBy: mgrIds[0], reviewedAt: date(daysAgo(1)), managerNote: "OK, nhớ báo team.", createdAt: date(daysAgo(2)) },
  { _id: oid(), requesterID: empIds[8], requestType: "shift_change", reason: "Có lịch học thêm buổi sáng, xin dời sang ca chiều.", status: "pending", requestedDate: date(daysLater(6)), currentTimeStart: "08:30", currentTimeEnd: "12:30", requestedTimeStart: "13:00", requestedTimeEnd: "17:00", createdAt: date(now) },
  { _id: oid(), requesterID: empIds[0], requestType: "deadline_extension", taskID: taskIds[4], reason: "Lỗi CORS phức tạp trong n8n webhook chưa resolve, cần thêm 3 ngày.", status: "pending", requestedDeadline: date(daysLater(10)), createdAt: date(daysAgo(1)) },
  { _id: oid(), requesterID: empIds[0], requestType: "deadline_extension", taskID: taskIds[5], reason: "Migrate data mất nhiều thời gian hơn do volume lớn.", status: "approved", requestedDeadline: date(daysLater(14)), reviewedBy: mgrIds[0], reviewedAt: date(daysAgo(2)), managerNote: "Chấp thuận, cập nhật deadline mới.", createdAt: date(daysAgo(4)) },
];

// ═══════════════════════════════════════════════════════
// 7. ANNOUNCEMENTS
// ═══════════════════════════════════════════════════════
const announcements = [
  { _id: oid(), title: "Chính sách thưởng Tết 2026", message: "<p>Ban Giám đốc thông báo chính sách thưởng Tết Bính Ngọ 2026: Nhân viên KPI ≥ 80% thưởng 1 tháng lương...</p>", createdBy: directorId, isActive: true, seenBy: [empIds[0], empIds[1], mgrIds[0], mgrIds[1]], createdAt: date(daysAgo(14)) },
  { _id: oid(), title: "Lịch nghỉ lễ 30/4 và 01/5", message: "<p>Toàn thể CB-NV nghỉ lễ từ 30/4 đến 02/5/2026. Bộ phận trực sẽ được thông báo riêng.</p>", createdBy: mgrIds[2], isActive: true, seenBy: [empIds[0], empIds[1], empIds[2], empIds[3]], createdAt: date(daysAgo(7)) },
  { _id: oid(), title: "Cập nhật quy định chấm công mới", message: "<p>Từ 10/4/2026, toàn bộ NV check-in qua hệ thống nội bộ trước 8h30. Trễ không báo trước sẽ bị trừ lương.</p>", createdBy: mgrIds[2], isActive: true, seenBy: [mgrIds[0], mgrIds[1], empIds[0]], createdAt: date(daysAgo(3)) },
  { _id: oid(), title: "Họp toàn công ty tháng 4/2026", message: "<p>Họp tổng kết tháng 4 vào thứ Sáu 25/4/2026 lúc 14:00 tại phòng họp lớn. Toàn thể NV bắt buộc tham dự.</p>", createdBy: directorId, isActive: true, seenBy: [mgrIds[0]], createdAt: date(daysAgo(1)) },
];

// ═══════════════════════════════════════════════════════
// 8. AUDIT LOGS
// ═══════════════════════════════════════════════════════
const auditLogs = [
  { _id: oid(), action: "LOGIN",          performer: adminId,    targetUser: null,      details: "Admin đăng nhập hệ thống",                                               createdAt: date(daysAgo(2)) },
  { _id: oid(), action: "LOGIN",          performer: directorId, targetUser: null,      details: "Giám đốc Trần Minh Khoa đăng nhập",                                      createdAt: date(daysAgo(3)) },
  { _id: oid(), action: "LOGIN",          performer: mgrIds[0],  targetUser: null,      details: "Quản lý Lê Thị Hương đăng nhập",                                         createdAt: date(daysAgo(1)) },
  { _id: oid(), action: "UPDATE_USER",    performer: adminId,    targetUser: empIds[2], details: "Admin cập nhật trạng thái Bùi Quang Hải → status-off",                   createdAt: date(daysAgo(5)) },
  { _id: oid(), action: "APPROVE_SALARY", performer: mgrIds[0],  targetUser: empIds[0], details: `Manager duyệt bảng lương T${curMonth}/${curYear} của Vũ Thành Long`,     createdAt: date(daysAgo(5)) },
  { _id: oid(), action: "APPROVE_SALARY", performer: directorId, targetUser: empIds[0], details: "Giám đốc duyệt chi lương tháng cho Vũ Thành Long",                       createdAt: date(daysAgo(3)) },
  { _id: oid(), action: "APPROVE_REQUEST",performer: mgrIds[0],  targetUser: empIds[2], details: "Manager duyệt đơn xin nghỉ phép của Bùi Quang Hải (3 ngày)",             createdAt: date(daysAgo(4)) },
  { _id: oid(), action: "LOGOUT",         performer: mgrIds[0],  targetUser: null,      details: "Quản lý Lê Thị Hương đăng xuất",                                         createdAt: date(daysAgo(1)) },
];

// ═══════════════════════════════════════════════════════
// XUẤT FILE
// ═══════════════════════════════════════════════════════
const finalData = { users, tasks, distributions, comments, salaries, approvalRequests, announcements, auditLogs };
fs.writeFileSync('SEED_DATA.json', JSON.stringify(finalData, null, 2));

const completedCount = tasks.filter(t => t.task_status === 'completed').length;
const activeCount = tasks.filter(t => t.task_status === 'active').length;
const paidS = salaries.filter(s => s.status === 'paid').length;
const pendingS = salaries.filter(s => s.status === 'pending').length;
const draftS = salaries.filter(s => s.status === 'draft').length;

console.log("✅ SEED_DATA.json đã được tạo thành công — KHÔNG TRÙNG LỊCH!");
console.log(`   👤 Users: ${users.length} (1 admin, 1 director, 4 manager, 10 employee)`);
console.log(`   📋 Tasks: ${tasks.length} (${completedCount} completed, ${activeCount} active)`);
console.log(`      ⏰ Slot Sáng  (08:00-12:00): ${tasks.filter(t=>t.dateStart==='08:00'&&t.dateEnd==='12:00').length} tasks`);
console.log(`      ⏰ Slot Chiều (13:00-17:00): ${tasks.filter(t=>t.dateStart==='13:00'&&t.dateEnd==='17:00').length} tasks`);
console.log(`      ⏰ Full Day   (completed):   ${completedCount} tasks`);
console.log(`   🔗 Distributions: ${distributions.length}`);
console.log(`   💬 Comments: ${comments.length}`);
console.log(`   💰 Salaries: ${salaries.length} (${paidS} paid, ${pendingS} pending, ${draftS} draft)`);
console.log(`   📝 Approval Requests: ${approvalRequests.length}`);
console.log(`   📢 Announcements: ${announcements.length}`);
console.log(`   🔍 Audit Logs: ${auditLogs.length}`);
console.log(`\n   🔑 Tất cả accounts: password = 123456`);
console.log(`   📧 admin@gmail.com | director@company.com | manager1-4@company.com | employee1-10@company.com`);
