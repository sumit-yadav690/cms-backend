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

    // ✅ Required fields check
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

    // ✅ Name, City, State, College → only alphabets + spaces
    const nameRegex = /^[A-Za-z\s]+$/;
    if (!nameRegex.test(studentName)) {
      return res
        .status(400)
        .json({ message: "Student name must contain only letters" });
    }
    if (!nameRegex.test(city)) {
      return res
        .status(400)
        .json({ message: "City must contain only letters" });
    }
    if (!nameRegex.test(state)) {
      return res
        .status(400)
        .json({ message: "State must contain only letters" });
    }
    if (!nameRegex.test(college)) {
      return res
        .status(400)
        .json({ message: "College name must contain only letters" });
    }

    // ✅ Phone number (10 digits only)
    if (!/^\d{10}$/.test(phone)) {
      return res
        .status(400)
        .json({ message: "Phone number must be exactly 10 digits" });
    }

    // ✅ Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // ✅ DOB must not be in future
    const dobDate = new Date(dob);
    const nowDate = new Date();
    if (dobDate > nowDate) {
      return res
        .status(400)
        .json({ message: "Date of birth cannot be in the future" });
    }

    // ✅ Gender validation
    const allowedGenders = ["Male", "Female", "Other"];
    if (!allowedGenders.includes(gender)) {
      return res.status(400).json({ message: "Invalid gender value" });
    }

    // ✅ Admission year numeric aur valid hona chahiye
    if (!/^\d{4}$/.test(admissionYear)) {
      return res
        .status(400)
        .json({ message: "Admission year must be a valid 4-digit year" });
    }
    const admissionYearNum = parseInt(admissionYear);
    const currentYear = nowDate.getFullYear();
    if (admissionYearNum < 1900 || admissionYearNum > currentYear) {
      return res
        .status(400)
        .json({
          message: "Admission year must be between 1900 and current year",
        });
    }

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

    // Block check
    if (user.blockUntil && now < user.blockUntil) {
      return res.status(403).json({
        message: "You are blocked until " + user.blockUntil,
      });
    }

    // Cooldown check
    if (
      user.lastStudentAddedAt &&
      now - user.lastStudentAddedAt < settings.cooldownSeconds * 1000
    ) {
      return res.status(429).json({
        message: `Please wait ${settings.cooldownSeconds} seconds before adding another student`,
      });
    }

    // Max students check
    if (user.studentCount >= settings.maxStudentsBeforeBlock) {
      user.blockUntil = new Date(
        now.getTime() + settings.blockDurationMinutes * 60 * 1000
      );
      user.studentCount = 0;
      await user.save();
      return res.status(403).json({
        message: `You have reached ${settings.maxStudentsBeforeBlock} students. Wait ${settings.blockDurationMinutes} minutes.`,
      });
    }

    // Save student
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

    // Update reward and counters
    user.reward += settings.rewardPerStudent;
    user.lastStudentAddedAt = now;
    user.studentCount += 1;
    await user.save();

    return res.json({
      message: "Student added successfully",
      student,
      reward: user.reward,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};
