const express = require("express");

const authController = require("../controllers/auth.controller");
const authenticate = require("../middlewares/auth.middleware");

const router = express.Router();

const validate = require("../middlewares/validate.middleware");
const {
  requestSignupOtpRules,
  verifySignupOtpRules,
  requestLoginOtpRules,
  verifyLoginOtpRules,
  googleLoginRules,
  refreshTokenRules,
} = require("../validations/auth.validation");

router.post(
  "/signup/request-otp",
  requestSignupOtpRules,
  validate,
  authController.requestSignupOtpController
);
router.post(
  "/signup/verify-otp",
  verifySignupOtpRules,
  validate,
  authController.verifySignupOtpController
);
router.post(
  "/login/request-otp",
  requestLoginOtpRules,
  validate,
  authController.requestLoginOtpController
);
router.post(
  "/login/verify-otp",
  verifyLoginOtpRules,
  validate,
  authController.verifyLoginOtpController
);
router.post("/google", googleLoginRules, validate, authController.googleLoginController);
router.post("/refresh", refreshTokenRules, validate, authController.refreshSessionController);
router.post("/logout", refreshTokenRules, validate, authController.logoutController);
router.get("/me", authenticate, authController.getAuthenticatedUser);

module.exports = router;
