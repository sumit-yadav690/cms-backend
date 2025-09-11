const express = require("express");
const router = express.Router();
const {
  requestWithdraw,
  getAllWithdrawRequests,
  updateWithdrawStatus,
} = require("../controller/withdrawController");

const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

router.post("/amount", verifyToken, requestWithdraw);
router.get("/all", getAllWithdrawRequests);
router.put("/:id/status", verifyToken, isAdmin, updateWithdrawStatus);

module.exports = router;
