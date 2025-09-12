const Student = require("../model/student.model");
const User = require("../model/user.model");
const Settings = require("../model/setting.model");

const clampSeconds = (ms) => Math.max(0, Math.floor(ms / 1000));

exports.addStudent = async (req, res) => {
  try {
    const {
      studentName, dob, gender, phone, email,
      city, state, courseApplied, admissionYear, college,
    } = req.body;

    // ---------- BASIC VALIDATIONS (unchanged/short) ----------
    if (
      !studentName || !dob || !gender || !phone || !email ||
      !city || !state || !courseApplied || !admissionYear || !college
    ) return res.status(400).json({ message: "All fields are required" });

    const nameRegex = /^[A-Za-z\s]+$/;
    if (!nameRegex.test(studentName)) return res.status(400).json({ message: "Student name must contain only letters" });
    if (!nameRegex.test(city))        return res.status(400).json({ message: "City must contain only letters" });
    if (!nameRegex.test(state))       return res.status(400).json({ message: "State must contain only letters" });
    if (!nameRegex.test(college))     return res.status(400).json({ message: "College name must contain only letters" });
    if (!/^\d{10}$/.test(phone))      return res.status(400).json({ message: "Phone must be exactly 10 digits" });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))      return res.status(400).json({ message: "Invalid email format" });

    const dobDate = new Date(dob);
    const now = new Date();
    if (dobDate > now)                return res.status(400).json({ message: "DOB cannot be in the future" });

    const allowedGenders = ["Male", "Female", "Other"];
    if (!allowedGenders.includes(gender)) return res.status(400).json({ message: "Invalid gender value" });

    if (!/^\d{4}$/.test(admissionYear)) return res.status(400).json({ message: "Admission year must be 4 digits" });
    const currentYear = now.getFullYear();
    const admissionYearNum = parseInt(admissionYear, 10);
    if (admissionYearNum < 1900 || admissionYearNum > currentYear)
      return res.status(400).json({ message: "Admission year must be between 1900 and current year" });

    // ---------- USER & SETTINGS ----------
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const dbSettings = await Settings.findOne();
    const settings = {
      rewardPerStudent: Number(dbSettings?.rewardPerStudent ?? 2),
      cooldownSeconds: Number(dbSettings?.cooldownSeconds ?? 45),
      maxStudentsBeforeBlock: Number(dbSettings?.maxStudentsBeforeBlock ?? 100),   // dynamic threshold
      blockDurationMinutes: Number(dbSettings?.blockDurationMinutes ?? 45),        // dynamic duration
    };

    // ---------- AUTO-UNBLOCK if block expired ----------
    if (user.blockUntil && now >= new Date(user.blockUntil)) {
      user.blockUntil = null;
      await user.save(); // persist clear
    }

    // ---------- ACTIVE BLOCK? return 403 with remaining time ----------
    if (user.blockUntil) {
      const until = new Date(user.blockUntil);
      return res.status(403).json({
        message: `You are blocked until ${until.toISOString()}`,
        blockedUntil: until.toISOString(),
        remainingBlockSeconds: clampSeconds(until - now),
        studentCount: Number(user.studentCount ?? 0),
        threshold: settings.maxStudentsBeforeBlock,
      });
    }

    // ---------- COOLDOWN? return 429 with timing ----------
    if (user.lastStudentAddedAt) {
      const last = new Date(user.lastStudentAddedAt);
      const diffMs = now - last;
      const waitMs = settings.cooldownSeconds * 1000 - diffMs;
      if (waitMs > 0) {
        return res.status(429).json({
          message: `Please wait ${clampSeconds(waitMs)} seconds before adding another student`,
          remainingCooldownSeconds: clampSeconds(waitMs),
          nextEligibleAt: new Date(last.getTime() + settings.cooldownSeconds * 1000).toISOString(),
        });
      }
    }

    // ---------- SAVE STUDENT ----------
    const student = new Student({
      studentName,
      dob: dobDate,
      gender, phone, email, city, state,
      courseApplied,
      admissionYear: admissionYearNum,
      college,
      createdBy: user._id,
    });
    await student.save();

    // ---------- UPDATE COUNTERS ----------
    user.reward = Number(user.reward ?? 0) + settings.rewardPerStudent;
    user.studentCount = Number(user.studentCount ?? 0) + 1;
    user.lastStudentAddedAt = now;

    // ---------- COUNT-BASED BLOCK (allow-then-block) ----------
    let willBlock = false;
    let blockedUntilIso = null;
    let remainingBlockSeconds = 0;

    if (
      user.studentCount > 0 &&
      user.studentCount % settings.maxStudentsBeforeBlock === 0
    ) {
      const blockMs = settings.blockDurationMinutes * 60 * 1000;
      const until = new Date(now.getTime() + blockMs);
      user.blockUntil = until;

      willBlock = true;
      blockedUntilIso = until.toISOString();
      remainingBlockSeconds = clampSeconds(blockMs);
    }

    await user.save();

    // ---------- SUCCESS RESPONSE (returns timing if just blocked) ----------
    return res.json({
      message: "Student added successfully",
      student,
      reward: Number(user.reward ?? 0),
      studentCount: Number(user.studentCount ?? 0), // never reset
      cooldownSeconds: settings.cooldownSeconds,
      nextEligibleAt: new Date(now.getTime() + settings.cooldownSeconds * 1000).toISOString(),

      // if threshold hit on this request:
      willBlock,
      blockedUntil: blockedUntilIso,                // ISO string or null
      remainingBlockSeconds,                        // seconds or 0

      // for UI/reference:
      threshold: settings.maxStudentsBeforeBlock,
      rewardPerStudent: settings.rewardPerStudent,
      blockDurationMinutes: settings.blockDurationMinutes,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};
