const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  firebaseUID: { type: String, required: true, unique: true },
  email: String,
  role: { type: String, default: "user" },
});

module.exports = mongoose.model("User", userSchema);
