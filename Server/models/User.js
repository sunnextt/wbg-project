const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  username: { type: String, default: '' },
  Fullname: { type: String, default: '' },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  online: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);