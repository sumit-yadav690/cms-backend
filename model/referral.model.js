const mongoose = require("mongoose");

const referralSchema = new mongoose.Schema({
  referrer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  }, // jisne referral bheja
  referralCode: { type: String, required: true },
  friendName: { type: String, required: true },
  friendEmail: { type: String, required: true },
  friendPhone: { type: String, required: true },
  status: { type: String, default: "Approved" }, // track karne ke liye
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Referral", referralSchema);
