const User = require('../model/user')
const Distribution = require('../model/distribution');
const Salary = require('../model/salary');
const bcrypt = require("bcrypt");
const { z } = require('zod');
const { multipleMongooseToObject } = require('../../util/mongoose');
const { normalizeRole } = require('../middleware/roleUtils');
const { isValidPhone } = require('../../util/validators');
const asyncHandler = require('express-async-handler');

const saltRound = 10
const USER_STATUS_VALUES = ['status-active', 'status-busy', 'status-off'];
const USER_STATUSES = new Set(USER_STATUS_VALUES);
const USER_ROLE_VALUES = ['employee', 'manager', 'director', 'admin'];

function normalizeStatus(value) {
    const status = String(value || '').trim();
    return USER_STATUSES.has(status) ? status : 'status-active';
}

function clampMaxTime(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return 8;
    }
    return Math.min(8, Math.max(0, parsed));
}

function clampHourlyRate(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return 0;
    }
    return Math.max(0, parsed);
}


const emailSchema = z.string().trim().email().transform((value) => value.toLowerCase());
const phoneSchema = z.string().trim().refine(isValidPhone, {
    message: 'Invalid phone number',
});

const employeeCreateSchema = z.object({
    name: z.string().trim().min(1),
    role: z.preprocess(
        (value) => String(value || '').trim().toLowerCase(),
        z.enum(USER_ROLE_VALUES)
    ),
    position: z.string().trim().min(1),
    hourlyRate: z.coerce.number().min(0).optional(),
    email: emailSchema,
    password: z.string().min(6),
    SDT: phoneSchema,
    maxtime: z.coerce.number().optional(),
    trangthai: z.preprocess(
        (value) => String(value || '').trim(),
        z.enum(USER_STATUS_VALUES).optional()
    ),
});

const employeeUpdateSchema = z.object({
    name: z.string().trim().min(1).optional(),
    role: z.preprocess(
        (value) => String(value || '').trim().toLowerCase(),
        z.enum(USER_ROLE_VALUES).optional()
    ),
    position: z.string().trim().min(1).optional(),
    hourlyRate: z.coerce.number().min(0).optional(),
    email: emailSchema.optional(),
    SDT: phoneSchema.optional(),
    maxtime: z.coerce.number().optional(),
    trangthai: z.preprocess(
        (value) => String(value || '').trim(),
        z.enum(USER_STATUS_VALUES).optional()
    ),
});


class EmployeeController {
    constructor() {
        this.index = this.index.bind(this);
        this.store = this.store.bind(this);
        this.update = this.update.bind(this);
        this.delete = this.delete.bind(this);
        this.bulkDelete = this.bulkDelete.bind(this);
        this.bulkUpdateStatus = this.bulkUpdateStatus.bind(this);
    }

    async index(req, res, next) {
        User.find({})
            .then(Users => {
                res.render('employees', {
                    userss: multipleMongooseToObject(Users)
                })
            })
            .catch(next)
    }


    store = asyncHandler(async (req, res) => {
        const parsed = employeeCreateSchema.safeParse(req.body);
        if (!parsed.success) {
            req.flash('error', 'Invalid employee data. Please review your input.');
            return res.redirect('/employee');
        }

        const users = parsed.data;
        users.maxtime = clampMaxTime(users.maxtime);
        users.hourlyRate = clampHourlyRate(users.hourlyRate);
        users.trangthai = normalizeStatus(users.trangthai);
        users.role = normalizeRole(users.role);

        // Manager không được tạo tài khoản với role Director hoặc Admin
        const currentUserRole = normalizeRole(req.user?.role);
        if (currentUserRole === 'manager' && ['director', 'admin'].includes(users.role)) {
            req.flash('error', 'You do not have permission to create accounts with Director or Admin role.');
            return res.redirect('/employee');
        }

        const emailExists = await User.findOne({ email: users.email }).lean();
        if (emailExists) {
            req.flash('error', 'Email already exists. Please use another email.');
            return res.redirect('/employee');
        }

        users.password = await bcrypt.hash(users.password, saltRound);
        const user = new User(users);
        await user.save();
        req.flash('success', 'Employee created successfully.');
        res.redirect('/employee');
    });

