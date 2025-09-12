const jwt = require("jsonwebtoken");
const User = require("../model/user.model");
const Student = require("../model/student.model");
const Referral = require("../model/referral.model");
const moment = require("moment");
// Direct Login Controller

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

exports.loginUser = async (req, res) => {
  try {
    // --- Normalize ---
    const email = String(req.body.email || "").trim().toLowerCase();
    const phoneDigits = String(req.body.phone || "").trim().replace(/\D/g, "");

    // --- Validations ---
    if (!email || !phoneDigits) {
      return res.status(400).json({ message: "Email and phone are required" });
    }
    if (!/^\d{10}$/.test(phoneDigits)) {
      return res.status(400).json({ message: "Phone number must be exactly 10 digits" });
    }

    // (Optional) policy
    const emailPolicy = /^[a-z]+@placify-connect\.com$/;
    if (!emailPolicy.test(email)) {
      return res.status(400).json({
        message: "Email must only contain letters and end with @placify-connect.com",
      });
    }

    // --- Try to find existing user ---
    let user = await User.findOne({ email, phone: phoneDigits }).collation({ locale: "en", strength: 2 });

    // --- Not found? Create new user ---
    if (!user) {
      const referralCode = Math.random()
        .toString(36)
        .substring(2, 10)
        .toUpperCase();

      user = new User({
        email,
        phone: phoneDigits,
        referralCode,
        role: "user", // client se role MAT lo
      });

      await user.save(); // defaults + validators apply
    }

    // --- JWT secret check (prevent silent crash) ---
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "JWT_SECRET is missing in environment" });
    }

    // --- Issue token ---
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      message: !user.createdAt || (user.createdAt && user.updatedAt && user.createdAt.getTime() === user.updatedAt.getTime())
        ? "Signup & login successful"
        : "Login successful",
      user,
      token,
    });
  } catch (error) {
    // Duplicate email (unique index) edge case
    if (error && error.code === 11000) {
      return res.status(409).json({
        message: "Account with this email already exists. Use the registered phone number to log in.",
      });
    }
    console.error("loginOrRegister error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-__v"); // __v hide kar diya
    res.json({ message: "All users fetched", users });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getUserReward = async (req, res) => {
  try {
    const { id } = req.params; // userId from URL
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      message: "Reward fetched successfully",
      userId: user._id,
      reward: user.reward,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getUserStudents = async (req, res) => {
  try {
    const { id } = req.params; // userId from URL
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const students = await Student.find({ createdBy: id }).select("-__v");

    res.json({
      message: "Students fetched successfully",
      userId: id,
      students,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getUserDetails = async (req, res) => {
  try {
    const userId = req.params.id;

    // user details
    const user = await User.findById(userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    // students created by user
    const students = await Student.find({ createdBy: userId });

    // students added today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const todayStudents = await Student.find({
      createdBy: userId,
      createdAt: { $gte: today, $lt: tomorrow },
    });

    // referrals made by user
    const referrals = await Referral.find({ referrer: userId });

    // total reward
    const totalReward = user.reward || 0;

    return res.json({
      message: "User details fetched successfully",
      user,
      totalStudents: students.length,
      todayStudents: todayStudents.length,
      totalReferrals: referrals.length,
      totalReward,
      students,
      referrals,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};
