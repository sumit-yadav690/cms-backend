const express = require("express");
const router = express.Router();
const referralController = require("../controller/referralController");

// POST - Share Referral
router.post("/share", referralController.shareReferral);
router.get("/getAllreferral/:referralCode", referralController.getUserReferrals)

module.exports = router;
