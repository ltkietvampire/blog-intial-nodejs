const User = require('../model/user');
const Distributions = require('../model/distribution');
const sharp = require('sharp');
const bcrypt = require('bcrypt');
const fs = require('fs/promises');
const { mongooseToObject, multipleMongooseToObject } = require('../../util/mongoose');
const { normalizeEmail, isValidPhone } = require('../../util/validators');
const { z } = require('zod');
const asyncHandler = require('express-async-handler');
const { emailSchema, phoneSchema } = require('../../util/schemas');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
let fileTypeFromBufferFn = null;

async function detectFileType(buffer) {
    if (!fileTypeFromBufferFn) {
        const module = await import('file-type');
        fileTypeFromBufferFn = module.fileTypeFromBuffer;
    }
    return fileTypeFromBufferFn(buffer);
}

class AuthController {
    index = asyncHandler(async (req, res) => {
        const userId = req.user?._id;
            if (!userId) {
                req.flash('error', 'Please sign in to continue.');
                return res.redirect('/login');
            }

            const [user, dis] = await Promise.all([
                User.findById(userId),
                Distributions.find({ employeeID: userId })
                    .populate('taskID'),
            ]);

            if (!user) {
                res.clearCookie('token');
                res.redirect('/login');
                return;
            }

            const now = new Date();
            const weekStart = new Date(now);
            weekStart.setHours(0, 0, 0, 0);
            const day = weekStart.getDay() || 7;
            weekStart.setDate(weekStart.getDate() - day + 1);

            let inProgressTasks = 0;
            let completedTasks = 0;
            let weeklyWorkHours = 0;

            for (const row of dis) {
                const status = String(row?.status || 'working').toLowerCase();

                if (status === 'completed') {
                    completedTasks += 1;

                    const completedAt = row?.completedAt ? new Date(row.completedAt) : null;
                    if (completedAt && !Number.isNaN(completedAt.getTime()) && completedAt >= weekStart && completedAt <= now) {
                        const hours = Number(row?.taskID?.estimated_total_hours || 0);
                        if (Number.isFinite(hours) && hours > 0) {
                            weeklyWorkHours += hours;
                        }
                    }
                    continue;
                }

                if (status === 'working' || status === 'checked_in' || status === 'late') {
                    inProgressTasks += 1;
                }
            }

            res.render('auth', {
                user: mongooseToObject(user),
                dis: multipleMongooseToObject(dis),
                stats: {
                    inProgressTasks,
                    completedTasks,
                    weeklyWorkHours: Number(weeklyWorkHours.toFixed(2)),
                },
            });
    });

    uploads = asyncHandler(async (req, res) => {
        const userId = req.user?._id;
            if (!userId) {
                return res.redirect('/login');
            }

            const type = String(req.body.type || '');
            if (!['avatar', 'cover'].includes(type) || !req.file) {
                req.flash('error', 'Please select a valid image type to upload.');
                return res.redirect('/auth');
            }
            if (req.file.size > MAX_UPLOAD_SIZE) {
                await fs.unlink(req.file.path).catch(() => {});
                req.flash('error', 'File is too large (max 5MB).');
                return res.redirect('/auth');
            }

            const buffer = await fs.readFile(req.file.path);
            const fileType = await detectFileType(buffer);
            if (!fileType || !ALLOWED_MIME_TYPES.has(fileType.mime)) {
                await fs.unlink(req.file.path).catch(() => {});
                req.flash('error', 'Invalid file. Only PNG, JPG, and WEBP are allowed.');
                return res.redirect('/auth');
            }

            const filename = `${type}-${Date.now()}.webp`;

            await sharp(buffer)
                .resize(type === 'avatar' ? 300 : 1200)
                .webp({ quality: 85 })
                .toFile(`src/public/uploads/${filename}`);
            await fs.unlink(req.file.path).catch(() => {});

            const imagePath = `/uploads/${filename}`;
            await User.updateOne({ _id: userId }, { [type]: imagePath });

            // with JWT, the syncSessionUser middleware fetches the fresh user data on every request anyway


            req.flash('success', type === 'avatar' ? 'Avatar updated successfully.' : 'Cover image updated successfully.');
            res.redirect('/auth');
    });

    updateProfile = asyncHandler(async (req, res) => {
        const userId = req.user?._id;
            if (!userId) {
                req.flash('error', 'Please sign in to continue.');
                return res.redirect('/login');
            }

        const payload = z.object({
            name: z.string().trim().min(2, "Name must be at least 2 characters"),
            email: emailSchema,
            SDT: phoneSchema,
            state: z.string().trim().optional(),
            introduce: z.string().trim().optional(),
        }).parse(req.body);

            const emailExists = await User.findOne({
                _id: { $ne: userId },
                email: payload.email,
            }).lean();
            if (emailExists) {
                req.flash('error', 'This email is already in use by another account.');
                return res.redirect('/auth');
            }

            await User.updateOne({ _id: userId }, payload);

            // syncSessionUser gets fresh user on next request

            req.flash('success', 'Profile updated successfully.');
            res.redirect('/auth');
    });

    changePassword = asyncHandler(async (req, res) => {
        const userId = req.user?._id;
            if (!userId) {
                req.flash('error', 'Please sign in to continue.');
                return res.redirect('/login');
            }

        const { currentPassword, newPassword, confirmPassword } = z.object({
            currentPassword: z.string().min(1, "Current password is required"),
            newPassword: z.string().min(6, "New password must be at least 6 characters"),
            confirmPassword: z.string().min(6, "Confirm password must match"),
        }).refine(data => data.newPassword === data.confirmPassword, {
            message: "Passwords don't match",
            path: ["confirmPassword"]
        }).parse(req.body);

            const user = await User.findById(userId).select('password').lean();
            if (!user) {
                req.flash('error', 'Account not found. Please sign in again.');
                return res.redirect('/login');
            }

            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                req.flash('error', 'Current password is incorrect.');
                return res.redirect('/auth');
            }

            const hashed = await bcrypt.hash(newPassword, 10);
            await User.updateOne({ _id: userId }, { password: hashed });
            req.flash('success', 'Password changed successfully.');
            res.redirect('/auth');
    });
}

module.exports = new AuthController();
