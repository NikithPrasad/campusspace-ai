const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['USER', 'ADMIN'];
const DESIGNATIONS = ['STUDENT', 'FACULTY', 'STAFF'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email'],
    },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ROLES, default: 'USER' },
    department: { type: String, trim: true, maxlength: 80 },
    // Students and faculty both use the USER role; this is shown to admins when reviewing
    designation: { type: String, enum: DESIGNATIONS, default: 'STUDENT' },
  },
  { timestamps: true }
);

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.set('toJSON', {
  transform(doc, ret) {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
module.exports.ROLES = ROLES;
module.exports.DESIGNATIONS = DESIGNATIONS;
