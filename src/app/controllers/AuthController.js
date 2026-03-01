const User = require('../model/user');
const Distributions = require('../model/distribution');
const sharp = require('sharp');
const bcrypt = require('bcrypt');
const fs = require('fs/promises');
const { mongooseToObject, multipleMongooseToObject } = require('../../until/mongoose');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
let fileTypeFromBufferFn = null;

function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
}

function isValidPhone(value) {
    const digits = String(value || '').replace(/\D/g, '');
    return digits.length >= 8 && digits.length <= 15;
}

async function detectFileType(buffer) {
    if (!fileTypeFromBufferFn) {
        const module = await import('file-type');
        fileTypeFromBufferFn = module.fileTypeFromBuffer;
    }
    return fileTypeFromBufferFn(buffer);
}

class AuthController {
    async index(req, res) {
        try {
            const userId = req.session?.user?._id;
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
                req.session.destroy(() => {
                    res.redirect('/login');
                });
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
        } catch (error) {
            res.status(500).send('error');
        }
    }

    async uploads(req, res) {
        try {
            const userId = req.session?.user?._id;
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

            if (type === 'avatar' && req.session.user) {
                req.session.user.avatar = imagePath;
            }

            req.flash('success', type === 'avatar' ? 'Avatar updated successfully.' : 'Cover image updated successfully.');
            res.redirect('/auth');
        } catch (error) {
            if (req.file?.path) {
                await fs.unlink(req.file.path).catch(() => {});
            }
            req.flash('error', 'Unable to upload image right now.');
            res.redirect('/auth');
        }
    }

    async updateProfile(req, res) {
        try {
            const userId = req.session?.user?._id;
            if (!userId) {
                req.flash('error', 'Please sign in to continue.');
                return res.redirect('/login');
            }

            const payload = {
                name: String(req.body.name || '').trim(),
                email: normalizeEmail(req.body.email),
                SDT: String(req.body.SDT || '').trim(),
                state: String(req.body.state || '').trim(),
                introduce: String(req.body.introduce || '').trim(),
            };

            if (!payload.name || !payload.email || !payload.SDT) {
                req.flash('error', 'Please fill in all required fields.');
                return res.redirect('/auth');
            }
            if (!EMAIL_REGEX.test(payload.email) || !isValidPhone(payload.SDT)) {
                req.flash('error', 'Email or phone number is invalid.');
                return res.redirect('/auth');
            }

            const emailExists = await User.findOne({
                _id: { $ne: userId },
                email: payload.email,
            }).lean();
            if (emailExists) {
                req.flash('error', 'This email is already in use by another account.');
                return res.redirect('/auth');
            }

            await User.updateOne({ _id: userId }, payload);

            if (req.session.user) {
                req.session.user.name = payload.name;
            }

            req.flash('success', 'Profile updated successfully.');
            res.redirect('/auth');
        } catch (error) {
            req.flash('error', 'Unable to update profile.');
            res.redirect('/auth');
        }
    }

    async changePassword(req, res) {
        try {
            const userId = req.session?.user?._id;
            if (!userId) {
                req.flash('error', 'Please sign in to continue.');
                return res.redirect('/login');
            }

            const currentPassword = String(req.body.currentPassword || '');
            const newPassword = String(req.body.newPassword || '');
            const confirmPassword = String(req.body.confirmPassword || '');

            if (!currentPassword || !newPassword || !confirmPassword) {
                req.flash('error', 'Please fill in all password fields.');
                return res.redirect('/auth');
            }
            if (newPassword.length < 6 || newPassword !== confirmPassword) {
                req.flash('error', 'New password must be at least 6 characters and match confirmation.');
                return res.redirect('/auth');
            }

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
        } catch (error) {
            req.flash('error', 'Unable to change password right now.');
            res.redirect('/auth');
        }
    }
}

module.exports = new AuthController();
