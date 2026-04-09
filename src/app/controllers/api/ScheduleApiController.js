const User = require('../../model/user');
const Distribution = require('../../model/distribution');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = 'Asia/Ho_Chi_Minh'; // UTC+7

class ScheduleApiController {
    async getSchedule(req, res) {
        try {
            if (!req.user || !req.user._id) {
                return res.status(401).json({ ok: false, error: 'Unauthorized' });
            }

            // n8n gửi qua POST body, fallback sang query string nếu dùng GET
            // Ưu tiên: req.body → req.query
            let targetDateStr = (req.body?.date || req.query.date || '').trim();
            const employeeNameStr = ((req.body?.employeeName ?? req.query.employeeName) || '').trim();

            // Parse target date — luôn tính theo múi giờ Asia/Ho_Chi_Minh (UTC+7)
            let targetDate = dayjs().tz(TZ); // mặc định: hôm nay
            if (targetDateStr) {
                const parsed = dayjs.tz(targetDateStr, 'YYYY-MM-DD', TZ);
                if (parsed.isValid()) {
                    targetDate = parsed;
                } else {
                    console.warn(`[ScheduleAPI] date không hợp lệ: "${targetDateStr}" → fallback hôm nay`);
                }
            }
            const dateKey = targetDate.format('YYYY-MM-DD');
            console.log(`[ScheduleAPI] date param nhận được: "${targetDateStr}" → dateKey: ${dateKey}`);

            // Determine which employees to fetch tasks for
            let employeeIds = [];

            if (employeeNameStr) {
                // Search for employees by name (case insensitive)
                const users = await User.find({
                    name: { $regex: new RegExp(employeeNameStr, 'i') }
                }).lean();

                if (users.length === 0) {
                    return res.json({
                        ok: true,
                        date: dateKey,
                        total: 0,
                        message: `Không tìm thấy nhân viên nào có tên "${employeeNameStr}"`,
                        tasks: []
                    });
                }
                employeeIds = users.map(u => u._id);
            } else {
                // Default to the current logged in user
                employeeIds = [req.user._id];
            }

            // Fetch distributions assigned to those employees
            const distributions = await Distribution.find({ employeeID: { $in: employeeIds } })
                .populate('employeeID', 'name position role')
                .populate({
                    path: 'taskID',
                    match: { task_status: { $ne: 'archived' } }
                })
                .lean();

            // Filter tasks strictly by the requested date matching the task deadline
            const matchedTasks = [];
            for (const dist of distributions) {
                if (!dist.taskID || !dist.employeeID) continue;

                const task = dist.taskID;
                // Parse deadline từ MongoDB (lưu dạng UTC) → chuyển sang UTC+7 trước khi so sánh
                const rawDate = task.deadline || task.createdAt;
                const taskDeadline = dayjs.utc(rawDate).tz(TZ).format('YYYY-MM-DD');

                // Only include tasks scheduled for the exact target date
                if (taskDeadline === dateKey) {

                    // Format status nicely
                    let statusLabel = 'In progress';
                    if (dist.status === 'completed') statusLabel = 'Đã hoàn thành';
                    else if (dist.status === 'checked_in') statusLabel = 'Đang làm (Checked-in)';
                    else if (dist.status === 'late') statusLabel = 'Đang làm (Check-in trễ)';

                    matchedTasks.push({
                        employeeName: dist.employeeID.name,
                        position: dist.employeeID.position,
                        taskName: task.name_task || 'Không tên',
                        description: task.description_task || '',
                        time: `${task.dateStart || '--:--'} - ${task.dateEnd || '--:--'}`,
                        status: statusLabel
                    });
                }
            }

            // Return clean JSON
            res.json({
                ok: true,
                date: dateKey,
                total: matchedTasks.length,
                tasks: matchedTasks
            });

        } catch (error) {
            console.error('Schedule API Error:', error);
            // PHẢI trả 200 — n8n dừng workflow khi nhận 4xx/5xx từ HTTP Request tool
            // AI Agent sẽ đọc { ok: false } trong body và tự xử lý thay vì crash
            res.status(200).json({ ok: false, tool: 'get_schedule', error: 'Không thể lấy lịch trình lúc này. Vui lòng thử lại sau.' });
        }
    }
}

module.exports = new ScheduleApiController();
