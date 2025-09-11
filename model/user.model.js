// models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    password: { type: String },

    reward: { type: Number, default: 0 },
    studentCount: { type: Number, default: 0 },
    referralCode: { type: String },

    role: { type: String, enum: ["user", "admin"], default: "user" },

    lastStudentAddedAt: { type: Date, default: null },
    blockUntil: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
