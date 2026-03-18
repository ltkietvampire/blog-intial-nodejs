const { z } = require('zod');
const { isValidPhone } = require('./validators');

const emailSchema = z.string().trim().email({ message: "Invalid email format" });
const passwordSchema = z.string().min(6, { message: "Password must be at least 6 characters" });
const phoneSchema = z.string().trim().refine(isValidPhone, { message: "Invalid phone number" });

module.exports = {
  emailSchema,
  passwordSchema,
  phoneSchema
};
