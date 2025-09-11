const Student = require("../model/student.model");
const User = require("../model/user.model");
const Settings = require("../model/setting.model");

exports.addStudent = async (req, res) => {
  try {
    const {
      studentName,
      dob,
      gender,
      phone,
      email,
      city,
      state,
      courseApplied,
      admissionYear,
      college,
    } = req.body;

    // ---------------- VALIDATION ---------------- //

    if (
      !studentName ||
      !dob ||
      !gender ||
      !phone ||
      !email ||
      !city ||
      !state ||
      !courseApplied ||
      !admissionYear ||
      !college
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const nameRegex = /^[A-Za-z\s]+$/;
    if (!nameRegex.test(studentName))
      return res
        .status(400)
        .json({ message: "Student name must contain only letters" });
    if (!nameRegex.test(city))
      return res
        .status(400)
        .json({ message: "City must contain only letters" });
    if (!nameRegex.test(state))
      return res
        .status(400)
        .json({ message: "State must contain only letters" });
    if (!nameRegex.test(college))
      return res
        .status(400)
        .json({ message: "College name must contain only letters" });

    if (!/^\d{10}$/.test(phone))
      return res
        .status(400)
        .json({ message: "Phone number must be exactly 10 digits" });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return res.status(400).json({ message: "Invalid email format" });

    const dobDate = new Date(dob);
    const nowDate = new Date();
    if (dobDate > nowDate)
      return res
        .status(400)
        .json({ message: "Date of birth cannot be in the future" });

    const allowedGenders = ["Male", "Female", "Other"];
    if (!allowedGenders.includes(gender))
      return res.status(400).json({ message: "Invalid gender value" });

    if (!/^\d{4}$/.test(admissionYear))
      return res
        .status(400)
        .json({ message: "Admission year must be a valid 4-digit year" });

    const admissionYearNum = parseInt(admissionYear);
    const currentYear = nowDate.getFullYear();
    if (admissionYearNum < 1900 || admissionYearNum > currentYear)
      return res.status(400).json({
        message: "Admission year must be between 1900 and current year",
      });

    // -------------------------------------------------- //

    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const settings = (await Settings.findOne()) || {
      rewardPerStudent: 2,
      cooldownSeconds: 45,
      maxStudentsBeforeBlock: 100,
      blockDurationMinutes: 45,
    };

    const now = new Date();

    // ❌ Block check
    if (user.blockUntil && now < user.blockUntil) {
      return res.status(403).json({
        message: `You are blocked until ${user.blockUntil}`,
        blockedUntil: user.blockUntil,
      });
    }

    // ⏳ Cooldown check
    if (
      user.lastStudentAddedAt &&
      now - user.lastStudentAddedAt < settings.cooldownSeconds * 1000
    ) {
      const remaining =
        settings.cooldownSeconds -
        Math.floor((now - user.lastStudentAddedAt) / 1000);

      return res.status(429).json({
        message: `Please wait ${remaining} seconds before adding another student`,
        remainingTime: remaining,
      });
    }

    // ✅ Student Save
    const student = new Student({
      studentName,
      dob: dobDate,
      gender,
      phone,
      email,
      city,
      state,
      courseApplied,
      admissionYear: admissionYearNum,
      college,
      createdBy: user._id,
    });

    await student.save();

    // 🎯 Reward + counter update
    user.reward += settings.rewardPerStudent;
    user.lastStudentAddedAt = now;
    user.studentCount += 1;

    // 🔒 Har N students par block lagao
    if (
      user.studentCount > 0 &&
      user.studentCount % settings.maxStudentsBeforeBlock === 0
    ) {
      const blockDurationMs = settings.blockDurationMinutes * 60 * 1000;
      user.blockUntil = new Date(now.getTime() + blockDurationMs);
    }

    await user.save();

    return res.json({
      message: "Student added successfully",
      student,
      reward: user.reward,
      studentCount: user.studentCount,
      blockedUntil: user.blockUntil || null,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};
