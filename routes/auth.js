const express = require("express");
const router = express.Router();

const authController = require("../controllers/AuthController");
const userMiddleware = require("../middlewares/userMiddleware");

router.post("/register", authController.register);
router.post("/login", authController.loginUser);
router.post("/verify-otp", authController.verifyOtp);
router.post("/logout", userMiddleware.verifyToken, authController.logoutUser);
router.post("/refresh", authController.requestRefreshToken);

module.exports = router;
