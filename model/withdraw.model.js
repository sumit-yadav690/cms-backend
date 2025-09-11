const mongoose = require("mongoose");

const withdrawSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  }, // kisne withdraw request ki
  name: { type: String, required: true },
  upiId: { type: String, required: true },
  amount: { type: Number, required: true },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "approved",
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Withdraw", withdrawSchema);
