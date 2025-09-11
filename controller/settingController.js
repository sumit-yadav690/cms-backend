const Settings = require("../model/setting.model");

// Get current settings
exports.getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    return res.json({ message: "Settings fetched", settings });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update settings (only admin)
exports.updateSettings = async (req, res) => {
  try {
    const {
      rewardPerStudent,
      cooldownSeconds,
      maxStudentsBeforeBlock,
      blockDurationMinutes,
    } = req.body;

    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }

    if (rewardPerStudent !== undefined)
      settings.rewardPerStudent = rewardPerStudent;
    if (cooldownSeconds !== undefined)
      settings.cooldownSeconds = cooldownSeconds;
    if (maxStudentsBeforeBlock !== undefined)
      settings.maxStudentsBeforeBlock = maxStudentsBeforeBlock;
    if (blockDurationMinutes !== undefined)
      settings.blockDurationMinutes = blockDurationMinutes;

    await settings.save();

    return res.json({ message: "Settings updated successfully", settings });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
