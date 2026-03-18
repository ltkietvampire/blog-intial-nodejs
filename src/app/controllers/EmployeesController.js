const User = require('../model/user')
const bcrypt = require("bcrypt");
const { z } = require('zod');
const { multipleMongooseToObject } = require('../../util/mongoose');
const { normalizeRole } = require('../middleware/roleUtils');
const { isValidPhone } = require('../../util/validators');
const asyncHandler = require('express-async-handler');

const saltRound = 10
const USER_STATUS_VALUES = ['status-active', 'status-busy', 'status-off'];
const USER_STATUSES = new Set(USER_STATUS_VALUES);
const USER_ROLE_VALUES = ['employee', 'manager'];

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
            .then (Users => {
                res.render('employees', {
                    userss: multipleMongooseToObject(Users)
                })
                })
            .catch(next)
    }


    store = asyncHandler(async (req,res) => {
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

            await User.updateOne({_id: req.params.id}, payload);
            //cập nhật chính mình thì phần JWT (syncSessionUser) sẽ tự fetch lại data mỗi khi gửi req
            req.flash('success', 'Employee updated successfully.');
            res.redirect('/employee');
    });
    
    delete = asyncHandler(async (req, res) => {
        await User.deleteOne({_id: req.params.id});
        req.flash('success', 'Employee deleted successfully.');
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

            const result = await User.deleteMany({ _id: { $in: ids } });
            const deletedCount = Number(result.deletedCount) || 0;

            if (!deletedCount) {
                req.flash('error', 'No employees were deleted.');
                return res.redirect('/employee');
            }

            req.flash('success', `Deleted ${deletedCount} employee(s) successfully.`);
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
