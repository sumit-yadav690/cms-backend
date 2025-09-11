const Withdraw = require("../model/withdraw.model");
const User = require("../model/user.model");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  secure: true,
  auth: {
    user: "ranjitkvns7@gmail.com",
    pass: "rqezkbtfbfmdrwfn",
  },
});

// 📌 Request Withdraw
exports.requestWithdraw = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, upiId, amount } = req.body;

    // ---------------- VALIDATION ---------------- //

    // ✅ All required
    if (!name || !upiId || !amount) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // ✅ Name → only alphabets + spaces
    if (!/^[A-Za-z\s]+$/.test(name)) {
      return res
        .status(400)
        .json({ message: "Name must contain only letters" });
    }

    // ✅ UPI ID → format like "example@upi"
    if (!/^[\w.-]+@[\w.-]+$/.test(upiId)) {
      return res.status(400).json({ message: "Invalid UPI ID format" });
    }

    // ✅ Amount → must be number & positive
    if (isNaN(amount) || amount <= 0) {
      return res
        .status(400)
        .json({ message: "Amount must be a positive number" });
    }

    // ✅ Minimum withdraw
    if (amount < 100) {
      return res
        .status(400)
        .json({ message: "Minimum withdraw amount is ₹100" });
    }

    // ✅ User exists
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // ✅ Reward balance check
    if (amount > user.reward) {
      return res.status(400).json({ message: "Insufficient reward balance" });
    }

    // ---------------- SAVE REQUEST ---------------- //
    const withdraw = new Withdraw({
      user: userId,
      name,
      upiId,
      amount,
    });
    await withdraw.save();

    // Deduct reward
    user.reward -= amount;
    await user.save();

    // Notify Admin
    const mailOptions = {
      from: `"Withdraw Bot" <ranjitkvns7@gmail.com>`,
      to: "admin@placifyconnect.com",
      subject: "New Withdraw Request Submitted",
      html: `
        <h2>New Withdraw Request</h2>
        <p><strong>User:</strong> ${user.email} (${user.phone || "N/A"})</p>
        <p><strong>Amount:</strong> ₹${amount}</p>
        <p><strong>UPI ID:</strong> ${upiId}</p>
        <p><strong>Name:</strong> ${name}</p>
        <p>Login to the admin panel to approve or reject this request.</p>
      `,
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error("❌ Email send error:", err);
      } else {
        console.log("📧 Email sent:", info.response);
      }
    });

    return res.json({
      message: "Withdraw request submitted successfully. Admin notified!",
      withdraw,
      remainingBalance: user.reward,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

// 📌 Get All Withdraw Requests
exports.getAllWithdrawRequests = async (req, res) => {
  try {
    const requests = await Withdraw.find().populate("user", "email phone role");
    return res.json({ requests });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

// 📌 Update Withdraw Request Status (Admin Only)
exports.updateWithdrawStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // ✅ Status validation
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const request = await Withdraw.findById(id);
    if (!request) {
      return res.status(404).json({ message: "Withdraw request not found" });
    }

    request.status = status;
    await request.save();

    return res.json({ message: `Withdraw ${status} successfully`, request });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};
