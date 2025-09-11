const mongoose = require("mongoose");
const Counter = require("./counter.model");

const studentSchema = new mongoose.Schema({
  studentName: { type: String, required: true },
  studentId: { type: String, unique: true }, // auto-generate hoga
  dob: { type: Date, required: true },
  gender: { type: String, enum: ["Male", "Female", "Other"], required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  courseApplied: { type: String, required: true },
  admissionYear: { type: Number, required: true },
  college: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
});

// Auto-generate studentId before saving
studentSchema.pre("save", async function (next) {
  if (!this.studentId) {
    try {
      const counter = await Counter.findOneAndUpdate(
        { name: "studentId" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );

      this.studentId = "STU" + counter.seq.toString().padStart(4, "0");
      // Example: STU0001
    } catch (err) {
      return next(err);
    }
  }
  next();
});

module.exports = mongoose.model("Student", studentSchema);
