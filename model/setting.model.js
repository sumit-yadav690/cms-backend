const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    rewardPerStudent: { type: Number, default: 2 },
    cooldownSeconds: { type: Number, default: 45 },
    maxStudentsBeforeBlock: { type: Number, default: 100 },
    blockDurationMinutes: { type: Number, default: 45 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Settings", settingsSchema);
