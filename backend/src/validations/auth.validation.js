const { body } = require("express-validator");

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
];

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
];

const refreshTokenRules = [
  body("refreshToken")
    .trim()
    .notEmpty()
    .withMessage("Refresh token is required"),
];

module.exports = {
  requestOtpRules,
  verifyOtpRules,
  googleLoginRules,
  refreshTokenRules,
};