    update = asyncHandler(async (req, res) => {
        const parsed = employeeUpdateSchema.safeParse(req.body);
        if (!parsed.success) {
            req.flash('error', 'Invalid update data.');
            return res.redirect('/employee');
        }

        const payload = parsed.data;

        // Manager không được cập nhật role thành Director hoặc Admin
        if (payload.role !== undefined) {
            const currentUserRole = normalizeRole(req.user?.role);
            if (currentUserRole === 'manager' && ['director', 'admin'].includes(normalizeRole(payload.role))) {
                req.flash('error', 'You do not have permission to assign Director or Admin role.');
                return res.redirect('/employee');
            }
        }

        if (payload.email) {
            const emailExists = await User.findOne({
                _id: { $ne: req.params.id },
                email: payload.email,
            }).lean();
            if (emailExists) {
                req.flash('error', 'Email already exists. Please use another email.');
                return res.redirect('/employee');
            }
        }
        if (payload.trangthai !== undefined) {
            payload.trangthai = normalizeStatus(payload.trangthai);
        }
        if (payload.role !== undefined) {
            payload.role = normalizeRole(payload.role);
        }
        if (payload.hourlyRate !== undefined) {
            payload.hourlyRate = clampHourlyRate(payload.hourlyRate);
        }
        if (payload.maxtime !== undefined) {
            payload.maxtime = clampMaxTime(payload.maxtime);
        }

        await User.updateOne({ _id: req.params.id }, payload);
        //cập nhật chính mình thì phần JWT (syncSessionUser) sẽ tự fetch lại data mỗi khi gửi req
        req.flash('success', 'Employee updated successfully.');
        res.redirect('/employee');
    });

    delete = asyncHandler(async (req, res) => {
        const userId = req.params.id;

        // Check if employee has any active (non-completed) task assignments
        const activeDistribution = await Distribution.findOne({
            employeeID: userId,
            status: { $nin: ['completed'] }
        }).lean();

        if (activeDistribution) {
            req.flash('error', 'Cannot delete! This employee still has active task assignments.');
            return res.redirect('/employee');
        }

        // Check if employee has any unpaid salary records
        const pendingSalary = await Salary.findOne({
            employeeID: userId,
            status: { $in: ['draft', 'pending'] }
        }).lean();

        if (pendingSalary) {
            req.flash('error', 'Cannot delete! This employee has unpaid salary records (draft/pending).');
            return res.redirect('/employee');
        }

        await User.deleteOne({ _id: userId });
        req.flash('success', 'Employee account deleted successfully.');
        res.redirect('/employee');
    });

    bulkDelete = asyncHandler(async (req, res) => {
        const idsRaw = Array.isArray(req.body.ids) ? req.body.ids : [req.body.ids];
        const ids = idsRaw
            .map((id) => String(id || '').trim())
            .filter(Boolean);

        if (!ids.length) {
            req.flash('error', 'Please select at least one employee to delete.');
            return res.redirect('/employee');
        }

        // Lọc ra những ID bị chặn (còn task đang làm hoặc lương chưa trả)
        const [activeDistributions, pendingSalaries] = await Promise.all([
            Distribution.find({ employeeID: { $in: ids }, status: { $nin: ['completed'] } }).distinct('employeeID'),
            Salary.find({ employeeID: { $in: ids }, status: { $in: ['draft', 'pending'] } }).distinct('employeeID'),
        ]);

        const blockedIds = new Set([
            ...activeDistributions.map(String),
            ...pendingSalaries.map(String),
        ]);

        const allowedIds = ids.filter(id => !blockedIds.has(String(id)));

        if (blockedIds.size > 0 && allowedIds.length === 0) {
            req.flash('error', `Không thể xóa ${blockedIds.size} nhân viên đã chọn vì tất cả đều đang có công việc hoặc bảng lương chưa hoàn tất.`);
            return res.redirect('/employee');
        }

        if (!allowedIds.length) {
            req.flash('error', 'No employees were deleted.');
            return res.redirect('/employee');
        }

        const result = await User.deleteMany({ _id: { $in: allowedIds } });
        const deletedCount = Number(result.deletedCount) || 0;

        let message = `Đã xóa ${deletedCount} nhân viên thành công.`;
        if (blockedIds.size > 0) {
            message += ` (${blockedIds.size} nhân viên bị bỏ qua vì đang có công việc hoặc lương chưa thanh toán.)`;
        }

        req.flash('success', message);
        return res.redirect('/employee');
    });

    bulkUpdateStatus = asyncHandler(async (req, res) => {
        const idsRaw = Array.isArray(req.body.ids) ? req.body.ids : [req.body.ids];
        const ids = idsRaw
            .map((id) => String(id || '').trim())
            .filter(Boolean);

        const rawStatus = String(req.body.trangthai || '').trim();
        if (!USER_STATUSES.has(rawStatus)) {
            req.flash('error', 'Invalid status for bulk update.');
            return res.redirect('/employee');
        }
        const targetStatus = rawStatus;
        if (!ids.length) {
            req.flash('error', 'Please select at least one employee to update.');
            return res.redirect('/employee');
        }

        const result = await User.updateMany(
            { _id: { $in: ids } },
            { trangthai: targetStatus }
        );
        const modifiedCount = Number(result.modifiedCount) || Number(result.nModified) || 0;

        if (!modifiedCount) {
            req.flash('error', 'No employee status was changed.');
            return res.redirect('/employee');
        }

        req.flash('success', `Updated status for ${modifiedCount} employee(s).`);
        return res.redirect('/employee');
    });
}

module.exports = new EmployeeController;
