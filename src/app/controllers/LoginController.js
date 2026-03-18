const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');
const User = require("../model/user");
const { isEmployeePosition, normalizeRole } = require('../middleware/roleUtils');
const asyncHandler = require('express-async-handler');
const { z } = require('zod');
const { emailSchema, passwordSchema } = require('../../util/schemas');

const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

class LoginController {
    show(req, res){
        res.render('auth/login', {layout: false});
    }

    checked = asyncHandler(async (req, res) => {
        const { email, password } = loginSchema.parse(req.body);

        const user = await User.findOne({ email });
        if (!user) {
            req.flash('error', "Incorrect email or password.");
            return res.redirect('back');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            req.flash('error', "Incorrect email or password.");
            return res.redirect('back');
        }

        const token = jwt.sign(
            { sub: String(user._id), role: normalizeRole(user.role) },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        res.cookie('token', token, {
            httpOnly: true,
            sameSite: 'lax',
            secure: false,
        });
        if (isEmployeePosition(user)) {
            return res.redirect('/dashboard');
        }
        res.redirect("/");
    });
}

module.exports = new LoginController;
