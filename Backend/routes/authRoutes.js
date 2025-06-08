const express = require("express");
const authController = require("../controllers/authController");
const router = express.Router();

router.post("/login", authController.login);
router.post("/verify", authController.protect, authController.verifyUser);
router.post("/forgotPassword", authController.forgotPassword);
router.post("/resetPassword/:token", authController.resetPassword);
router.get("/logout", authController.logout);
router.get("/current-user", authController.protect, authController.currentUser);
router.post("/register", authController.registerUser);
//router.post("/verify-email/:token", authController.verifyEmail);
//router.post("/send-verification-email", authController.sendVerificationEmail);
router.post("/send-email-otp", authController.sendEmailVerificationOTP);
router.post("/verify-email-otp", authController.verifyEmailOTP);
module.exports = router;