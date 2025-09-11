const Referral = require("../model/referral.model");
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

exports.shareReferral = async (req, res) => {
  try {
    const { friendName, friendEmail, friendPhone, referralCode } = req.body;

    // ✅ Required fields
    if (!friendName || !friendEmail || !friendPhone || !referralCode) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!/^[A-Za-z\s]+$/.test(friendName)) {
      return res.status(400).json({
        message: "Friend name must contain only letters and spaces",
      });
    }

    if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(friendEmail)) {
      return res.status(400).json({ message: "Invalid friend email format" });
    }

    if (!/^\d{10}$/.test(friendPhone)) {
      return res
        .status(400)
        .json({ message: "Friend phone must be exactly 10 digits" });
    }

    // ✅ Referral code should be alphanumeric (8-10 chars typical)
    if (!/^[A-Z0-9]{6,12}$/.test(referralCode)) {
      return res.status(400).json({
        message: "Invalid referral code format",
      });
    }

    // Referral code check
    const referrerUser = await User.findOne({ referralCode });
    if (!referrerUser) {
      return res.status(400).json({ message: "Invalid referral code" });
    }

    // Save referral
    const referral = new Referral({
      referrer: referrerUser._id,
      referralCode,
      friendName,
      friendEmail,
      friendPhone,
    });

    await referral.save();

    // ---------------- EMAIL NOTIFY ---------------- //

    const mailOptions = {
      from: `"Referral Bot" <ranjitkvns7@gmail.com>`,
      to: "admin@placify-connect.com",
      subject: "New Referral Submitted",
      html: `
        <h2>New Referral</h2>
        <p><strong>Referrer:</strong> ${referrerUser.name || "Unknown"} (${
        referrerUser.email
      })</p>
        <p><strong>Friend Name:</strong> ${friendName}</p>
        <p><strong>Friend Email:</strong> ${friendEmail}</p>
        <p><strong>Friend Phone:</strong> ${friendPhone}</p>
        <p><strong>Referral Code:</strong> ${referralCode}</p>
      `,
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error("❌ Email send error:", err.message);
      } else {
        console.log("📧 Referral notification sent to Admin:", info.response);
      }
    });

    return res.status(201).json({
      message: "Referral shared successfully & admin notified",
      referral,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};


// ✅ Get all referrals of a user by referralCode
exports.getUserReferrals = async (req, res) => {
  try {
    const { referralCode } = req.params;

    // Referral code validation
    if (!referralCode) {
      return res.status(400).json({ message: "Referral code is required" });
    }

    // Find user
    const user = await User.findOne({ referralCode });
    if (!user) {
      return res.status(404).json({ message: "User not found with this referral code" });
    }

    // Get referrals for this user
    const referrals = await Referral.find({ referrer: user._id });

    return res.status(200).json({
      message: "User referrals fetched successfully",
      totalReferrals: referrals.length,
      referrals, // list of referrals
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};
