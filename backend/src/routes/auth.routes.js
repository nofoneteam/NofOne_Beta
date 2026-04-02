const express = require("express");

const authController = require("../controllers/auth.controller");
const authenticate = require("../middlewares/auth.middleware");

const router = express.Router();

const validate = require("../middlewares/validate.middleware");
const {
  requestOtpRules,
  verifyOtpRules,
  googleLoginRules,
  refreshTokenRules,
} = require("../validations/auth.validation");

router.post("/request-otp", requestOtpRules, validate, authController.requestOtpController);
router.post("/verify-otp", verifyOtpRules, validate, authController.verifyOtpController);
router.post("/google", googleLoginRules, validate, authController.googleLoginController);
router.post("/refresh", refreshTokenRules, validate, authController.refreshSessionController);
router.post("/logout", refreshTokenRules, validate, authController.logoutController);
router.get("/me", authenticate, authController.getAuthenticatedUser);

module.exports = router;
