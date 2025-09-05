const express = require("express");
const { loginUser } = require("../controller/UserController");
const { addStudent } = require("../controller/StudentController");
const { verifyToken } = require("../middleware/authMiddleware");
const userController = require("../controller/UserController");
const {
  getSettings,
  updateSettings,
} = require("../controller/settingController");

const router = express.Router();

router.post("/login", loginUser);
router.post("/addstudent", verifyToken, addStudent);

router.get("/getallusers", userController.getAllUsers);

router.get("/:id/reward", userController.getUserReward);

router.get("/:id/students", userController.getUserStudents);

router.get("/:id/details", userController.getUserDetails);

router.get("/settings", getSettings);
router.put("/updatesetting", updateSettings);

module.exports = router;
