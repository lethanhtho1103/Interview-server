const express = require("express");
const router = express.Router();

const authController = require("../controllers/AuthController");

router.post("/register", authController.register);
router.post("/login", authController.loginUser);
router.post("/verify-otp", authController.verifyOtp);
router.post("/refresh", authController.requestRefreshToken);

module.exports = router;
