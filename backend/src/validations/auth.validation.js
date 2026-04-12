const { body } = require("express-validator");

const referralCodeRule = body("referralCode")
  .optional()
  .trim()
  .isLength({ min: 4, max: 32 })
  .withMessage("referralCode must be between 4 and 32 characters")
  .matches(/^[A-Za-z0-9_-]+$/)
  .withMessage("referralCode must contain only letters, numbers, hyphens, or underscores");

const contactRules = [
  body("email")
    .optional()
    .isEmail()
    .withMessage("Email must be valid"),
  body("phoneNumber")
    .optional()
    .isMobilePhone("any")
    .withMessage("Phone number must be valid"),
  body().custom((value) => {
    if (!value.email && !value.phoneNumber) {
      throw new Error("Either email or phoneNumber is required");
    }

    if (value.email && value.phoneNumber) {
      throw new Error("Provide either email or phoneNumber, not both");
    }

    return true;
  }),
];

const requestOtpRules = [
  ...contactRules,
  body("name")
    .optional()
    .isString()
    .isLength({ min: 2, max: 60 })
    .withMessage("Name must be between 2 and 60 characters"),
  referralCodeRule,
];

const verifyOtpRules = [
  ...contactRules,
  body("otp")
    .trim()
    .isLength({ min: 4, max: 8 })
    .withMessage("OTP must be between 4 and 8 characters")
    .isNumeric()
    .withMessage("OTP must contain only numbers"),
  body("name")
    .optional()
    .isString()
    .isLength({ min: 2, max: 60 })
    .withMessage("Name must be between 2 and 60 characters"),
  referralCodeRule,
];

const requestSignupOtpRules = requestOtpRules;
const verifySignupOtpRules = verifyOtpRules;
const requestLoginOtpRules = contactRules;
const verifyLoginOtpRules = verifyOtpRules;

const googleLoginRules = [
  body("idToken")
    .trim()
    .notEmpty()
    .withMessage("Firebase idToken is required"),
  body("name")
    .optional()
    .isString()
    .isLength({ min: 2, max: 60 })
    .withMessage("Name must be between 2 and 60 characters"),
  referralCodeRule,
];

const phoneLoginRules = [
  body("idToken")
    .trim()
    .notEmpty()
    .withMessage("Firebase idToken is required"),
  body("mode")
    .trim()
    .isIn(["signup", "login"])
    .withMessage("mode must be either signup or login"),
  body("name")
    .optional()
    .isString()
    .isLength({ min: 2, max: 60 })
    .withMessage("Name must be between 2 and 60 characters"),
  referralCodeRule,
];

const refreshTokenRules = [
  body("refreshToken")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Refresh token cannot be empty"),
];

module.exports = {
  requestSignupOtpRules,
  verifySignupOtpRules,
  requestLoginOtpRules,
  verifyLoginOtpRules,
  googleLoginRules,
  phoneLoginRules,
  refreshTokenRules,
};
